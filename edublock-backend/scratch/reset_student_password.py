import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.user import User
from app.utils.security import hash_password

db = SessionLocal()
try:
    student = db.query(User).filter(User.email == "marty_temp_student@gmail.com").first()
    if student:
        student.password_hash = hash_password("Student123!")
        db.commit()
        print("Safely updated student marty's password to 'Student123!'")
    else:
        print("Student marty not found!")
finally:
    db.close()
