from .. import db
from .user import User

class PreSurvey(db.Model):
    __tablename__ = 'PreSurvey'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    question_id = db.Column(db.Text, nullable=False)
    answer_id = db.Column(db.Text, nullable=False)

