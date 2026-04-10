from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.university import University, UniversityStatus
from app.schemas.university import UniversityCreate, UniversityUpdate, UniversityResponse
from app.utils.security import require_role

router = APIRouter(prefix="/api/universities", tags=["University Management"])


@router.get("/")
def list_universities(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    """List all universities with student count."""
    universities = db.query(University).order_by(University.created_at.desc()).all()

    result = []
    for uni in universities:
        student_count = db.query(User).filter(
            User.university_id == uni.id,
            User.role == UserRole.STUDENT
        ).count()

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
    """Add a new university. Super Admin only."""
    existing = db.query(University).filter(University.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="University email already exists")

    university = University(
        name=request.name,
        email=request.email,
        status=UniversityStatus.ACTIVE,
        created_by=current_user.id,
    )
    db.add(university)
    db.commit()
    db.refresh(university)

    return {
        "id": university.id,
        "name": university.name,
        "email": university.email,
        "status": university.status.value,
        "message": f"University '{university.name}' added successfully!",
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
    """Delete a university. Super Admin only."""
    university = db.query(University).filter(University.id == uni_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="University not found")

    db.delete(university)
    db.commit()
    return {"message": f"University '{university.name}' deleted successfully"}


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
