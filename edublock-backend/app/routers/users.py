from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.schemas.user import UserResponse, UserCreate, UserStatusUpdate
from app.utils.security import get_current_user, require_role, hash_password

router = APIRouter(prefix="/api/users", tags=["User Management"])


@router.get("/", response_model=list[UserResponse])
def list_users(
    role: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    """List all users (Super Admin only). Supports filtering by role, status, and search."""
    query = db.query(User)

    if role and role != "all":
        query = query.filter(User.role == role)
    if status_filter and status_filter != "all":
        query = query.filter(User.status == status_filter)
    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )

    users = query.order_by(User.created_at.desc()).all()
    return users


@router.post("/", response_model=UserResponse)
def create_user(
    request: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    """Create a new user (Super Admin only)."""
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        name=request.name,
        email=request.email,
        password_hash=hash_password(request.password),
        role=UserRole(request.role),
        university_id=request.university_id,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    request: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    """Update a user's status (Active/Inactive/Suspended). Super Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.status = UserStatus(request.status)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superadmin")),
):
    """Delete a user (Super Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": f"User '{user.name}' deleted successfully"}
