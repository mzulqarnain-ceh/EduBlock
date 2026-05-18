import sys
import os

sys.path.append(os.getcwd())
from app.database import SessionLocal
from app.models.user import User

def check_marty():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "martysyda@gmail.com").first()
        if user:
            print(f"User: {user.name}, Email: {user.email}")
            print(f"Direct University ID in Users table: {user.university_id}")
            print(f"Smartly Resolved University Name: {user.university_name}")
        else:
            print("Marty not found.")
    finally:
        db.close()

if __name__ == "__main__":
    check_marty()
