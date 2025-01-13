from flask import Blueprint, render_template, redirect, request, url_for
from flask_login import login_required, current_user
from .. import db

bp = Blueprint('consent', __name__)

@bp.route('/consent', methods=['GET', 'POST'])
@login_required
def consent():
    if request.method == 'POST':
        if 'agree' in request.form:
            current_user.consent = True
            db.session.commit()
        return redirect(url_for('home.home'))
    return render_template('consent.html')

