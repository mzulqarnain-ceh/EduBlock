from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine, Base, SessionLocal
from app.models.user import User, UserRole, UserStatus
from app.models.university import University, UniversityStatus
from app.models.degree import Degree
from app.models.transaction import Transaction
from app.models.audit_log import AuditLog
from app.utils.security import hash_password

# Import all routers
from app.routers import auth, users, universities, degrees, verification, analytics, audit

settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Blockchain-Powered Educational Certificate Verification System",
    version=settings.APP_VERSION,
)

# CORS middleware — allow React frontend to call our API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(universities.router)
app.include_router(degrees.router)
app.include_router(verification.router)
from fastapi.staticfiles import StaticFiles
import os

app.include_router(analytics.router)
app.include_router(audit.router)

# Mount uploads directory
os.makedirs("uploads/profiles", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
def startup():
    """Create database tables and seed default data on startup."""
    # Create all tables (only creates NEW tables, doesn't alter existing ones)
    Base.metadata.create_all(bind=engine)

    # ========== AUTO-MIGRATION: Add missing columns to existing tables ==========
    from sqlalchemy import text
    db = SessionLocal()
    try:
        # Add student_user_id column to degrees table if it doesn't exist
        try:
            db.execute(text("ALTER TABLE degrees ADD COLUMN student_user_id INTEGER REFERENCES users(id)"))
            db.commit()
            print("✅ Migration: Added 'student_user_id' column to degrees table")
        except Exception:
            db.rollback()  # Column already exists, ignore

        # Create index on student_user_id if not exists
        try:
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_degrees_student_user_id ON degrees (student_user_id)"))
            db.commit()
        except Exception:
            db.rollback()

    except Exception as e:
        print(f"⚠️  Migration check: {e}")
        db.rollback()
    finally:
        db.close()

    # ALTER TYPE ... ADD VALUE must run OUTSIDE a transaction (PostgreSQL requirement)
    # Fix: Drop and recreate audit_logs table with String column instead of Enum
    # (the old table used SQLEnum which caused migration issues)
    try:
        raw_conn = engine.raw_connection()
        raw_conn.set_isolation_level(0)  # AUTOCOMMIT
        cursor = raw_conn.cursor()
        try:
            # Check if old enum-based column exists
            cursor.execute("""
                SELECT data_type FROM information_schema.columns 
                WHERE table_name = 'audit_logs' AND column_name = 'action'
            """)
            row = cursor.fetchone()
            if row and row[0] == 'USER-DEFINED':
                # Old enum column detected — drop table and recreate with String column
                cursor.execute("DROP TABLE IF EXISTS audit_logs CASCADE")
                cursor.execute("DROP TYPE IF EXISTS auditaction CASCADE")
                print("✅ Migration: Dropped old audit_logs table (had enum column)")
        except Exception as e:
            print(f"⚠️  Audit table check: {e}")
        cursor.close()
        raw_conn.close()
        # Now create_all will recreate audit_logs with the new String column
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"⚠️  Audit migration: {e}")

    # Add 'pending' to userstatus enum if it doesn't exist
    try:
        raw_conn = engine.raw_connection()
        raw_conn.set_isolation_level(0)  # AUTOCOMMIT
        cursor = raw_conn.cursor()
        try:
            cursor.execute("ALTER TYPE userstatus ADD VALUE IF NOT EXISTS 'PENDING'")
            print("✅ Migration: Added 'PENDING' to userstatus enum")
        except Exception:
            pass
        cursor.close()
        raw_conn.close()
    except Exception as e:
        print(f"⚠️  UserStatus enum migration: {e}")

    # Seed default accounts if they don't exist
    db = SessionLocal()
    try:
        # Check if super admin exists
        existing = db.query(User).filter(User.email == "super@admin.com").first()
        if not existing:
            # Create default university
            university = University(
                name="Tech University",
                email="admin@techuni.edu",
                status=UniversityStatus.ACTIVE,
            )
            db.add(university)
            db.flush()

            university2 = University(
                name="Science Institute",
                email="admin@sciinst.edu",
                status=UniversityStatus.ACTIVE,
            )
            db.add(university2)
            db.flush()

            # Create default super admin
            super_admin = User(
                email="super@admin.com",
                password_hash=hash_password("test"),
                name="Super Admin",
                role=UserRole.SUPERADMIN,
                status=UserStatus.ACTIVE,
            )
            db.add(super_admin)

            super_admin2 = User(
                email="superadmin@edublock.com",
                password_hash=hash_password("admin123"),
                name="EduBlock Admin",
                role=UserRole.SUPERADMIN,
                status=UserStatus.ACTIVE,
            )
            db.add(super_admin2)

            # Create default institute admin
            admin = User(
                email="admin@test.com",
                password_hash=hash_password("test"),
                name="Institute Admin",
                role=UserRole.ADMIN,
                university_id=university.id,
                status=UserStatus.ACTIVE,
            )
            db.add(admin)

            admin2 = User(
                email="admin@university.edu",
                password_hash=hash_password("admin123"),
                name="University Admin",
                role=UserRole.ADMIN,
                university_id=university2.id,
                status=UserStatus.ACTIVE,
            )
            db.add(admin2)

            # Create default student
            student = User(
                email="student@test.com",
                password_hash=hash_password("test"),
                name="John Doe",
                role=UserRole.STUDENT,
                university_id=university.id,
                status=UserStatus.ACTIVE,
            )
            db.add(student)

            student2 = User(
                email="student@example.com",
                password_hash=hash_password("student123"),
                name="Jane Smith",
                role=UserRole.STUDENT,
                university_id=university.id,
                status=UserStatus.ACTIVE,
            )
            db.add(student2)

            db.commit()
            print("[OK] Database seeded with default accounts!")
            print("   - super@admin.com / test (Super Admin)")
            print("   - admin@test.com / test (Institute Admin)")
            print("   - student@test.com / test (Student)")
        else:
            print("[OK] Database already has data, skipping seed.")
    except Exception as e:
        print(f"[ERR] Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

    # ========== BLOCKCHAIN SETUP ==========
    try:
        from app.services.blockchain_service import blockchain

        if blockchain.connect():
            # If no contract address configured, deploy a new one
            if not settings.CONTRACT_ADDRESS:
                print("[LINK] No contract address found. Deploying new contract...")
                # Check if compiled files exist, if not compile first
                from pathlib import Path
                abi_path = Path(__file__).parent.parent / "contracts" / "compiled" / "EduBlockCertificate_abi.json"
                if not abi_path.exists():
                    print("[INFO] Compiling smart contract...")
                    from app.services.compile_contract import compile_contract
                    compile_contract()

                address = blockchain.deploy_contract()
                if address:
                    print(f"[LINK] Contract deployed! Address: {address}")
                    print(f"   -> Add this to .env: CONTRACT_ADDRESS={address}")
                else:
                    print("[WARN] Contract deployment failed. Blockchain features will be limited.")
            else:
                print(f"[LINK] Contract loaded at: {settings.CONTRACT_ADDRESS}")
        else:
            print("[WARN] Blockchain not available. App will work without blockchain features.")
    except Exception as e:
        print(f"[WARN] Blockchain setup error: {e}. App will work without blockchain.")


@app.get("/")
def root():
    """Health check endpoint."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/api/test-cors")
def test_cors():
    return {"message": "CORS is working"}


@app.get("/health")
def health():
    return {"status": "healthy"}
