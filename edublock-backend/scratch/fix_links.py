
from sqlalchemy import create_engine, text, func
from sqlalchemy.orm import sessionmaker
import sys
import os

sys.path.append(os.getcwd())
from app.config import get_settings
from app.models.degree import Degree
from app.models.user import User, UserRole

def fix_links():
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    print("--- Fixing Degree Links ---")
    degrees = db.query(Degree).all()
    students = db.query(User).filter(User.role == UserRole.STUDENT).all()
    
    links_fixed = 0
    for deg in degrees:
        # Try to find a matching student if not already linked or to double check
        for stu in students:
            match = False
            if stu.id == deg.student_user_id:
                match = True
            elif stu.email.lower().strip() == deg.student_id.lower().strip():
                match = True
            elif stu.registration_no and deg.registration_no and stu.registration_no.lower().strip() == deg.registration_no.lower().strip():
                match = True
            elif stu.name.lower().strip() == deg.student_name.lower().strip():
                match = True
                
            if match and deg.student_user_id != stu.id:
                print(f"Linking Degree {deg.id} to Student {stu.id} ({stu.email})")
                deg.student_user_id = stu.id
                links_fixed += 1
                break
                
    db.commit()
    print(f"Fixed {links_fixed} links.")
    db.close()

if __name__ == "__main__":
    fix_links()
