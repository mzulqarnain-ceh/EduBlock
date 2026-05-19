import requests

url = "http://127.0.0.1:8000/api/auth/register"
payload = {
    "name": "Admin User",
    "email": "admin_unique_test@example.com",
    "password": "password123",
    "role": "admin",
    "registration_no": None,
    "university_id": 1
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
