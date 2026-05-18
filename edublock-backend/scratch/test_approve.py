import sys
import os
from sqlalchemy.orm import Session
from sqlalchemy import create_engine

sys.path.append(os.getcwd())
from app.config import get_settings
from app.database import SessionLocal
from app.models.user import User
from app.models.degree import Degree
from app.routers.degrees import approve_pending_degree
from app.schemas.degree import DegreeApproveRequest

def test_approve():
    db = SessionLocal()
    try:
        # Fetch the pending degree ID 141
        degree = db.query(Degree).filter(Degree.id == 141).first()
        print(f"Degree to approve: ID {degree.id}, Student: {degree.student_name}, Reg: {degree.registration_no}, Degree: {degree.degree_name}")
        
        # Get admin user
        admin = db.query(User).filter(User.role == "ADMIN").first()
        print(f"Admin user: ID {admin.id}, Name: {admin.name}, UniversityID: {admin.university_id}")
        
        # Set degree's university id to match admin's university id if needed
        degree.university_id = admin.university_id
        db.commit()
        
        request_data = DegreeApproveRequest(
            grade="A",
            issue_date="2017-05-16"
        )
        
        print("\nCalling approve_pending_degree...")
        res = approve_pending_degree(
            degree_id=141,
            request=request_data,
            db=db,
            current_user=admin
        )
        print(f"Success! Approved degree ID: {res.id}, Hash: {res.blockchain_hash}")
        
    except Exception as e:
        import traceback
        print("\n--- ERROR DETECTED ---")
        print(f"Type: {type(e)}")
        print(f"Message: {e}")
        print(traceback.format_exc())
    finally:
        db.close()

if __name__ == "__main__":
    test_approve()
