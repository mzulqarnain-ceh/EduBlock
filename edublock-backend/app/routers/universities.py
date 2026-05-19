from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.university import University, UniversityStatus
from app.models.degree import Degree
from app.schemas.university import UniversityCreate, UniversityUpdate, UniversityResponse
from app.utils.security import require_role

router = APIRouter(prefix="/api/universities", tags=["University Management"])


@router.get("/public")
def list_universities_public(db: Session = Depends(get_db)):
    """Publicly list universities for registration."""
    universities = db.query(University).filter(University.status == UniversityStatus.ACTIVE).all()
    return [{"id": u.id, "name": u.name} for u in universities]


@router.get("/")
def list_universities(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    """List all universities with student count."""
    universities = db.query(University).order_by(University.created_at.desc()).all()

    result = []
    for uni in universities:
        # Get unique registration numbers and emails from degrees
        degree_records = db.query(Degree.registration_no, Degree.student_email).filter(
            Degree.university_id == uni.id
        ).all()
        
        unique_students = set()
        for reg, email in degree_records:
            if reg:
                unique_students.add(reg.strip().lower())
            elif email:
                unique_students.add(email.strip().lower())
                
        # Get unique registration numbers and emails from registered student users
        user_records = db.query(User.registration_no, User.email).filter(
            User.university_id == uni.id,
            User.role == UserRole.STUDENT
        ).all()
        
        for reg, email in user_records:
            if reg:
                unique_students.add(reg.strip().lower())
            elif email:
                unique_students.add(email.strip().lower())
                
        student_count = len(unique_students)

        result.append({
            "id": uni.id,
            "name": uni.name,
            "email": uni.email,
            "status": uni.status.value,
            "contract_address": uni.contract_address,
            "created_at": str(uni.created_at) if uni.created_at else None,
            "students": student_count,
        })

    return result


@router.post("/")
def create_university(
    request: UniversityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    """Add a new university and create a default admin user for it."""
    from app.models.user import UserStatus
    from app.utils.security import hash_password
    from app.services.email_service import send_university_admin_credentials_email
    
    # 1. Check if University email already exists
    existing_uni = db.query(University).filter(University.email == request.email).first()
    if existing_uni:
        raise HTTPException(status_code=400, detail="University email already exists")

    # 2. Check if a User already exists with this email address
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="A student or admin user is already registered with this email address. Please use a unique email."
        )

    try:
        # 3. Create University
        university = University(
            name=request.name,
            email=request.email,
            status=UniversityStatus.ACTIVE,
            created_by=current_user.id,
        )
        db.add(university)
        db.flush() # Flush to assign university.id without committing

        # 4. Create Default Admin User
        admin_name = request.admin_name or f"{request.name} Admin"
        admin_password = request.admin_password or "Admin123!"
        
        admin_user = User(
            name=admin_name,
            email=request.email,  # Same email as university
            password_hash=hash_password(admin_password),
            role=UserRole.ADMIN,
            university_id=university.id,
            status=UserStatus.ACTIVE,
        )
        db.add(admin_user)
        db.commit() # Commit both atomically
        db.refresh(university)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add university: {str(e)}")

    # 5. Send Credentials Email
    try:
        send_university_admin_credentials_email(
            admin_email=admin_user.email,
            admin_name=admin_user.name,
            university_name=university.name,
            password=admin_password
        )
    except Exception as e:
        print(f"[Email Error] Failed to send onboarding email: {e}")

    return {
        "id": university.id,
        "name": university.name,
        "email": university.email,
        "status": university.status.value,
        "message": f"University '{university.name}' added successfully! Admin credentials sent to {university.email}.",
    }


@router.put("/{uni_id}")
def update_university(
    uni_id: int,
    request: UniversityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    """Update university details. Super Admin only."""
    university = db.query(University).filter(University.id == uni_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="University not found")

    if request.name is not None:
        university.name = request.name
    if request.email is not None:
        university.email = request.email
    if request.status is not None:
        university.status = UniversityStatus(request.status)

    db.commit()
    db.refresh(university)
    return {"message": f"University '{university.name}' updated successfully"}


@router.delete("/{uni_id}")
def delete_university(
    uni_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    """Delete a university. Also deletes its admins but keeps students (detached)."""
    university = db.query(University).filter(University.id == uni_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="University not found")

    # 1. Get associated users first to handle references
    associated_users = db.query(User).filter(User.university_id == uni_id).all()
    admin_ids = [u.id for u in associated_users if u.role == UserRole.ADMIN or str(u.role).upper() == "ADMIN"]

    # 2. Detach DEGREES (nullify FKs but keep the records)
    # Get all degrees that either belong to this university or were issued by someone from this university
    db.query(Degree).filter(
        (Degree.university_id == uni_id) | (Degree.issued_by.in_(admin_ids))
    ).update({"university_id": None, "issued_by": None}, synchronize_session=False)

    # 3. Nullify audit log references for users being deleted (Admins)
    if admin_ids:
        from app.models.audit_log import AuditLog
        db.query(AuditLog).filter(AuditLog.user_id.in_(admin_ids)).update({"user_id": None}, synchronize_session=False)

    # 4. Delete associated ADMIN users
    if admin_ids:
        db.query(User).filter(User.id.in_(admin_ids)).delete(synchronize_session=False)

    # 5. Detach STUDENTS (keep their accounts but set university_id to null)
    db.query(User).filter(
        User.university_id == uni_id, 
        User.role == UserRole.STUDENT
    ).update({"university_id": None}, synchronize_session=False)

    # 6. Delete the University
    db.delete(university)
    db.commit()
    
    return {"message": f"University '{university.name}' and its admins deleted. Students and degrees preserved."}


@router.put("/{uni_id}/toggle-status")
def toggle_university_status(
    uni_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    """Toggle university status between Active and Inactive."""
    university = db.query(University).filter(University.id == uni_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="University not found")

    new_status = (
        UniversityStatus.INACTIVE
        if university.status == UniversityStatus.ACTIVE
        else UniversityStatus.ACTIVE
    )
    university.status = new_status
    db.commit()
    return {"message": f"Status changed to {new_status.value}", "status": new_status.value}
