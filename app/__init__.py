from flask import Flask
from .extensions import db

def create_app():
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static"
    )

    app.config.from_object("config.Config")

    db.init_app(app)

    from .routes.main import main
    app.register_blueprint(main)

    from .routes.auth import auth
    app.register_blueprint(auth)

    from .routes.event import event
    app.register_blueprint(event)

    return app