import psycopg2
from app.config import get_settings

def find_fks():
    settings = get_settings()
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()
    
    query = """
    SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'universities';
    """
    cur.execute(query)
    fks = cur.fetchall()
    print("Foreign Keys pointing to 'universities':")
    for fk in fks:
        print(f"Table: {fk[0]}, Column: {fk[1]}")
        
    print("\nForeign Keys pointing to 'users':")
    query_users = query.replace("'universities'", "'users'")
    cur.execute(query_users)
    fks_users = cur.fetchall()
    for fk in fks_users:
        print(f"Table: {fk[0]}, Column: {fk[1]}")
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    find_fks()
