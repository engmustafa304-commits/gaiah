from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required
from app.extensions import db, login_manager
from app.models.user import User

auth = Blueprint("auth", __name__)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@auth.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = request.form.get("name")
        email = request.form.get("email")
        password = request.form.get("password")

        if User.query.filter_by(email=email).first():
            flash("البريد مستخدم مسبقاً")
            return redirect(url_for("auth.register"))

        user = User(name=name, email=email)
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        return redirect(url_for("auth.login"))

    return render_template("register.html")


@auth.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(password):
            flash("بيانات الدخول غير صحيحة")
            return redirect(url_for("auth.login"))

        login_user(user)
        return redirect(url_for("main.dashboard"))

    return render_template("login.html")


@auth.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("auth.login"))