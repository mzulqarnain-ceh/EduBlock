from app.database import engine
from sqlalchemy import text

try:
    raw_conn = engine.raw_connection()
    raw_conn.set_isolation_level(0)  # AUTOCOMMIT
    cursor = raw_conn.cursor()
    cursor.execute("ALTER TYPE userstatus ADD VALUE IF NOT EXISTS 'PENDING'")
    print("Successfully added 'PENDING' to userstatus enum")
    cursor.close()
    raw_conn.close()
except Exception as e:
    print(f"Error: {e}")
