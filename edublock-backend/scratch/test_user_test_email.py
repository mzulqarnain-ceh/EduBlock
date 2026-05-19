import smtplib

host = "smtp-relay.brevo.com"
port = 587
password = "YOUR_SMTP_PASSWORD"
user = "abb8cb001@smtp-brevo.com"

print(f"================ TRYING USER: {user} ================")
try:
    server = smtplib.SMTP(host, port, timeout=10)
    server.starttls()
    server.login(user, password)
    print(f"SUCCESS with {user}!")
    server.quit()
except Exception as e:
    print(f"FAILED with {user}: {e}")
