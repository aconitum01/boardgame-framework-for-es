from .. import db
from .user import User

class GameSurvey(db.Model):
    __tablename__ = 'game_survey'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey('game_info.id'), nullable=False)
    
    question_id = db.Column(db.Text, nullable=False)
    answer_id = db.Column(db.Text, nullable=False)

