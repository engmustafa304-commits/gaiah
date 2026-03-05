class Config:
    SECRET_KEY = "super-secret-key-123"

    SQLALCHEMY_DATABASE_URI = "postgresql://postgres:123456@localhost:5432/giyah"
    SQLALCHEMY_TRACK_MODIFICATIONS = False