from sqlalchemy import create_engine, text, func
from sqlalchemy.orm import Session
import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.user import User
from app.models.degree import Degree
from app.models.university import University # Add this

def test_list(user_id):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        print(f"Testing for User: {user.email} (ID: {user.id})")
        
        user_email = user.email.lower() if user.email else ""
        user_name = user.name.lower() if user.name else ""
        user_reg = user.registration_no.lower() if user.registration_no else ""

        query = db.query(Degree).filter(
            (Degree.student_user_id == user.id) |
            (func.lower(Degree.student_id) == user_email) |
            (func.lower(Degree.registration_no) == user_reg) |
            (func.lower(Degree.student_name) == user_name)
        )
        
        results = query.all()
        print(f"Found {len(results)} degrees")
        for d in results:
            print(f"Degree ID: {d.id}, Name: {d.student_name}, Status: {d.status}")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_list(11) # Test for the user who was issued the latest certificate
