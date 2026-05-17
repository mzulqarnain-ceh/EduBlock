from app.database import SessionLocal
from app.models.user import User
from app.models.university import University
from app.models.degree import Degree
from app.models.transaction import Transaction
from app.models.audit_log import AuditLog
from app.utils.security import hash_password
import requests

# 1. Update password for zain@bltiwd.com
db = SessionLocal()
try:
    user = db.query(User).filter(User.email == "zain@bltiwd.com").first()
    if user:
        user.password_hash = hash_password("test123456")
        db.commit()
        print("Updated password for zain@bltiwd.com to 'test123456'")
    else:
        print("User zain@bltiwd.com not found")
finally:
    db.close()

# 2. Try to login
login_url = "http://127.0.0.1:8000/api/auth/login"
payload = {
    "email": "zain@bltiwd.com",
    "password": "test123456",
    "role": "admin"
}

print("\n--- Trying Login for zain@bltiwd.com ---")
res = requests.post(login_url, json=payload)
print(f"Status: {res.status_code}")
print(f"Response: {res.json()}")
