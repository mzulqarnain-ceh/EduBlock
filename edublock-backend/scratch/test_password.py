from app.database import SessionLocal
from app.models.user import User
from app.utils.security import hash_password, verify_password

db = SessionLocal()
try:
    user = db.query(User).filter(User.role == "STUDENT").first()
    if user:
        print(f"Testing for student: {user.email}")
        
        # Test original password hash verification
        # Let's say user password was originally "Student123!"
        plain_pass = "Student123!"
        is_verified = verify_password(plain_pass, user.password_hash)
        print(f"Is original password '{plain_pass}' verified? {is_verified}")
        
        # Try hashing a new password
        new_pass = "Student1234!"
        new_hash = hash_password(new_pass)
        print(f"Hashed new password successfully: {new_hash}")
        
        # Verify new password
        is_new_verified = verify_password(new_pass, new_hash)
        print(f"Is new password verified? {is_new_verified}")
        
    else:
        print("No student user found in database.")
finally:
    db.close()
