import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.user import User
from app.utils.security import hash_password

db = SessionLocal()
try:
    # Find student Marty by registration number or ID
    student = db.query(User).filter(
        (User.registration_no == "2022-ag-7995") | (User.id == 23)
    ).first()
    
    if student:
        student.email = "martysyda@gmail.com"
        student.registration_no = "2022-ag-7995"
        student.password_hash = hash_password("2022ag7995")
        db.commit()
        print(f"✅ Safely restored Marty's account (ID {student.id})!")
        print(f"  Email: {student.email}")
        print(f"  Reg No: {student.registration_no}")
        print(f"  Password reset to: 2022ag7995")
    else:
        print("Marty's account not found!")
finally:
    db.close()
