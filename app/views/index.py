from flask import Blueprint, redirect, url_for
from flask_login import current_user

bp = Blueprint('index', __name__)

@bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('home.home'))
    return redirect(url_for('auth.login'))

