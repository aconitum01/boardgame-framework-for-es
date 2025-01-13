from .. import db
from .user import User

class Participant(db.Model):
    __tablename__ = 'participant'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey('game_info.id'), nullable=False)

