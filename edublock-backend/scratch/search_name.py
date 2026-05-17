
from sqlalchemy import create_engine, text
import sys
import os

sys.path.append(os.getcwd())
from app.config import get_settings

def check_data():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        print("--- SEARCH USERS BY NAME ---")
        res = conn.execute(text("SELECT id, email, registration_no, name, role FROM users WHERE name LIKE '%qasim%'"))
        for row in res:
            print(f"ID: {row[0]}, Email: {row[1]}, RegNo: {row[2]}, Name: {row[3]}, Role: {row[4]}")
            
if __name__ == "__main__":
    check_data()
