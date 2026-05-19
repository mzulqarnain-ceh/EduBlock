from sqlalchemy import create_engine, text
from app.config import get_settings

settings = get_settings()
engine = create_engine(settings.DATABASE_URL)

with engine.connect() as conn:
    print("--- UserStatus Enum Values in Postgres ---")
    res = conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'userstatus'"))
    for row in res:
        print(f"- {row[0]}")

    print("\n--- UserRole Enum Values in Postgres ---")
    res = conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'userrole'"))
    for row in res:
        print(f"- {row[0]}")
