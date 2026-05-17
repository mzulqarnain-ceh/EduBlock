
from sqlalchemy import create_engine, text
import sys
import os

sys.path.append(os.getcwd())
from app.config import get_settings

def check_data():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        print("--- SEARCH USERS ---")
        res = conn.execute(text("SELECT id, email, registration_no, name, role FROM users WHERE email LIKE '%2022-ag-0002%' OR registration_no = '2022-ag-0002'"))
        for row in res:
            print(f"ID: {row[0]}, Email: {row[1]}, RegNo: {row[2]}, Name: {row[3]}, Role: {row[4]}")
            
        print("\n--- SEARCH DEGREES ---")
        res = conn.execute(text("SELECT id, student_name, student_id, registration_no, student_user_id FROM degrees WHERE registration_no = '2022-ag-0002' OR student_id = '2022-ag-0002'"))
        for row in res:
            print(f"ID: {row[0]}, StudentName: {row[1]}, StudentID (Email): {row[2]}, RegNo: {row[3]}, StudentUserID: {row[4]}")

if __name__ == "__main__":
    check_data()
