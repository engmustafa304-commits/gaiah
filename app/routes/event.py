from flask import Blueprint, render_template

event = Blueprint("event", __name__)

@event.route("/event")
def event_page():
    return render_template("create.html")