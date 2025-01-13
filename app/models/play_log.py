from datetime import datetime
from .. import db
from .user import User

class PlayLog(db.Model):
    __tablename__ = 'play_log'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    game_id = db.Column(db.Integer, db.ForeignKey('game_info.id'), nullable=False)
    turn = db.Column(db.Integer, nullable=False)
    hints = db.Column(db.Integer, nullable=False)
    miss = db.Column(db.Integer, nullable=False)
    deck_size = db.Column(db.Integer, nullable=False)
    discard_b = db.Column(db.Text, nullable=False)
    discard_g = db.Column(db.Text, nullable=False)
    discard_r = db.Column(db.Text, nullable=False)
    discard_w = db.Column(db.Text, nullable=False)
    discard_y = db.Column(db.Text, nullable=False)
    fireworks_b = db.Column(db.Integer, nullable=False)
    fireworks_g = db.Column(db.Integer, nullable=False)
    fireworks_r = db.Column(db.Integer, nullable=False)
    fireworks_w = db.Column(db.Integer, nullable=False)
    fireworks_y = db.Column(db.Integer, nullable=False)
    hand_pid = db.Column(db.Text, nullable=False)
    hint_pid = db.Column(db.Text, nullable=False)
    current_pid = db.Column(db.Integer, nullable=False)
    turn_perform_unixtime = db.Column(db.Integer, nullable=False)
    turn_perform_time = db.Column(db.DateTime, nullable=False)
    think_time = db.Column(db.Integer, nullable=False)
    action = db.Column(db.Text, nullable=False)
    num_of_valid_actions = db.Column(db.Integer, nullable=False)
    score_per_turn = db.Column(db.Integer, nullable=False)
    action_type = db.Column(db.Text, nullable=False)
    timeout = db.Column(db.Integer, nullable=False)

