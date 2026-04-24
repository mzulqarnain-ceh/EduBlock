from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine, Base, SessionLocal
from app.models.user import User, UserRole, UserStatus
from app.models.university import University, UniversityStatus
from app.models.degree import Degree
from app.models.transaction import Transaction
from app.utils.security import hash_password

# Import all routers
from app.routers import auth, users, universities, degrees, verification, analytics

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
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(universities.router)
app.include_router(degrees.router)
app.include_router(verification.router)
app.include_router(analytics.router)


@app.on_event("startup")
def startup():
    """Create database tables and seed default data on startup."""
    # Create all tables
    Base.metadata.create_all(bind=engine)

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
            print("✅ Database seeded with default accounts!")
            print("   - super@admin.com / test (Super Admin)")
            print("   - admin@test.com / test (Institute Admin)")
            print("   - student@test.com / test (Student)")
        else:
            print("✅ Database already has data, skipping seed.")
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

    # ========== BLOCKCHAIN SETUP ==========
    try:
        from app.services.blockchain_service import blockchain

        if blockchain.connect():
            # If no contract address configured, deploy a new one
            if not settings.CONTRACT_ADDRESS:
                print("🔗 No contract address found. Deploying new contract...")
                # Check if compiled files exist, if not compile first
                from pathlib import Path
                abi_path = Path(__file__).parent.parent / "contracts" / "compiled" / "EduBlockCertificate_abi.json"
                if not abi_path.exists():
                    print("📦 Compiling smart contract...")
                    from app.services.compile_contract import compile_contract
                    compile_contract()

                address = blockchain.deploy_contract()
                if address:
                    print(f"🔗 Contract deployed! Address: {address}")
                    print(f"   ➡ Add this to .env: CONTRACT_ADDRESS={address}")
                else:
                    print("⚠️  Contract deployment failed. Blockchain features will be limited.")
            else:
                print(f"🔗 Contract loaded at: {settings.CONTRACT_ADDRESS}")
        else:
            print("⚠️  Blockchain not available. App will work without blockchain features.")
    except Exception as e:
        print(f"⚠️  Blockchain setup error: {e}. App will work without blockchain.")


@app.get("/")
def root():
    """Health check endpoint."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
