import os
import sys
import requests

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# 1. Trigger forgot password to get a new reset link
url_forgot = "http://127.0.0.1:8000/api/auth/forgot-password"
res_forgot = requests.post(url_forgot, json={"email": "martysyda@gmail.com"})
print("Forgot password request response:", res_forgot.status_code)

from app.database import SessionLocal
from app.models.user import User
from app.utils.security import create_access_token
from datetime import timedelta

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == "martysyda@gmail.com").first()
    token = create_access_token(data={"sub": str(user.id), "type": "reset"}, expires_delta=timedelta(minutes=60))
    print("Generated Token locally:", token)
    
    # 2. Call reset-password API
    url_reset = "http://127.0.0.1:8000/api/auth/reset-password"
    data_reset = {
        "token": token,
        "new_password": "2022ag7995"
    }
    
    res_reset = requests.post(url_reset, json=data_reset)
    print("Reset password API status code:", res_reset.status_code)
    print("Reset password API response JSON:", res_reset.json())
finally:
    db.close()
