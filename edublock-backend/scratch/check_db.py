from app.database import SessionLocal
from app.models.user import User
from app.models.university import University
from app.models.degree import Degree
from app.models.audit_log import AuditLog

db = SessionLocal()
try:
    print("--- Users in Database ---")
    users = db.query(User).all()
    if not users:
        print("No users found!")
    for u in users:
        print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}, Status: {u.status}, RegNo: {u.registration_no}")
    
    print("\n--- Universities in Database ---")
    unis = db.query(University).all()
    if not unis:
        print("No universities found!")
    for uni in unis:
        print(f"ID: {uni.id}, Name: {uni.name}")
finally:
    db.close()
