from sqlalchemy import create_engine, inspect
from app.config import get_settings

settings = get_settings()
engine = create_engine(settings.DATABASE_URL)
inspector = inspect(engine)

print("Columns in 'users' table:")
columns = inspector.get_columns('users')
for column in columns:
    print(f"- {column['name']}: {column['type']}")
