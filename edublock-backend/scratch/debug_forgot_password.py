import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.routers.auth import forgot_password
from app.schemas.auth import ForgotPasswordRequest

db = SessionLocal()
try:
    req = ForgotPasswordRequest(email="martysyda@gmail.com")
    print("Directly calling forgot_password function...")
    res = forgot_password(req, db)
    print("Function result:", res)
except Exception as e:
    import traceback
    print("Exception occurred:")
    traceback.print_exc()
finally:
    db.close()
