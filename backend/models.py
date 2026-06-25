from sqlalchemy import Column, Integer, String
from database import Base


class TaskDB(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    deadline = Column(String)
    estimated_hours = Column(Integer)
    priority = Column(String, default="medium")