import requests

# Try to login as Student with Admin's email
login_url = "http://127.0.0.1:8000/api/auth/login"
login_payload = {
    "email": "debug_admin@test.com",
    "password": "password123",
    "role": "student"  # Wrong role!
}

print("\n--- Logging in with Wrong Role (Expected 401) ---")
login_res = requests.post(login_url, json=login_payload)
print(f"Status: {login_res.status_code}")
print(f"Response: {login_res.json()}")
