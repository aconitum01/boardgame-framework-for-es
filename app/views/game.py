import random
import uuid
import json
from datetime import datetime, timedelta
from datetime import time as dtime
import time
import threading
import heapq
from flask import Blueprint, render_template, redirect, request, url_for, flash, current_app, session, jsonify
from flask_login import login_required, current_user
from flask_socketio import  disconnect
from .. import db, redis_client
from ..models.user import User
from ..models.game_info import GameInfo
from ..models.participant import Participant
from ..models.play_log import PlayLog
from ..models.game_survey import GameSurvey

from .. import socketio
from ..game.game_manager import Game
from ..game.agent.websocket_human_agent import WebsocketHumanAgent
from ..game.agent import available_ai_agents

bp = Blueprint('game', __name__)

with open('./hanabiapp/config/ai_assignment.json', 'r', encoding='utf-8') as f:
    ai_assignment_rule = json.load(f)

assignable_agents = [ available_ai_agents[agent_name] for agent_name in ai_assignment_rule.get('random_assignable_agents', [])]

def set_player_session(player_id, player_sid, room_id):
    redis_client.hset(f'player_id:{player_id}',mapping={'sid':player_sid, 'room_id':room_id})

def delete_player_session(player_id):
    redis_client.delete(f'player_id:{player_id}')

def get_player_session(player_id):
    player_session = redis_client.hgetall(f'player_id:{player_id}')
    if player_session:
        result = { key.decode(): value.decode() for key, value in player_session.items() }
        return result
    else:
        return None

def get_player_sid(player_id):
    sid = redis_client.hget(f'player_id:{player_id}', 'sid')
    if sid:
        return sid.decode()
    else:
        return None

def get_player_room_id(player_id):
    room_id = redis_client.hget(f'player_id:{player_id}', 'room_id')
    if room_id:
        return room_id.decode()
    else:
        return None

rooms = {}
rooms_lock = threading.Lock()

def set_room(room_id, room):
    global rooms
    with rooms_lock:
        rooms[room_id] = room

def delete_room(room_id):
    global rooms
    with rooms_lock:
        rooms.pop(room_id)
 
def get_room(room_id):
    global rooms
    result = rooms.get(room_id, None)
    return result

timer_queue = []
timer_lock = threading.Lock()

def set_timer(time, room):
    with timer_lock:
        heapq.heappush(timer_queue, (time, room))

def delete_timer(time, room):
    with timer_lock:
        try:
            timer_queue.remove((time, room))
            heapq.heapify(timer_queue)
        except ValueError:
            pass

def process_timer(app):
    global timer_queue
    while True:
        next_timeout = 0.1
        flag = False
        with timer_lock:
            if timer_queue:
                current_time = datetime.now()
                next_time, room = timer_queue[0]
                if next_time <= current_time:
                    flag = True
                    heapq.heappop(timer_queue)
                else:
                    next_timeout = (next_time - current_time).total_seconds()
        if flag:
            with app.app_context():
                room.auto_perform()
        socketio.sleep(next_timeout)

class Room:
    def __init__(self, max_player=2, npc_num=0):
        self.room_id = str(uuid.uuid4())
        self.game = None
        self.max_player = max_player
        self.npc_num = npc_num
        self.human_player_num = max_player - npc_num
        self.players = []
        self.time_limit = timedelta(seconds=50)
        self.timeout = datetime.now() + self.time_limit
        set_room(self.room_id, self)
        self.timeout_count = 0
        self.timeout_limit = 3
        self.game_id = 0
        self.game_end_flag = False

    def add_player(self, player_id, player_sid):
        if len(self.players) < self.human_player_num:
            self.players.append(player_id)
            set_player_session(player_id, player_sid, self.room_id)
            socketio.emit('room_id', f'{self.room_id}', to=player_sid)
            if len(self.players) >= self.human_player_num:
                self.start_game()
            return True
        return False

    def assign_ai(self):
        player_id = self.players[0]
        game_play_num = db.session.query(User.total_game_play_num).filter_by(id=player_id).scalar()
        if player_id % 2 == 1:
            return assignable_agents[game_play_num % 2]
        else:
            return assignable_agents[(game_play_num + 1) % 2]

#        if assignable_agents:
#            default_agent = random.choice(list(available_ai_agents.values()))
#        else:
#            default_agent = random.choice(assignable_agents)
#        if self.human_player_num > 1:
#            return default_agent
#        rules = ai_assignment_rule.get('assignment_rules')
#        player_game_count = db.session.query(Participant).filter_by(user_id=self.players[0]).count()
#        agent = None
#        if not rules:
#            return default_agent
#        for rule in rules:
#            if rule['count'] < 0:
#                agent = available_ai_agents.get(rule['agent_name'])
#                break
#            player_game_count -= rule['count']
#            if player_game_count < 0:
#                agent = available_ai_agents.get(rule['agent_name'])
#                break
#        if agent:
#            return agent
#        else:
#            return default_agent

    def is_full(self):
        return len(self.players) >= self.max_player

    def reconnect(self, player_id, player_sid):
        player_session = get_player_session(player_id)
        set_player_session(player_id, player_sid, self.room_id)
        socketio.emit('room_id', f'{self.room_id}', to=player_sid)
        self.hanabi_msg(player_id)
        if self.game_end_flag:
            socketio.emit('game_end', {'game_id': self.game_id} , to=player_sid)

    def auto_perform(self):
        self.timeout_count += 1
        if self.timeout_count >= self.timeout_limit:
            self.game_end('DISCONNECTED')
            return
        if self.game.is_npc():
            return
        self.game.random_perform()
        self.reset_timer()
        self.hanabi_msg_all()

        if self.game.check_game_end():
            self.game_end()
        else:
            self.turn_of_npc()

    def start_game(self):
        ai_agent = self.assign_ai()
        self.players += [ ((list(available_ai_agents.values()).index(ai_agent) + 1) * -1) for i in range(1, self.npc_num+1)]
        random.shuffle(self.players)
        player_agent_list = [ WebsocketHumanAgent(name=f'{player_id}', player_number=idx) if player_id >= 0 else ai_agent(name=f'{player_id}', player_number=idx) for idx, player_id in enumerate(self.players) ]
        self.game = Game(player_agent_list, int(self.time_limit.total_seconds()), seed=random.randrange(2**32), is_cui=False)
        self.reset_timer()
        self.hanabi_msg_all()
        self.turn_of_npc()

    def turn_of_npc(self):
        while self.game.is_npc():
            socketio.sleep(1)
            self.game.perform()
            self.reset_timer()
            self.hanabi_msg_all()
            if self.game.check_game_end():
                self.game_end()
                break
    
    def perform(self, player_id, action):
        self.timeout_count = 0
        if self.game.current_player == self.players.index(player_id):
            self.game.print_game_state()
            self.game.perform(action)
            self.reset_timer()
            self.hanabi_msg_all()

            if self.game.check_game_end():
                self.game_end()
            else:
                self.turn_of_npc()

    def hanabi_msg(self,player_id):
        if player_id < 0:
            return
        player_sid = get_player_sid(player_id)
        if player_sid:
            idx = self.players.index(player_id)
            msg = self.game.create_observation(idx)
            msg['gui_log_history'] = self.game.gui_log_history
            tmp = card_knowledge = self.game.get_card_knowledge()
            if idx != 0:
                msg['card_knowledge'] = tmp[idx:] + tmp[:idx]
            else:
                msg['card_knowledge'] = tmp
            msg['websocket_player_pid'] = self.players.index(player_id)

            # 相手AIの名前を送信
            ai_ids = [player_id for player_id in self.players if player_id < 0]
            # 相手AIが一人の場合のみの処理
            if ai_ids[0] == -1: # internal-state(単純AIの名前を指定)
                msg['ai_name'] = "alpha"
            elif ai_ids[0] == -2: # intentional(賢いAIの名前を指定)
                msg['ai_name'] = "beta"
            if self.game.current_player == self.players.index(player_id):
                msg['timeout'] = self.timeout.isoformat()
                msg['timeout_cnt'] = self.timeout_count
                socketio.emit('hanabimsg-my-turn', json.dumps(msg), to=player_sid)
            else:
                msg['timeout'] = None
                msg['timeout_cnt'] = None
                socketio.emit('hanabimsg-not-my-turn', json.dumps(msg), to=player_sid)

    def hanabi_msg_all(self):
        for idx, player_id in enumerate(self.players):
            self.hanabi_msg(player_id)

    def reset_timer(self):
        delete_timer(self.timeout, self)
        self.timeout = datetime.now() + self.time_limit
        set_timer(self.timeout, self)

    def check_timeout(self):
        return datetime.now() >= self.timeout
            
    def game_end(self, reason=None):
        # フラグがすでに立っていたらリターン
        # 二重game_endを防止
        if self.game_end_flag:
            return
        self.game_end_flag = True
        delete_timer(self.timeout, self)
        self.hanabi_msg_all()
        self.game.game_end()
        # game_infoのDB書き込み
        game_data = self.game.data_manager.get_game_data()
        if reason is None:
            reason = game_data['game_end_reason']

        game_info = GameInfo(
            start_time = game_data['game_start_time'],
            start_time_unix = game_data['game_start_unixtime'],
            end_time = game_data['game_end_time'],
            end_time_unix = game_data['game_end_unixtime'],
            play_time = game_data['one_game_time'],
            number_of_players = len(self.players),
            turn_order = game_data['turn_order'], 
            final_score = game_data['final_score'],
            final_turns = game_data['final_turns'],
            final_hint_tokens = self.game.hints, 
            final_miss_tokens = self.game.miss,
            max_hint_tokens = self.game.max_hints,
            max_miss_tokens = self.game.max_miss,
            turn_time_limit = game_data['turn_time_limit'],
            seed = self.game.seed,
            game_end_reason = reason,
            deck = game_data['deck']
        )
        db.session.add(game_info)
        db.session.commit()

        # 割り当てられたゲームIDを取得
        self.game_id = game_info.id

        # ゲーム終了をクライアントに通知
        for player_id in self.players:
            if player_id > 0:
                socketio.emit('game_end', {'game_id': self.game_id} , to= get_player_sid(player_id))

        # プレイログを書き込み
        logs = game_data.pop('turn_sequence', None)
        play_log = [PlayLog(
            game_id = self.game_id,
            turn = log['turn'],
            hints = log['hints'],
            miss = log['miss'],
            deck_size = log['deck_size'],
            discard_b = log['discard_b'],
            discard_g = log['discard_g'],
            discard_r = log['discard_r'],
            discard_w = log['discard_w'],
            discard_y = log['discard_y'],
            fireworks_b = log['fireworks_b'],
            fireworks_g = log['fireworks_g'],
            fireworks_r = log['fireworks_r'],
            fireworks_w = log['fireworks_w'],
            fireworks_y = log['fireworks_y'],
            hand_pid = log['hand_pid'], 
            hint_pid = log['hint_pid'],
            current_pid = log['current_pid'],
            turn_perform_unixtime = log['turn_perform_unixtime'],
            turn_perform_time = datetime.strptime(log['turn_perform_time'], '%Y-%m-%d %H:%M:%S'),
            think_time = log['think_time'], 
            action = json.dumps(log['action']),
            num_of_valid_actions = log['num_of_valid_actions'],
            score_per_turn = log['score_per_turn'],
            action_type = log['action_type'],
            timeout = log['is_time_limit']) for log in logs]
        db.session.add_all(play_log)
        db.session.commit()

        # participantテーブルの書き込み
        participant = [Participant(
            user_id = player_id,
            game_id = self.game_id) for player_id in self.players ]
        db.session.add_all(participant)
        db.session.commit()

        # total_play_timeとtotal_game_play_numの更新
        total_sec = int((game_data['game_end_time'] - game_data['game_start_time']).total_seconds())
        if reason == 'DISCONNECTED':
            total_sec = 0 # 切断扱い時は総プレイ時間にはカウントしない
        db.session.execute(db.update(User).where(User.id.in_(self.players)).values(total_play_time=User.total_play_time + total_sec, total_game_play_num=User.total_game_play_num+1))
        db.session.commit()

    def leave_player(self, player_id):
        if not self.game_end_flag:
            return

        if player_id in self.players:
            self.players.remove(player_id)
            delete_player_session(player_id)
            if len(self.players) <= self.npc_num:
                delete_room(self.room_id)

def is_time_in_range(start_time, end_time):
    now = datetime.now().time()
    return start_time < now < end_time

@bp.route('/game', methods=['GET', 'POST'])
@login_required
def game():
    player_session = get_player_session(current_user.id)
    if player_session:
        return render_template('game.html')

# 9:00-12:00, 13:30-17:00以外の新規ゲームコネクションを拒否
    if not(is_time_in_range(dtime(0,00), dtime(23,59)) or is_time_in_range(dtime(13,30), dtime(17,00))):
    # if not(is_time_in_range(dtime(9,00), dtime(12,00)) or is_time_in_range(dtime(13,30), dtime(17,00))):
        return redirect(url_for('game.game_connection_rejected'))

    not_answered_survey = db.session.query(Participant.game_id).join(
        GameInfo,
        Participant.game_id == GameInfo.id
    ).filter(
        Participant.user_id == current_user.id,
        ~db.exists().where(
            GameSurvey.game_id == Participant.game_id,
            GameSurvey.user_id == current_user.id
        ),
        GameInfo.game_end_reason != 'DISCONNECTED'
    ).order_by(Participant.game_id.asc()).first()
    if not_answered_survey:
        return redirect(url_for('survey.game_survey', game_id=not_answered_survey[0]))

    if current_user.consent and current_user.pre_survey:
        return render_template('game.html')
    else:
        if not current_user.consent:
            flash('実験への同意が必要が必要です', 'consent')
        if not current_user.pre_survey:
            flash('アンケートへの回答が必要です', 'pre_survey')
        return redirect(url_for('home.home'))

@bp.route('/game-connection-rejected')
def game_connection_rejected():
    return '新規ゲームコネクションの受付時間外です'

# socketioでログインを要求するデコレータ
def login_required_socket(f):
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            disconnect()
            return False
        else:
            return f(*args, **kwargs)
    return wrapper

# クライアント接続時にゲーム状態を送信
@socketio.on('connect')
@login_required_socket
def handle_connect():
    if not(current_user.consent and current_user.pre_survey):
        disconnect()
        return False 

    player_id = current_user.id
    player_sid = request.sid
    
    # 再接続処理
    room_id = get_player_room_id(player_id)
    if room_id:
        room = get_room(room_id)
        if room:
            room.reconnect(player_id, player_sid)
            return True
        
    # 部屋検索
    room = None
    for _room_id, _room in rooms.items():
        if not _room.is_full():
            room = _room

    # 部屋生成
    if room is None:
        room = Room(2, 1)
    room.add_player(player_id, player_sid)

# アクション受信時のイベント
@socketio.on('action')
def handle_action(data):
    if data.__sizeof__() > 600:
       disconnect()
       return
    data = json.loads(data)
    room_id = data['room_id']
    room = get_room(room_id)
    if room is not None:
        room.perform(current_user.id, data['action'])
    socketio.emit('finish_process', '{}')

# ゲーム終了時のボタンによるイベント
@socketio.on('game_end')
def handle_game_end(data):
    if data.__sizeof__() > 150:
        disconnect()
        return
    data = json.loads(data)
    room_id = data['room_id']
    room = get_room(room_id)
    if room is not None:
        room.leave_player(current_user.id)

