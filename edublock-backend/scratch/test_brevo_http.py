import requests

api_key = "YOUR_BREVO_API_KEY"
url = "https://api.brevo.com/v3/smtp/email"

headers = {
    "accept": "application/json",
    "api-key": api_key,
    "content-type": "application/json"
}

data = {
    "sender": {
        "name": "EduBlock",
        "email": "edublocksupport@gmail.com"
    },
    "to": [
        {
            "email": "martysyda@gmail.com",
            "name": "Marty Student"
        }
    ],
    "subject": "Test Email via Brevo HTTP API",
    "htmlContent": "<h1>Success!</h1><p>This email was sent via Brevo HTTP API over Port 443.</p>"
}

print("Sending test email via Brevo HTTP API...")
response = requests.post(url, json=data, headers=headers)
print("Status Code:", response.status_code)
print("Response JSON:", response.json())
