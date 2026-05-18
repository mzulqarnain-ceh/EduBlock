import sys
import os

sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.degree import Degree
from app.models.transaction import Transaction

def clean_database():
    db = SessionLocal()
    try:
        print("Cleaning transaction records...")
        db.query(Transaction).delete()
        print("Cleaning degree records...")
        db.query(Degree).delete()
        db.commit()
        print("✅ Database cleaned! All degrees and transactions deleted successfully.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error cleaning database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clean_database()
