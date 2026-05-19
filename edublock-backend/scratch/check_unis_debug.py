from app.database import SessionLocal
from app.models.user import User
from app.models.university import University
from app.models.degree import Degree
from app.models.transaction import Transaction
from app.models.audit_log import AuditLog

db = SessionLocal()
try:
    print("--- Universities in DB ---")
    unis = db.query(University).all()
    for uni in unis:
        print(f"ID: {uni.id}, Name: {uni.name}")
finally:
    db.close()
