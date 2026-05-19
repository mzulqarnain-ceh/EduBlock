import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load from .env
smtp_host = "smtp-relay.brevo.com"
smtp_port = 587
smtp_user = "edublocksupport@gmail.com"
smtp_password = "YOUR_SMTP_PASSWORD"

print("--- Testing SMTP Port 587 (STARTTLS) ---")
try:
    server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
    server.starttls()
    server.login(smtp_user, smtp_password)
    print("SUCCESS: Connected and Authenticated on 587!")
    server.quit()
except Exception as e:
    print(f"FAILED on 587: {e}")

print("\n--- Testing SMTP Port 465 (SSL) ---")
try:
    server = smtplib.SMTP_SSL(smtp_host, 465, timeout=10)
    server.login(smtp_user, smtp_password)
    print("SUCCESS: Connected and Authenticated on 465!")
    server.quit()
except Exception as e:
    print(f"FAILED on 465: {e}")
