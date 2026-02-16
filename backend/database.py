import os
from sqlmodel import create_engine, SQLModel, Session

# Local SQLite persistence
SQLITE_FILE_NAME = "polytope_data.db"
SQLITE_URL = f"sqlite:///{SQLITE_FILE_NAME}"

# check_same_thread=False is needed for SQLite with FastAPI
engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

def create_db_and_tables():
    """Initializes the database schema."""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Dependency for database sessions."""
    with Session(engine) as session:
        yield session
