from flask import Blueprint, render_template

main = Blueprint("main", __name__)


# الصفحة الرئيسية للحملة
@main.route("/")
def landing():
    return render_template("landing.html")


# صفحة عربية
@main.route("/ar")
def arabic():
    return render_template("landing.html", lang="ar")


# صفحة انجليزية
@main.route("/en")
def english():
    return render_template("landing.html", lang="en")