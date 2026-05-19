import sys
import os
import argparse

sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.degree import Degree, DegreeStatus
from app.models.transaction import Transaction

def find_and_clean_duplicates(dry_run=True, force=False):
    db = SessionLocal()
    try:
        print("[INFO] Fetching degrees from database...")
        all_degrees = db.query(Degree).all()
        print(f"[INFO] Total degree records found: {len(all_degrees)}")

        # Group degrees by registration number
        groups = {}
        for deg in all_degrees:
            reg_no = (deg.registration_no or "").strip().lower()
            if not reg_no:
                # If there's no registration number, use student_id as fallback
                reg_no = (deg.student_id or "").strip().lower()
            
            if reg_no:
                if reg_no not in groups:
                    groups[reg_no] = []
                groups[reg_no].append(deg)

        # Filter out groups that have duplicates (more than 1 degree)
        duplicate_groups = {reg: degs for reg, degs in groups.items() if len(degs) > 1}

        if not duplicate_groups:
            print("[SUCCESS] No duplicate certificates found in the database!")
            return

        print(f"[ALERT] Found {len(duplicate_groups)} registration number(s) with duplicate certificates!\n")

        degrees_to_delete = []
        transactions_to_delete_count = 0

        for reg_no, degs in duplicate_groups.items():
            print(f"----------------------------------------------------------------------")
            print(f"Registration No: '{reg_no.upper()}' ({len(degs)} copies found)")
            print(f"----------------------------------------------------------------------")
            
            # Select the best record to keep
            # Rule 1: Prefer STATUS == ISSUED over PENDING/REVOKED
            # Rule 2: Prefer records with token_id and tx_hash
            # Rule 3: Tie breaker: Lowest ID (older record)
            sorted_degs = sorted(
                degs,
                key=lambda d: (
                    d.status == DegreeStatus.ISSUED,
                    d.token_id is not None,
                    d.tx_hash is not None,
                    -d.id  # Negative ID so lowest ID comes last in sorting
                ),
                reverse=True
            )

            to_keep = sorted_degs[0]
            to_remove = sorted_degs[1:]

            print(f"[KEEPING] ID: {to_keep.id} | Name: {to_keep.student_name} | Degree: {to_keep.degree_name} | Status: {to_keep.status} | Token ID: {to_keep.token_id}")
            if to_keep.tx_hash:
                print(f"   Tx Hash: {to_keep.tx_hash}")
            if to_keep.ipfs_hash:
                print(f"   IPFS Hash: {to_keep.ipfs_hash}")
            print(f"   Created: {to_keep.created_at}")

            for rem in to_remove:
                print(f"[DELETING] ID: {rem.id} | Name: {rem.student_name} | Degree: {rem.degree_name} | Status: {rem.status} | Token ID: {rem.token_id}")
                if rem.tx_hash:
                    print(f"   Tx Hash: {rem.tx_hash}")
                print(f"   Created: {rem.created_at}")
                degrees_to_delete.append(rem)
                
                # Check linked transactions
                tx_count = db.query(Transaction).filter(Transaction.degree_id == rem.id).count()
                transactions_to_delete_count += tx_count

        print(f"\n======================================================================")
        print(f"SUMMARY OF PLANNED CLEANUP:")
        print(f"   - Degree Records to Delete: {len(degrees_to_delete)}")
        print(f"   - Linked Transactions to Delete: {transactions_to_delete_count}")
        print(f"======================================================================")

        if dry_run:
            print("\n[INFO] This was a DRY RUN. No records were deleted.")
            print("[INFO] Run with '--commit' to commit deletions.")
            return

        # Confirm before action
        if not force:
            confirm = input("\n[WARNING] Are you absolutely sure you want to PERMANENTLY delete these duplicate records? (y/N): ")
            if confirm.strip().lower() != 'y':
                print("[CANCELLED] Cleanup cancelled by user. No database changes were made.")
                return

        # Perform cleanup
        print("\n[CLEANUP] Executing cleanup...")
        for deg in degrees_to_delete:
            # Delete associated transactions first (foreign key constraint)
            db.query(Transaction).filter(Transaction.degree_id == deg.id).delete(synchronize_session=False)
            # Delete the degree itself
            db.delete(deg)

        db.commit()
        print(f"[SUCCESS] Deleted {len(degrees_to_delete)} duplicate degree(s) and their associated transactions.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during database cleanup: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean duplicate degrees with same registration number in EduBlock.")
    parser.add_argument("--commit", action="store_true", help="Actually commit the deletions to the database.")
    parser.add_argument("--force", action="store_true", help="Skip the interactive safety prompt (useful for automation).")
    args = parser.parse_args()

    # Dry run unless --commit is explicitly passed
    is_dry_run = not args.commit
    
    print("======================================================================")
    print("  EduBlock Production Duplicate Degree Cleanup Utility")
    print("======================================================================\n")
    
    find_and_clean_duplicates(dry_run=is_dry_run, force=args.force)
