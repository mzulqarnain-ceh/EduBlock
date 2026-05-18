import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.user import User
from app.models.university import University

db = SessionLocal()
try:
    print("=== UNIVERSITIES ===")
    unis = db.query(University).all()
    for u in unis:
        print(f"ID: {u.id}, Name: {u.name}, Email: {u.email}, Status: {u.status}")
        
    print("\n=== USERS WITH martysyda ===")
    users = db.query(User).filter(User.email.ilike("%martysyda%")).all()
    for u in users:
        print(f"ID: {u.id}, Name: {u.name}, Email: {u.email}, Role: {u.role}, UniID: {u.university_id}")
finally:
    db.close()
