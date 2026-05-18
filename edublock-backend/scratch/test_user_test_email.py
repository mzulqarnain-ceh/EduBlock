import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.email_service import send_test_email

print("Triggering test email to martysyda@gmail.com...")
success = send_test_email("martysyda@gmail.com", "Marty")
print("Email send result:", success)
