from flask import Flask, Blueprint, render_template, redirect, url_for
from flask_login import login_required, current_user
from .. import db
from ..models.user import User

bp = Blueprint('home', __name__)

@bp.route('/home', methods=['GET'])
@login_required
def home():
    total_play_time = db.session.execute(db.select(User.total_play_time).where(User.id==current_user.id)).scalar_one_or_none()
    if total_play_time:
        return render_template('home.html', total_play_time=total_play_time)
    else:
        return render_template('home.html', total_play_time=0)

def format_play_time(seconds):
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60

    if hours > 0:
        return f"{hours}時間{minutes}分{secs}秒"
    elif minutes > 0:
        return f"{minutes}分{secs}秒"
    else:
        return f"{secs}秒"

def register_filters(app: Flask):
    app.jinja_env.filters['format_play_time'] = format_play_time

