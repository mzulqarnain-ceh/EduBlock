import sys
import os
from fastapi import HTTPException

# Add current directory to python path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.degree import Degree
from app.models.user import User, UserRole
from app.schemas.degree import DegreeIssue, DegreeBulkIssue, DegreeBulkDelete
from app.routers.degrees import issue_degree, bulk_issue_degrees, bulk_delete_degrees

from app.models.transaction import Transaction

def run_test():
    db = SessionLocal()
    try:
        # Find an admin to use for the request
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not admin:
            print("No admin user found in DB to run tests. Skipping.")
            return
            
        print(f"Using Admin: {admin.email} (Uni ID: {admin.university_id})")
        
        # Test degree data (using a randomized student ID to make it clean)
        import random
        rand_suffix = random.randint(1000, 9999)
        test_student_id = f"test_student_{rand_suffix}@example.com"
        test_reg_no = f"REG-{rand_suffix}"
        
        degree_req = DegreeIssue(
            student_name="Test Student Duplicate Prevention",
            student_id=test_student_id,
            registration_no=test_reg_no,
            degree_name="BS Cyber Security",
            grade="3.8",
            issue_date="2025-05-18"
        )
        
        print("\n--- Testing Single Degree Issuance ---")
        # 1. First issuance should succeed
        print("Issuing first certificate...")
        deg1 = issue_degree(request=degree_req, db=db, current_user=admin)
        print(f"Success! Certificate ID: {deg1.id}, Hash: {deg1.blockchain_hash[:15]}")
        
        # 2. Second issuance of the exact same degree should fail
        print("Issuing second certificate (expecting duplicate error)...")
        try:
            issue_degree(request=degree_req, db=db, current_user=admin)
            print("❌ FAILURE: Second issuance succeeded when it should have been blocked!")
        except HTTPException as e:
            print(f"✅ SUCCESS: Blocked as expected with status {e.status_code}: {e.detail}")
            
        print("\n--- Testing Bulk Degree Issuance ---")
        # Let's create a bulk request with 1 duplicate row and 1 new row
        new_student_id = f"new_student_{rand_suffix}@example.com"
        new_reg_no = f"REG-NEW-{rand_suffix}"
        
        bulk_req = DegreeBulkIssue(
            degrees=[
                # Row 1: Duplicate of the one issued above
                DegreeIssue(
                    student_name="Test Student Duplicate Prevention",
                    student_id=test_student_id,
                    registration_no=test_reg_no,
                    degree_name="BS Cyber Security",
                    grade="3.8",
                    issue_date="2025-05-18"
                ),
                # Row 2: A new unique certificate
                DegreeIssue(
                    student_name="New Student",
                    student_id=new_student_id,
                    registration_no=new_reg_no,
                    degree_name="BS Cyber Security",
                    grade="3.9",
                    issue_date="2025-05-18"
                )
            ]
        )
        
        print("Sending bulk request with 1 duplicate and 1 unique certificate...")
        res = bulk_issue_degrees(request=bulk_req, db=db, current_user=admin)
        print(f"Bulk response: {res}")
        
        assert res["count"] == 1, "Should have successfully issued exactly 1 certificate"
        assert len(res["errors"]) == 1, "Should have exactly 1 error for the duplicate row"
        assert "Degree already issued against this record." in res["errors"][0], "Error message should mention duplicate"
        
        print("✅ SUCCESS: Bulk duplicates successfully identified and skipped while unique ones succeeded!")
        
        # Testing Bulk Deletion via Endpoint
        print("\n--- Testing Bulk Deletion ---")
        matching_degrees = db.query(Degree).filter(
            (Degree.student_id == test_student_id) | (Degree.student_id == new_student_id)
        ).all()
        degree_ids = [d.id for d in matching_degrees]
        
        if degree_ids:
            print(f"Calling bulk_delete_degrees for IDs: {degree_ids}...")
            delete_req = DegreeBulkDelete(degree_ids=degree_ids)
            del_res = bulk_delete_degrees(request=delete_req, db=db, current_user=admin)
            print(f"Bulk Delete response: {del_res}")
            
            assert del_res["deleted_count"] == len(degree_ids), "Should delete all matching degree IDs"
            
            # Verify they are gone
            check_degrees = db.query(Degree).filter(Degree.id.in_(degree_ids)).all()
            assert len(check_degrees) == 0, "All degrees should be permanently deleted from DB"
            print("✅ SUCCESS: Bulk deletion endpoint works perfectly!")
        else:
            print("❌ ERROR: No matching test degrees found to test bulk delete.")
        
    except Exception as e:
        print(f"❌ TEST ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
