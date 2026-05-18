import requests

url = "http://127.0.0.1:8000/api/auth/forgot-password"
data = {
    "email": "martysyda@gmail.com"
}

print("Sending forgot password API request...")
response = requests.post(url, json=data)
print("Response Status Code:", response.status_code)
print("Response JSON:", response.json())
