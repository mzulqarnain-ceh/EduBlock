from sqlalchemy import create_engine, text
import sys
import os

sys.path.append(os.getcwd())
from app.config import get_settings

def check_data():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        print("--- SPECIFIC DEGREES DETAILS ---")
        res = conn.execute(text("SELECT id, student_name, registration_no, degree_name, grade, issue_date, status FROM degrees WHERE registration_no = '2022-ag-7995'"))
        for row in res:
            print(f"ID: {row[0]}, Name: {row[1]}, Reg: {row[2]}, Degree: {row[3]}, Grade: {row[4]}, IssueDate: {row[5]}, Status: {row[6]}")

if __name__ == "__main__":
    check_data()
