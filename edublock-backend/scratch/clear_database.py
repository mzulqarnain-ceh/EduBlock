import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User, UserRole

def clear_all_except_superadmins():
    db = SessionLocal()
    try:
        print("=====================================================")
        print("  EduBlock Complete Database Cleanup Tool")
        print("=====================================================\n")
        
        # Count superadmins first to make sure we don't accidentally wipe them
        superadmins = db.query(User).filter(
            User.role == UserRole.SUPERADMIN
        ).all()
        
        if not superadmins:
            print("[ERROR] No superadmin account detected in the database. Aborting cleanup to prevent complete lock-out!")
            return
            
        print(f"[INFO] Detected {len(superadmins)} Super Admin account(s) that will be preserved:")
        for sa in superadmins:
            print(f"   - ID: {sa.id} | Email: {sa.email} | Name: {sa.name}")

        confirm = input("\n[WARNING] This will permanently delete all Universities, Degrees, Transactions, Logs, Student accounts, and Institute Admin accounts. Enter 'WIPE' to confirm: ")
        
        if confirm.strip() != "WIPE":
            print("[CANCELLED] Database cleanup cancelled.")
            return

        print("\n[CLEANUP] Executing cleanup...")

        # 1. Delete transactions
        print("   - Deleting transactions...")
        db.execute(text("DELETE FROM transactions;"))

        # 2. Delete degrees
        print("   - Deleting degrees...")
        db.execute(text("DELETE FROM degrees;"))

        # 3. Delete audit logs
        print("   - Deleting audit logs...")
        db.execute(text("DELETE FROM audit_logs;"))

        # 4. Remove university links from all users temporarily to prevent FK errors
        print("   - Nullifying user university associations...")
        db.execute(text("UPDATE users SET university_id = NULL;"))

        # 5. Delete universities
        print("   - Deleting universities...")
        db.execute(text("DELETE FROM universities;"))

        # 6. Delete all users except superadmins
        print("   - Deleting non-superadmin user accounts...")
        db.execute(text("DELETE FROM users WHERE role != 'SUPERADMIN';"))

        db.commit()
        print("\n[SUCCESS] Database has been successfully cleared!")
        print("[SUCCESS] Only Super Admin accounts remain. Ready for a clean launch!")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Database cleanup failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_all_except_superadmins()
