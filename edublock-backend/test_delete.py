from sqlalchemy import create_engine, text
import sys
import os

sys.path.append(os.getcwd())

from app.config import get_settings

def test_delete(uni_id):
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    
    print(f"Testing deletion of University ID: {uni_id}")
    
    with engine.connect() as conn:
        try:
            # Try to detach everything manually in one transaction
            trans = conn.begin()
            
            # 1. Degrees
            print("Step 1: Detaching degrees...")
            conn.execute(text(f"UPDATE degrees SET university_id = NULL, issued_by = NULL WHERE university_id = {uni_id}"))
            
            # 2. Users (Get admin IDs first)
            print("Step 2: Identifying admins...")
            res = conn.execute(text(f"SELECT id FROM users WHERE university_id = {uni_id} AND role = 'admin'"))
            admin_ids = [row[0] for row in res]
            
            if admin_ids:
                admin_ids_str = ",".join(map(str, admin_ids))
                print(f"Admins to delete: {admin_ids_str}")
                
                # Nullify audit logs for these admins
                print("Step 3: Nullifying audit logs...")
                conn.execute(text(f"UPDATE audit_logs SET user_id = NULL WHERE user_id IN ({admin_ids_str})"))
                
                # Delete admins
                print("Step 4: Deleting admins...")
                conn.execute(text(f"DELETE FROM users WHERE id IN ({admin_ids_str})"))
            
            # 3. Students
            print("Step 5: Detaching students...")
            conn.execute(text(f"UPDATE users SET university_id = NULL WHERE university_id = {uni_id} AND role = 'student'"))
            
            # 4. University
            print("Step 6: Deleting university...")
            conn.execute(text(f"DELETE FROM universities WHERE id = {uni_id}"))
            
            trans.commit()
            print("✅ SUCCESS: University deleted successfully in test script!")
            
        except Exception as e:
            print(f"❌ FAILED: {e}")
            if 'trans' in locals():
                trans.rollback()

if __name__ == "__main__":
    # Get uni_id from args or use 9 (from user's error message)
    uni_id = int(sys.argv[1]) if len(sys.argv) > 1 else 9
    test_delete(uni_id)
