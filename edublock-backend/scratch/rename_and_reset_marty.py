import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.user import User
from app.utils.security import hash_password

db = SessionLocal()
try:
    marty = db.query(User).filter(User.id == 23).first()
    if marty:
        marty.email = "marty_temp_student@gmail.com"
        marty.password_hash = hash_password("Student123!")
        db.commit()
        print("Safely updated Marty (ID 23) email to 'marty_temp_student@gmail.com' and password to 'Student123!'")
    else:
        print("Marty (ID 23) not found!")
finally:
    db.close()
