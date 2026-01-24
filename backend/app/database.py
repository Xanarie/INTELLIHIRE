from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


DB_USER = "root"
DB_PASSWORD = "databaseserver"
DB_HOST = "localhost"
DB_NAME = "applicant_db"

# Connection URL
DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

# SQLAlchemy engine
engine = create_engine(DATABASE_URL, echo=True)  # echo=True for logging queries

# Session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency for routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
