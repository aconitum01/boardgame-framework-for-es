import os
import tempfile
from dotenv import load_dotenv
load_dotenv()


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev')  # デフォルトのシークレットキー
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///data.db')  # デフォルトのSQLite DB
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///prod_data.db')  # 本番環境用DB
    SOCKETIO_MESSAGE_QUEUE = os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0')  # 本番用 Redis URL

