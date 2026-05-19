import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User, UserRole, UserStatus
from app.utils.security import hash_password

def setup_superadmins():
    db = SessionLocal()
    try:
        print("=====================================================")
        print("  EduBlock Super Admin Account Setup Tool")
        print("=====================================================\n")

        # 1. Delete the fake superadmin 'superadmin@edublock.com'
        print("[PROCESS] Deleting fake superadmin 'superadmin@edublock.com'...")
        deleted_count = db.query(User).filter(
            User.email == 'superadmin@edublock.com'
        ).delete(synchronize_session=False)
        print(f"[SUCCESS] Deleted {deleted_count} account(s).")

        # 2. Check/Setup real superadmin 'edublocksupport@gmail.com'
        real_email = 'edublocksupport@gmail.com'
        print(f"[PROCESS] Creating/updating real superadmin '{real_email}'...")
        
        # Check if it already exists
        existing_real = db.query(User).filter(User.email == real_email).first()
        if existing_real:
            print(f"[INFO] Account '{real_email}' already exists. Resetting to SUPERADMIN role and password...")
            existing_real.role = UserRole.SUPERADMIN
            existing_real.password_hash = hash_password('test')
            existing_real.status = UserStatus.ACTIVE
            existing_real.name = "EduBlock Admin Support"
            db.add(existing_real)
        else:
            print(f"[INFO] Creating brand new SUPERADMIN account for '{real_email}'...")
            new_sa = User(
                name="EduBlock Admin Support",
                email=real_email,
                password_hash=hash_password('test'),
                role=UserRole.SUPERADMIN,
                status=UserStatus.ACTIVE
            )
            db.add(new_sa)

        # 3. Ensure 'super@admin.com' exists with password 'test'
        print("[PROCESS] Ensuring backup superadmin 'super@admin.com' exists...")
        backup_sa = db.query(User).filter(User.email == 'super@admin.com').first()
        if backup_sa:
            print("[INFO] Backup superadmin exists. Resetting password to 'test'...")
            backup_sa.role = UserRole.SUPERADMIN
            backup_sa.password_hash = hash_password('test')
            backup_sa.status = UserStatus.ACTIVE
            db.add(backup_sa)
        else:
            print("[INFO] Creating brand new backup SUPERADMIN account for 'super@admin.com'...")
            new_backup = User(
                name="Super Admin",
                email="super@admin.com",
                password_hash=hash_password('test'),
                role=UserRole.SUPERADMIN,
                status=UserStatus.ACTIVE
            )
            db.add(new_backup)

        db.commit()
        print("\n[SUCCESS] Super Admin accounts are fully setup and configured!")
        print(f"  1. Email: {real_email} | Password: test  (ACTIVE, REAL EMAIL)")
        print("  2. Email: super@admin.com | Password: test  (ACTIVE, BACKUP)")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Setup failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    setup_superadmins()
