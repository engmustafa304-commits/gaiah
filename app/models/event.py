from app.extensions import db

class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    date = db.Column(db.String(50))
    location = db.Column(db.String(200))

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    guests = db.relationship("Guest", backref="event", lazy=True)