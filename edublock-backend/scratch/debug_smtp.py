import smtplib

host = "smtp-relay.brevo.com"
port = 587
password = "YOUR_SMTP_PASSWORD"

users_to_try = [
    "edublocksupport@gmail.com",
    "martysyda@gmail.com"
]

for user in users_to_try:
    print(f"\n================ TRYING USER: {user} ================")
    try:
        server = smtplib.SMTP(host, port)
        server.set_debuglevel(1)
        server.starttls()
        server.login(user, password)
        print(f"SUCCESS with {user}!")
        server.quit()
        break
    except Exception as e:
        print(f"FAILED with {user}: {e}")
