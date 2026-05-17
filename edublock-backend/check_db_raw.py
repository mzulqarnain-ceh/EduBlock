from sqlalchemy import create_engine, text
import os

# Get DATABASE_URL from .env or default
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/edublock"

engine = create_engine(DATABASE_URL)

with engine.connect() as connection:
    print("--- Users in Database ---")
    result = connection.execute(text("SELECT id, email, role, status, registration_no FROM users"))
    rows = result.fetchall()
    if not rows:
        print("No users found!")
    for row in rows:
        print(f"ID: {row[0]}, Email: {row[1]}, Role: {row[2]}, Status: {row[3]}, RegNo: {row[4]}")
    
    print("\n--- Universities in Database ---")
    result = connection.execute(text("SELECT id, name FROM universities"))
    rows = result.fetchall()
    if not rows:
        print("No universities found!")
    for row in rows:
        print(f"ID: {row[0]}, Name: {row[1]}")
