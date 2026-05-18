import sys
import os

# Add current directory to python path
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import get_settings
from app.models.degree import Degree, DegreeStatus
from app.models.transaction import Transaction

def cleanup_duplicates(commit=False):
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        print("Fetching all degrees from the database...")
        # Order by created_at and id ascending to make sure we treat the oldest record as the "original" to keep.
        degrees = session.query(Degree).order_by(Degree.created_at.asc(), Degree.id.asc()).all()
        print(f"Total degrees found in DB: {len(degrees)}")

        seen = {}
        duplicates = []

        for deg in degrees:
            norm_student_id = deg.student_id.strip().lower() if deg.student_id else ""
            norm_reg_no = deg.registration_no.strip().lower() if deg.registration_no else ""
            norm_degree_name = deg.degree_name.strip().lower() if deg.degree_name else ""
            uni_id = deg.university_id

            # Key patterns to group degrees
            key_id = (norm_student_id, norm_degree_name, uni_id)
            key_reg = (norm_reg_no, norm_degree_name, uni_id) if norm_reg_no else None

            is_duplicate = False
            original = None

            # Check if we have already registered/seen this active degree
            if key_id in seen:
                is_duplicate = True
                original = seen[key_id]
            elif key_reg and key_reg in seen:
                is_duplicate = True
                original = seen[key_reg]
            else:
                # Store this as the first seen instance (the original to keep)
                seen[key_id] = deg
                if key_reg:
                    seen[key_reg] = deg

            if is_duplicate:
                duplicates.append((deg, original))

        print(f"\nFound {len(duplicates)} duplicate degree records!")

        if not duplicates:
            print("No duplicate degrees found. Database is clean!")
            return

        print("\n--- Duplicate Records Identified ---")
        for dup, orig in duplicates:
            print(f"Duplicate: ID {dup.id} | Student: {dup.student_name} ({dup.student_id}) | Degree: {dup.degree_name} | University ID: {dup.university_id} | Created: {dup.created_at}")
            print(f"  └─ Original to KEEP: ID {orig.id} | Created: {orig.created_at}\n")

        if not commit:
            print("=========================================================================")
            print("⚠️ DRY RUN MODE: No records were deleted.")
            print("To permanently delete these duplicates and clean up the database, run:")
            print("  python cleanup_duplicate_degrees.py --commit")
            print("=========================================================================")
            return

        print("\nPERFORMING CLEANUP (COMMITTING CHANGES)...")
        deleted_count = 0
        for dup, orig in duplicates:
            # 1. Delete associated transactions to prevent foreign key violations
            tx_deleted = session.query(Transaction).filter(Transaction.degree_id == dup.id).delete()
            # 2. Delete duplicate degree
            session.delete(dup)
            deleted_count += 1
            print(f"Deleted duplicate degree ID {dup.id} and {tx_deleted} related transactions.")

        session.commit()
        print(f"\n✅ SUCCESS: Successfully deleted {deleted_count} duplicate degree records from the database!")

    except Exception as e:
        session.rollback()
        print(f"\n❌ ERROR during cleanup: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    commit_mode = "--commit" in sys.argv
    cleanup_duplicates(commit=commit_mode)
