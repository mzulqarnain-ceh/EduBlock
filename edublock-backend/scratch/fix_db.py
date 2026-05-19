from sqlalchemy import create_engine, text
import sys
import os

sys.path.append(os.getcwd())

from app.config import get_settings

def fix_database():
    settings = get_settings()
    print(f"Connecting to: {settings.DATABASE_URL}")
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # 1. Add university_name column to degrees table
        try:
            conn.execute(text("ALTER TABLE degrees ADD COLUMN university_name VARCHAR(255);"))
            conn.commit()
            print("SUCCESS: Column 'university_name' added to 'degrees' table.")
        except Exception as e:
            print(f"INFO: Note on adding 'university_name': {e}")
            conn.rollback()

        # 2. Make university_id nullable in degrees table
        try:
            conn.execute(text("ALTER TABLE degrees ALTER COLUMN university_id DROP NOT NULL;"))
            conn.commit()
            print("SUCCESS: Column 'university_id' is now nullable.")
        except Exception as e:
            print(f"INFO: Note on nullifying 'university_id': {e}")
            conn.rollback()

        # 3. Make issued_by nullable in degrees table
        try:
            conn.execute(text("ALTER TABLE degrees ALTER COLUMN issued_by DROP NOT NULL;"))
            conn.commit()
            print("SUCCESS: Column 'issued_by' is now nullable.")
        except Exception as e:
            print(f"INFO: Note on nullifying 'issued_by': {e}")
            conn.rollback()

        # 4. Add duration_years column to degrees table
        try:
            conn.execute(text("ALTER TABLE degrees ADD COLUMN duration_years INTEGER DEFAULT 4;"))
            conn.commit()
            print("SUCCESS: Column 'duration_years' added to 'degrees' table.")
        except Exception as e:
            print(f"INFO: Note on adding 'duration_years': {e}")
            conn.rollback()

    print("\nDatabase fix completed!")

if __name__ == "__main__":
    fix_database()
