import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.user import User
from app.models.university import University

db = SessionLocal()
try:
    # 1. Rename any student with martysyda@gmail.com
    students = db.query(User).filter(User.email == "martysyda@gmail.com").all()
    for student in students:
        student.email = "marty_temp_student@gmail.com"
        print(f"Renamed student {student.name} ({student.id}) email to marty_temp_student@gmail.com")
        
    # 2. Rename any admin with martysyda@gmail.com
    admins = db.query(User).filter(User.email == "martysyda@gmail.com").all()
    for admin in admins:
        admin.email = "marty_temp_admin@gmail.com"
        print(f"Renamed admin {admin.name} ({admin.id}) email to marty_temp_admin@gmail.com")

    # 3. Rename any university with email martysyda@gmail.com
    unis = db.query(University).filter(University.email == "martysyda@gmail.com").all()
    for uni in unis:
        uni.email = "marty_temp_uni@gmail.com"
        print(f"Renamed university {uni.name} ({uni.id}) email to marty_temp_uni@gmail.com")
        
    db.commit()
    print("Database safely renamed and prepared for martysyda@gmail.com testing!")
finally:
    db.close()
