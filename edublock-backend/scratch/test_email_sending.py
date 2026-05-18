import os
import sys

# Add parent dir to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.email_service import send_forgot_password_email

# Test email sending to martysyda@gmail.com
print("Testing forgot password email sending...")
success = send_forgot_password_email("martysyda@gmail.com", "Marty Syda", "http://localhost:5173/reset-password?token=test_token_123")
print("Email sending success:", success)
