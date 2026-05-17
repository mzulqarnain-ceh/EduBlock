from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.university import University
from app.models.user import User, UserRole
from app.models.degree import Degree
from app.models.audit_log import AuditLog
from app.models.transaction import Transaction # Import this!
from sqlalchemy import func

def test_delete(uni_id):
    db = SessionLocal()
    try:
        print(f"Testing deletion for University ID: {uni_id}")
        
        university = db.query(University).filter(University.id == uni_id).first()
        if not university:
            print("University not found")
            return

        # 1. Get associated users
        associated_users = db.query(User).filter(User.university_id == uni_id).all()
        admin_ids = [u.id for u in associated_users if u.role == UserRole.ADMIN or str(u.role).upper() == "ADMIN"]
        print(f"Found admins to delete: {admin_ids}")

        # 2. Detach degrees
        db.query(Degree).filter(
            (Degree.university_id == uni_id) | (Degree.issued_by.in_(admin_ids))
        ).update({"university_id": None, "issued_by": None}, synchronize_session=False)
        print("Degrees detached")

        # 3. Nullify audit log references
        if admin_ids:
            db.query(AuditLog).filter(AuditLog.user_id.in_(admin_ids)).update({"user_id": None}, synchronize_session=False)
            print("Audit logs nullified")

        # 4. Delete associated ADMIN users
        if admin_ids:
            db.query(User).filter(User.id.in_(admin_ids)).delete(synchronize_session=False)
            print("Admins deleted")

        # 5. Detach STUDENTS
        db.query(User).filter(
            User.university_id == uni_id, 
            User.role == UserRole.STUDENT
        ).update({"university_id": None}, synchronize_session=False)
        print("Students detached")

        # 6. Delete the University
        db.delete(university)
        print("Attempting to commit...")
        db.commit()
        print("Successfully deleted!")
        
    except Exception as e:
        db.rollback()
        print(f"Error during deletion: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_delete(9)
