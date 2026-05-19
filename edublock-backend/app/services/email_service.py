"""
Email notification service for EduBlock.
Sends email notifications on certificate events (issue, revoke, etc.)
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings


def _safe_print(message: str):
    """Print message safely, avoiding cp1252/UnicodeEncodeError on Windows terminals."""
    try:
        print(message)
    except UnicodeEncodeError:
        try:
            # Print with emojis replaced by characters or stripped
            print(message.encode('ascii', errors='ignore').decode('ascii'))
        except Exception:
            pass


LAST_EMAIL_ERROR = ""


def get_last_email_error():
    global LAST_EMAIL_ERROR
    return LAST_EMAIL_ERROR


def _get_smtp_connection():
    """Create SMTP connection using settings. Supports Port 465 (SSL) and Port 587 (TLS)."""
    global LAST_EMAIL_ERROR
    settings = get_settings()
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        return None
    try:
        port = int(settings.SMTP_PORT)
        if port == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, port, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, port, timeout=10)
            server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        return server
    except Exception as e:
        LAST_EMAIL_ERROR = f"SMTP Connection Failed: {str(e)}"
        _safe_print(f"[SMTP Connection Failed]: {e}")
        return None


def _send_email(to_email: str, subject: str, html_body: str):
    """Send an email. Supports Resend API and standard SMTP."""
    global LAST_EMAIL_ERROR
    LAST_EMAIL_ERROR = ""  # Reset error message for a new send attempt
    settings = get_settings()

    # 1. Try Resend API first if configured
    if settings.RESEND_API_KEY:
        try:
            import requests
            url = "https://api.resend.com/emails"
            headers = {
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json"
            }
            # Custom domain or fallback onboarding sender
            from_email = "EduBlock <onboarding@resend.dev>"
            if settings.SMTP_USER and "@" in settings.SMTP_USER and "gmail.com" not in settings.SMTP_USER:
                from_email = f"EduBlock <notifications@{settings.SMTP_USER.split('@')[1]}>"

            data = {
                "from": from_email,
                "to": to_email,
                "subject": subject,
                "html": html_body
            }
            response = requests.post(url, json=data, headers=headers)
            if response.status_code in [200, 201, 202]:
                _safe_print(f"[Email Sent via Resend API]: {subject} -> {to_email}")
                return True
            else:
                _safe_print(f"[Resend API Error (status {response.status_code})]: {response.text}")
        except Exception as e:
            _safe_print(f"[Resend API Exception]: {e}")

    # 2. Fallback to standard SMTP if SMTP user/password is configured
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        _safe_print(f"[Email Skipped (Neither SMTP nor Resend API is configured)]: {subject} -> {to_email}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        # Set the professional sender address that users will see in their inbox
        msg["From"] = "EduBlock <edublocksupport@gmail.com>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        server = _get_smtp_connection()
        if server:
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
            server.quit()
            _safe_print(f"[Email Sent]: {subject} -> {to_email}")
            return True
        
        # If server is None, get_last_email_error already has connection error, but let's make sure
        if not LAST_EMAIL_ERROR:
            LAST_EMAIL_ERROR = "SMTP connection could not be established (returned None)."
        return False
    except Exception as e:
        LAST_EMAIL_ERROR = f"Email Send Failed: {str(e)}"
        _safe_print(f"[Email Send Failed]: {e}")
        return False


def send_certificate_issued_email(student_email: str, student_name: str, degree_name: str, tx_hash: str = ""):
    """Send email notification when a certificate is issued."""
    subject = f"🎓 Certificate Issued - {degree_name}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 30px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #fbbf24; margin: 0;">🎓 EduBlock</h1>
            <p style="color: #94a3b8;">Blockchain Certificate Verification System</p>
        </div>
        <div style="background: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #34d399; margin-top: 0;">Certificate Issued Successfully!</h2>
            <p>Dear <strong>{student_name}</strong>,</p>
            <p>Your certificate has been issued and recorded on the blockchain:</p>
            <table style="width: 100%; margin: 16px 0;">
                <tr>
                    <td style="padding: 8px 0; color: #94a3b8;">Degree:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{degree_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #94a3b8;">Status:</td>
                    <td style="padding: 8px 0;"><span style="background: #065f46; color: #34d399; padding: 4px 12px; border-radius: 20px; font-size: 12px;">✅ Issued</span></td>
                </tr>
                {"<tr><td style='padding: 8px 0; color: #94a3b8;'>Tx Hash:</td><td style='padding: 8px 0; font-family: monospace; font-size: 12px; color: #60a5fa; word-break: break-all;'>" + tx_hash + "</td></tr>" if tx_hash else ""}
            </table>
            <p style="color: #94a3b8; font-size: 14px;">You can view and verify your certificate by logging into your EduBlock student dashboard.</p>
        </div>
        <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 24px;">
            © EduBlock - Powered by Blockchain Technology
        </p>
    </div>
    """
    return _send_email(student_email, subject, html)


def send_certificate_revoked_email(student_email: str, student_name: str, degree_name: str, reason: str = ""):
    """Send email notification when a certificate is revoked."""
    subject = f"⚠️ Certificate Revoked - {degree_name}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 30px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #fbbf24; margin: 0;">🎓 EduBlock</h1>
            <p style="color: #94a3b8;">Blockchain Certificate Verification System</p>
        </div>
        <div style="background: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #991b1b;">
            <h2 style="color: #f87171; margin-top: 0;">Certificate Revoked</h2>
            <p>Dear <strong>{student_name}</strong>,</p>
            <p>Your certificate has been revoked by the issuing authority:</p>
            <table style="width: 100%; margin: 16px 0;">
                <tr>
                    <td style="padding: 8px 0; color: #94a3b8;">Degree:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{degree_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #94a3b8;">Status:</td>
                    <td style="padding: 8px 0;"><span style="background: #7f1d1d; color: #f87171; padding: 4px 12px; border-radius: 20px; font-size: 12px;">🚫 Revoked</span></td>
                </tr>
                {"<tr><td style='padding: 8px 0; color: #94a3b8;'>Reason:</td><td style='padding: 8px 0;'>" + reason + "</td></tr>" if reason else ""}
            </table>
            <p style="color: #94a3b8; font-size: 14px;">If you believe this is an error, please contact your institution's administration.</p>
        </div>
        <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 24px;">
            © EduBlock - Powered by Blockchain Technology
        </p>
    </div>
    """
    return _send_email(student_email, subject, html)


def send_forgot_password_email(email: str, name: str, reset_link: str):
    """Send a password reset link."""
    subject = "🔒 Reset Your Password - EduBlock"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 30px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #fbbf24; margin: 0;">🎓 EduBlock</h1>
        </div>
        <div style="background: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #60a5fa; margin-top: 0;">Password Reset Request</h2>
            <p>Dear <strong>{name}</strong>,</p>
            <p>We received a request to reset the password for your EduBlock account. If you made this request, please click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
            </div>
            <p style="color: #94a3b8; font-size: 14px;">If you did not request a password reset, you can safely ignore this email. This link will expire in 1 hour.</p>
        </div>
    </div>
    """
    # Fallback log for local dev
    _safe_print(f"[Password Reset Link for {email}]: {reset_link}")
    return _send_email(email, subject, html)


def send_pending_admin_email(super_admin_email: str, admin_name: str, admin_email: str, university_name: str):
    """Notify Super Admin about a new pending Institute Admin."""
    subject = "⚠️ Action Required: New Institute Admin Registration"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 30px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #fbbf24; margin: 0;">🎓 EduBlock</h1>
        </div>
        <div style="background: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #f59e0b;">
            <h2 style="color: #fbbf24; margin-top: 0;">New Admin Registration</h2>
            <p>Hello Super Admin,</p>
            <p>A new Institute Admin has registered and is pending approval:</p>
            <table style="width: 100%; margin: 16px 0;">
                <tr><td style="padding: 8px 0; color: #94a3b8;">Name:</td><td style="padding: 8px 0;">{admin_name}</td></tr>
                <tr><td style="padding: 8px 0; color: #94a3b8;">Email:</td><td style="padding: 8px 0;">{admin_email}</td></tr>
                <tr><td style="padding: 8px 0; color: #94a3b8;">University:</td><td style="padding: 8px 0;">{university_name}</td></tr>
            </table>
            <p>Please log in to the Super Admin Dashboard to approve or decline this request.</p>
        </div>
    </div>
    """
    return _send_email(super_admin_email, subject, html)


def send_university_admin_credentials_email(admin_email: str, admin_name: str, university_name: str, password: str):
    """Send login credentials to a newly created University Admin."""
    settings = get_settings()
    subject = f"🏛️ Welcome to EduBlock - {university_name}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 30px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #fbbf24; margin: 0;">🎓 EduBlock</h1>
            <p style="color: #94a3b8;">Blockchain Certificate Verification System</p>
        </div>
        <div style="background: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #34d399; margin-top: 0;">Welcome, {admin_name}!</h2>
            <p>Your university <strong>{university_name}</strong> has been registered on EduBlock.</p>
            <p>You can now log in to your Institute Admin dashboard using the following credentials:</p>
            <div style="background: #0f172a; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; font-family: monospace;"><strong>Email:</strong> {admin_email}</p>
                <p style="margin: 8px 0 0 0; font-family: monospace;"><strong>Password:</strong> {password}</p>
            </div>
            <p style="color: #94a3b8; font-size: 14px;">We recommend changing your password after your first login.</p>
            <div style="text-align: center; margin-top: 30px;">
                <a href="{settings.FRONTEND_URL.rstrip('/')}/login" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Dashboard</a>
            </div>
        </div>
        <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 24px;">
            © EduBlock - Powered by Blockchain Technology
        </p>
    </div>
    """
    return _send_email(admin_email, subject, html)


def send_test_email(to_email: str, name: str):
    """Send a diagnostic test email to a user."""
    from datetime import datetime
    subject = "Test Email - EduBlock Notification Settings"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 30px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #fbbf24; margin: 0;">🎓 EduBlock</h1>
            <p style="color: #94a3b8;">Blockchain Certificate Verification System</p>
        </div>
        <div style="background: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #34d399; margin-top: 0;">Test Email Successful!</h2>
            <p>Dear <strong>{name}</strong>,</p>
            <p>This is a test email sent from your EduBlock account settings page to verify that your email notification system is working perfectly.</p>
            <div style="background: #0f172a; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; font-family: monospace; font-size: 14px; color: #34d399;">
                Status: ACTIVE<br>
                Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br>
                Recipient: {to_email}
            </div>
            <p style="color: #94a3b8; font-size: 14px;">If you received this email, your notification configuration is fully functional and ready to deliver real-time certificate alerts!</p>
        </div>
        <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 24px;">
            © EduBlock - Powered by Blockchain Technology
        </p>
    </div>
    """
    return _send_email(to_email, subject, html)


def send_contact_form_email(sender_name: str, sender_email: str, email_subject: str, message_body: str):
    """Send an email to support containing the user's contact form message."""
    settings = get_settings()
    # Support email to deliver the message to
    support_email = "edublocksupport@gmail.com"
    
    subject = f"📨 New Support Message: {email_subject}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 30px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #fbbf24; margin: 0;">🎓 EduBlock Support</h1>
            <p style="color: #94a3b8;">New Contact Us Submission</p>
        </div>
        <div style="background: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
            <h2 style="color: #3b82f6; margin-top: 0;">Message Details</h2>
            <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #94a3b8; width: 100px;">From Name:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{sender_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #94a3b8;">From Email:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #60a5fa;">{sender_email}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #94a3b8;">Subject:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{email_subject}</td>
                </tr>
            </table>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;">
            <h3 style="color: #e2e8f0; margin-top: 0;">Message Content:</h3>
            <p style="background: #0f172a; padding: 16px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; margin: 0; line-height: 1.5;">{message_body}</p>
        </div>
        <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 24px;">
            © EduBlock Contact Form Service
        </p>
    </div>
    """
    return _send_email(support_email, subject, html)

