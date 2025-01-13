import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_socketio import SocketIO
from flask_cors import CORS
from redislite import Redis

db = SQLAlchemy()
login = LoginManager()
login.login_view = 'auth.login'
socketio = SocketIO()
redis_client = None

def create_app(config_class='config.Config'):
    # Flask アプリケーション初期化
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    login.init_app(app)
    sio_async_mode = app.config.get('SOCKET_IO_ASYNC_MODE', 'gevent')
    socketio.init_app(app, async_mode=sio_async_mode,  cors_allowed_origins='*')
    CORS(app)
    redis_url = app.config.get('REDIS_URL', None)

    global redis_client
    if redis_url:
        redis_client = Redis.from_url(redis_url)
    else:
        redis_client = Redis()

    with app.app_context():
        from .models import user, pre_survey, game_info, play_log
        db.create_all()

        from .views import index, home, auth, consent, survey, game
        app.register_blueprint(index.bp)
        app.register_blueprint(home.bp)
        app.register_blueprint(auth.bp)
        app.register_blueprint(consent.bp)
        app.register_blueprint(survey.bp)
        app.register_blueprint(game.bp)

        socketio.start_background_task(game.process_timer, app)

        app.jinja_env.filters['format_play_time'] = home.format_play_time

    return app

