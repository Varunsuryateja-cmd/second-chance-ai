from database import engine, SessionLocal
from models import TaskDB
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from schemas import Task
import os
from dotenv import load_dotenv
import google.generativeai as genai

app = FastAPI()

# Create database tables
TaskDB.metadata.create_all(bind=engine)

# Enable frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Load Gemini API Key
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")


# Home Route
@app.get("/")
def home():
    return {
        "message": "Second Chance AI Backend Running!"
    }


# Add Task
@app.post("/tasks")
def add_task(task: Task):
    db = SessionLocal()

    new_task = TaskDB(
        title=task.title,
        deadline=task.deadline,
        estimated_hours=task.estimated_hours
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    response = {
        "message": "Task Added Successfully",
        "task": {
            "id": new_task.id,
            "title": new_task.title,
            "deadline": new_task.deadline,
            "estimated_hours": new_task.estimated_hours
        }
    }

    db.close()
    return response


# View Tasks
@app.get("/tasks")
def get_tasks():
    db = SessionLocal()

    tasks = db.query(TaskDB).all()

    result = []

    for task in tasks:
        result.append({
            "id": task.id,
            "title": task.title,
            "deadline": task.deadline,
            "estimated_hours": task.estimated_hours
        })

    db.close()
    return result


# Check Risk
@app.get("/risk")
def get_risk():
    db = SessionLocal()
    tasks = db.query(TaskDB).all()

    result = []

    for task in tasks:
        hours = task.estimated_hours

        if hours <= 2:
            risk = "Low"
        elif hours <= 5:
            risk = "Medium"
        else:
            risk = "High"

        result.append({
            "title": task.title,
            "risk": risk
        })

    db.close()
    return result


# Generate AI Plan
# Generate AI Plan
@app.get("/plan")
def get_plan():
    db = SessionLocal()
    tasks = db.query(TaskDB).all()

    task_text = ""
    for task in tasks:
        task_text += (
            f"Title: {task.title}, "
            f"Deadline: {task.deadline}, "
            f"Estimated Hours: {task.estimated_hours}\n"
        )

    prompt = f"""
    You are an AI productivity assistant.

    These are the user's tasks:

    {task_text}

    Generate:
    1. Priority order of tasks
    2. Study schedule with time blocks
    3. Short breaks
    4. One recommendation

    Use ONLY these tasks.
    Do NOT create example tasks.
    Do NOT ask for more information.
    """

    response = model.generate_content(prompt)

    db.close()
    return {
        "plan": response.text
    }



# Dashboard
@app.get("/dashboard")
def dashboard():
    db = SessionLocal()
    tasks = db.query(TaskDB).all()

    high = 0
    medium = 0
    low = 0

    for task in tasks:
        hours = task.estimated_hours

        if hours >= 5:
            high += 1
        elif hours >= 3:
            medium += 1
        else:
            low += 1

    db.close()

    return {
        "total_tasks": len(tasks),
        "high_priority": high,
        "medium_priority": medium,
        "low_priority": low
    }
@app.get("/score")
def get_score():
    db = SessionLocal()
    tasks = db.query(TaskDB).all()

    total = len(tasks)

    if total == 0:
        db.close()
        return {
            "score": 100,
            "total_tasks": 0,
            "high_workload_tasks": 0,
            "message": "No pending tasks"
        }

    high = 0

    for task in tasks:
        if task.estimated_hours >= 5:
            high += 1

    score = max(20, 100 - (high * 15))

    db.close()

    return {
        "score": score,
        "total_tasks": total,
        "high_workload_tasks": high
    }
@app.get("/reminders")
def get_reminders():
    db = SessionLocal()
    tasks = db.query(TaskDB).all()

    reminders = []

    for task in tasks:
        if task.estimated_hours >= 5:
            reminders.append(
                f"⚠️ {task.title} needs {task.estimated_hours} hours. Start working on it today."
            )

    db.close()

    if not reminders:
        reminders.append("✅ No urgent tasks right now.")

    return reminders
goals_completed = 0
study_streak = 1
@app.get("/habit")
def get_habit():
    return {
        "streak": study_streak,
        "goals_completed": goals_completed
    }
@app.get("/smart-priority")
def smart_priority():
    db = SessionLocal()
    tasks = db.query(TaskDB).all()

    result = []

    for task in tasks:
        if task.estimated_hours >= 5:
            priority = " High"
        elif task.estimated_hours >= 2:
            priority = " Medium"
        else:
            priority = " Low"

        result.append({
            "title": task.title,
            "priority": priority
        })

    db.close()
    return result
@app.get("/auto-plan")
def auto_plan():
    db = SessionLocal()
    tasks = db.query(TaskDB).all()

    tasks = sorted(
        tasks,
        key=lambda x: x.estimated_hours,
        reverse=True
    )

    hour = 18  # Start at 6 PM
    result = []

    for task in tasks:
        duration = min(task.estimated_hours, 2)

        start = f"{hour}:00"
        end = f"{hour + duration}:00"

        result.append(
            f"{start} - {end} → {task.title}"
        )

        hour += duration

        result.append(
            f"{hour}:00 - {hour}:15 → Break"
        )

    db.close()
    return result


