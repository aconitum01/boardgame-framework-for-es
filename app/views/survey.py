import json
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from ..models.pre_survey import PreSurvey
from ..models.game_survey import GameSurvey
from ..models.game_info import GameInfo
from ..models.participant import Participant

from .. import db

bp = Blueprint('survey', __name__)

with open('./hanabiapp/config/pre_survey_default.json', 'r', encoding='utf-8') as f:
    pre_survey_json = json.load(f)

CONSENT_REQUIRED_MESSAGE = '実験への同意が必要です'
PRE_SURVEY_COMPLETED_MESSAGE = 'このアンケートは既に回答済みです'

def validate_survey_response(received_data, question, form_data):
    if question['type'] == 'text':
        question_id = question['id']
        question_value = form_data.get(question_id, None)
        trigger = question.get('trigger')
        if trigger:
            trigger_id = trigger['id']
            trigger_values = trigger['value']
            if trigger_id not in received_data or received_data[trigger_id] not in question['trigger']['value']:
                return False
        if question_value:
            received_data[question_id] = question_value
            return True
        else:
            return False

    valid_options = [ option['value'] for option in question['options'] ]
    question_id = question['id']
    question_value = form_data.get(question_id)
    if question_value is None:
        return True

    if question_value not in valid_options:
        return False

    trigger = question.get('trigger')
    if trigger:
        trigger_id = trigger['id']
        trigger_values = trigger['value']
        if trigger_id not in received_data or received_data[trigger_id] not in question['trigger']['value']:
            return False
    received_data[question_id] = question_value

    if 'custom' in question:
        custom = question.get('custom')
        if custom:
            custom_trigger = custom['trigger']
            custom_trigger_value = custom_trigger['value']
            if question_value in custom_trigger_value:
                custom_id = custom['id']
                custom_value = form_data.get(custom_id)
                if custom_value:
                    received_data[custom_id] = custom_value
                else:
                    return False
    return True

@bp.route('/pre_survey', methods=['GET', 'POST'])
@login_required
def pre_survey():
    if not current_user.consent:
        flash(CONSENT_REQUIRED_MESSAGE, 'consent')
        return redirect(url_for('home.home'))

    if current_user.pre_survey:
        flash(PRE_SURVEY_COMPLETED_MESSAGE, 'pre_survey_answerd')
        return redirect(url_for('home.home'))

    if request.method == 'POST':
        if current_user.pre_survey:
            return jsonify({'error': PRE_SURVEY_COMPLETED_MESSAGE}), 400

        received_data = {}
        for question in pre_survey_json['questions']:
            is_valid = validate_survey_response(received_data, question, request.form)
            if not is_valid:
                return jsonify({'error': '不正な回答です'}), 400
            
        for question, answer in received_data.items():
            presurvey = PreSurvey(
                user_id = current_user.id,
                question_id=question,
                answer_id=answer
            )
            db.session.add(presurvey)
        current_user.pre_survey = True
        db.session.commit()
    
        return redirect(url_for('home.home'))

    return render_template('survey.html', survey_name=pre_survey_json['name'], questions=pre_survey_json['questions'])


with open('./hanabiapp/config/game_survey_default.json', 'r', encoding='utf-8') as f:
    game_survey_json = json.load(f)

QUESTIONS = game_survey_json['questions']
if game_survey_json.get('milestone_questions', None):
    tmp = game_survey_json['milestone_questions']
    try:
        MILESTONES = tmp['milestones']
    except Exception as e:
        print(f'\'milestones\' is not found. : {e}')

    try:
        MILESTONE_QUESTIONS = tmp['questions']
    except Exception as e:
        print(f'\'questions\' is not found in \'milestone_questions\'. : {e}')

else:
    MILESTONES = None
    MILESTONE_QUESTIONS = None

@bp.route('/game_survey/<int:game_id>', methods=['GET', 'POST'])
@login_required
def game_survey(game_id):
    # アンケート回答回数を取得
    answered_survey_count = count_answered_survey(current_user.id) + 1
    questions = QUESTIONS

    # アンケート回答回数で分岐
    if MILESTONES and  answered_survey_count in MILESTONES:
        questions = questions + MILESTONE_QUESTIONS

    if request.method == 'POST':
        form_game_id = int(request.form.get('game_id'))
        if not(game_id or form_game_id == game_id):
            return jsonify({'error': '不正な回答です'}), 400

        # ユーザーが当該ゲーム参加者か確認
        valid_survey = db.session.query(
            db.exists().where(
                Participant.game_id == game_id,
                Participant.user_id == current_user.id
            )
        ).scalar()
        if not valid_survey:
            return jsonify({'error': '存在しないゲームIDです'}), 400

        # ユーザーが回答済みか確認
        answered_survey = db.session.query(
            db.exists().where(
                GameSurvey.game_id == game_id,
                GameSurvey.user_id == current_user.id
            )
        ).scalar()
        if answered_survey:
            return jsonify({'error': '回答済みです'})

        received_data = {}
        for question in questions:
            is_valid = validate_survey_response(received_data, question, request.form)
            if not is_valid:
                return jsonify({'error': '不正な回答です'}), 400
        
        for question, answer in received_data.items():
            game_survey = GameSurvey(
                user_id = current_user.id,
                game_id = game_id,
                question_id=question,
                answer_id=answer
            )
            db.session.add(game_survey)
        db.session.commit()
    
        return redirect(url_for('home.home'))

    not_answered_survey = db.session.query(Participant.game_id).join(
        GameInfo,
        Participant.game_id == GameInfo.id
    ).filter(
        Participant.user_id == current_user.id,
        Participant.game_id == game_id,
        ~db.exists().where(
            GameSurvey.game_id == Participant.game_id,
            GameSurvey.user_id == current_user.id
        ),
        GameInfo.game_end_reason != 'DISCONNECTED'
    ).first()
    if not not_answered_survey:
        return redirect(url_for('home.home'))

    return render_template('survey.html', game_id=game_id, survey_name=game_survey_json['name'], questions=questions)


def count_answered_survey(user_id):
    answered_survey_count = db.session.query(
        GameSurvey.game_id
    ).join(
        Participant,
        GameSurvey.game_id == Participant.game_id
    ).filter(
        Participant.user_id == user_id,
        GameSurvey.user_id == user_id
    ).group_by(
        GameSurvey.game_id
    ).count()    
    
    return answered_survey_count

