from sqlalchemy import create_engine, text
import sys
import os

sys.path.append(os.getcwd())
from app.config import get_settings
from app.database import SessionLocal
from app.models.degree import Degree, DegreeStatus

def reset():
    db = SessionLocal()
    try:
        deg = db.query(Degree).filter(Degree.id == 141).first()
        if deg:
            deg.status = DegreeStatus.PENDING
            deg.grade = ""
            deg.issue_date = ""
            deg.token_id = None
            deg.blockchain_hash = None
            deg.tx_hash = None
            db.commit()
            print(f"Successfully reset degree 141 back to PENDING!")
        else:
            print("Degree 141 not found.")
    finally:
        db.close()

if __name__ == "__main__":
    reset()
