from sqlalchemy import create_engine, text
import sys
import os

sys.path.append(os.getcwd())
from app.config import get_settings
from app.database import SessionLocal
from app.models.degree import Degree

def test():
    db = SessionLocal()
    try:
        # Current logic
        max_token_old = db.query(Degree.token_id).order_by(Degree.token_id.desc()).first()
        print(f"Old logic returned: {max_token_old}")
        
        # New logic
        max_token_new = db.query(Degree.token_id).filter(Degree.token_id.isnot(None)).order_by(Degree.token_id.desc()).first()
        print(f"New logic returned: {max_token_new}")
        
        next_id = (max_token_new[0] or 0) + 1 if max_token_new and max_token_new[0] is not None else 1
        print(f"Next Token ID would be: {next_id}")
    finally:
        db.close()

if __name__ == "__main__":
    test()
