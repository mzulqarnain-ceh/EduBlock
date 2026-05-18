import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.university import University

db = SessionLocal()
try:
    gcuf = db.query(University).filter(University.id == 15).first()
    if gcuf:
        db.delete(gcuf)
        db.commit()
        print("Safely deleted orphaned GCUF university record from DB!")
    else:
        print("Orphaned GCUF university record not found.")
finally:
    db.close()
