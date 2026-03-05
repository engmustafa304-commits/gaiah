from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return "<h1>Gaiah Platform</h1><p>Smart Invitation Platform</p>"