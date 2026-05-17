import requests

url = "http://127.0.0.1:8000/api/auth/register"
payload = {
    "name": "Test User",
    "email": "test_user_unique@example.com",
    "password": "password123",
    "role": "student",
    "registration_no": "REG_UNIQUE_123",
    "university_id": None
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
