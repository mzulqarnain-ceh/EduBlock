import os
import sys
from sqlalchemy import func

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.degree import Degree

def link_existing_users():
    db = SessionLocal()
    try:
        print("[DIAGNOSTIC] Listing all student users:")
        all_users = db.query(User).all()
        for u in all_users:
            role_str = u.role.value if hasattr(u.role, 'value') else str(u.role)
            role_upper = role_str.upper().split('.')[-1]
            if role_upper == "STUDENT":
                print(f"Student: '{u.name}' | Reg: '{u.registration_no}' | Email: '{u.email}' | Uni ID: {u.university_id}")

        print("\n[DIAGNOSTIC] Listing all degree records in DB:")
        degrees = db.query(Degree).all()
        for d in degrees:
            print(f"Degree ID: {d.id} | Student: '{d.student_name}' | Reg: '{d.registration_no}' | Email: '{d.student_email}' | Uni ID: {d.university_id}")

    except Exception as e:
        print(f"[ERROR] Diagnostic failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    link_existing_users()
