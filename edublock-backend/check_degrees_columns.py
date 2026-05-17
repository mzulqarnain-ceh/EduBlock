from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/edublock"
engine = create_engine(DATABASE_URL)

with engine.connect() as connection:
    print("--- Degrees Table Columns ---")
    result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'degrees'"))
    for row in result:
        print(row[0])
