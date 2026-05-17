
from sqlalchemy import create_engine, text
import sys
import os

sys.path.append(os.getcwd())
from app.config import get_settings

def check_data():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        print("--- USERS ---")
        res = conn.execute(text("SELECT id, email, registration_no, name, role FROM users"))
        for row in res:
            print(f"ID: {row[0]}, Email: {row[1]}, RegNo: {row[2]}, Name: {row[3]}, Role: {row[4]}")
            
        print("\n--- DEGREES ---")
        res = conn.execute(text("SELECT id, student_name, student_id, registration_no, student_user_id, status FROM degrees"))
        for row in res:
            print(f"ID: {row[0]}, StudentName: {row[1]}, StudentID (Email): {row[2]}, RegNo: {row[3]}, StudentUserID: {row[4]}, Status: {row[5]}")

if __name__ == "__main__":
    check_data()
