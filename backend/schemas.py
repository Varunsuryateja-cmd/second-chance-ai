from pydantic import BaseModel

class Task(BaseModel):
    title: str
    deadline: str
    estimated_hours: int
    priority: str