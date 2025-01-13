from datetime import datetime
from .. import db
from .user import User

class GameInfo(db.Model):
    __tablename__ = 'game_info'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    start_time = db.Column(db.DateTime, nullable=False)
    start_time_unix = db.Column(db.Integer, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)
    end_time_unix = db.Column(db.Integer, nullable=True)
    play_time = db.Column(db.Integer, nullable=True)
    number_of_players = db.Column(db.Integer, nullable=False)
    turn_order = db.Column(db.Text, nullable=False)
    final_score = db.Column(db.Integer, nullable=False)
    final_turns = db.Column(db.Integer, nullable=False)
    final_hint_tokens = db.Column(db.Integer, nullable=False)
    final_miss_tokens = db.Column(db.Integer, nullable=False)
    max_hint_tokens = db.Column(db.Integer, nullable=False)
    max_miss_tokens = db.Column(db.Integer, nullable=False)
    turn_time_limit = db.Column(db.Integer, nullable=False)
    seed = db.Column(db.Integer, nullable=False)
    game_end_reason = db.Column(db.Text, nullable=False)
    deck = db.Column(db.Text, nullable=False)
