from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from .. import db, login

class User(UserMixin, db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(32), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    consent = db.Column(db.Boolean, default=False, nullable=False)
    pre_survey = db.Column(db.Boolean, default=False, nullable=False)
    total_play_time = db.Column(db.Integer, default=0, nullable=False)
    total_game_play_num = db.Column(db.Integer,default=0, nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

@login.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

