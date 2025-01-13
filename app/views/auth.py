from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_user, logout_user, login_required, current_user
from ..models.user import User
from .. import db

bp = Blueprint('auth', __name__)

@bp.route('/login', methods = ['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('home.home'))

    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()

        if user and user.check_password(password):
            login_user(user, remember=request.form.get('remember'))
            return redirect(url_for('home.home'))
        else:
            flash('Invalid username or password', 'login-failed')
            return render_template('login.html'), 401

    return render_template('login.html')

@bp.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('auth.login'))

