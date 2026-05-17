
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
import sys
import os

sys.path.append(os.getcwd())
from app.config import get_settings
from app.models.degree import Degree
from app.models.user import User

def test_student_degrees(user_id):
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        print(f"User {user_id} not found")
        return

    print(f"Testing for User: {user.name} (ID: {user.id})")
    print(f"Email: {user.email}")
    print(f"RegNo: {user.registration_no}")
    
    user_email = user.email.lower() if user.email else ""
    user_name = user.name.lower() if user.name else ""
    user_reg = user.registration_no.lower() if user.registration_no else ""
    
    query = db.query(Degree).filter(
        (Degree.student_user_id == user.id) |
        (func.lower(Degree.student_id) == user_email) |
        (func.lower(Degree.registration_no) == user_reg) |
        (func.lower(Degree.student_name) == user_name)
    )
    
    degrees = query.all()
    print(f"Found {len(degrees)} degrees")
    for d in degrees:
        print(f"ID: {d.id}, StudentName: {d.student_name}, StudentID: {d.student_id}, Reg: {d.registration_no}, UserID: {d.student_user_id}")
        
    db.close()

if __name__ == "__main__":
    test_student_degrees(11)
