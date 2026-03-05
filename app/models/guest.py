from app.extensions import db
from datetime import datetime

class Guest(db.Model):
    __tablename__ = "guests"

    id = db.Column(db.Integer, primary_key=True)

    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False)

    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    barcode = db.Column(db.String(120), unique=True, nullable=False)

    # حالة الدعوة
    invitation_status = db.Column(db.String(20), default="not_sent")
    # not_sent / sent / failed

    viewed = db.Column(db.Boolean, default=False)

    # رد الضيف
    status = db.Column(db.String(20), default="pending")
    # pending / confirmed / declined

    # تسجيل الدخول يوم المناسبة
    checked_in = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    responded_at = db.Column(db.DateTime, nullable=True)