from sqlalchemy import create_engine, text
import sys
import os

sys.path.append(os.getcwd())

from app.config import get_settings

def check_data():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        print("--- Checking Users ---")
        res = conn.execute(text("SELECT DISTINCT role FROM users"))
        roles = [row[0] for row in res]
        print(f"Roles in DB: {roles}")
        
        print("\n--- Checking Degrees ---")
        res = conn.execute(text("SELECT id, university_id, issued_by FROM degrees LIMIT 5"))
        for row in res:
            print(f"Degree ID: {row[0]}, UniID: {row[1]}, IssuedBy: {row[2]}")
            
if __name__ == "__main__":
    check_data()
