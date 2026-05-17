import requests

# 1. Register a new Admin
reg_url = "http://127.0.0.1:8000/api/auth/register"
reg_payload = {
    "name": "Debug Admin",
    "email": "debug_admin@test.com",
    "password": "password123",
    "role": "admin",
    "university_id": 5
}

print("--- Registering Admin ---")
reg_res = requests.post(reg_url, json=reg_payload)
print(f"Status: {reg_res.status_code}")
print(f"Response: {reg_res.json()}")

# 2. Try to login immediately (should be PENDING)
login_url = "http://127.0.0.1:8000/api/auth/login"
login_payload = {
    "email": "debug_admin@test.com",
    "password": "password123",
    "role": "admin"
}

print("\n--- Logging in (Expected PENDING) ---")
login_res = requests.post(login_url, json=login_payload)
print(f"Status: {login_res.status_code}")
print(f"Response: {login_res.json()}")
