from flask import Flask
from config import Config
from models.extensions import db

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

from models.user import User
from models.event import Event
from models.guest import Guest

@app.route("/")
def home():
    return "App Working"