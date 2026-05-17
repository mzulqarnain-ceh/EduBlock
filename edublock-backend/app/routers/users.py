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
    query = db.query(User).filter(User.role != UserRole.SUPERADMIN)

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

    try:
        role_enum = UserRole(request.role.upper())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{request.role}'. Must be one of: {[r.value for r in UserRole]}"
        )

    user = User(
        name=request.name,
        email=request.email,
        password_hash=hash_password(request.password),
        role=role_enum,
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

    try:
        user.status = UserStatus(request.status.upper())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{request.status}'. Must be one of: {[s.value for s in UserStatus]}"
        )
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

    # 1. Nullify audit log references
    from app.models.audit_log import AuditLog
    db.query(AuditLog).filter(AuditLog.user_id == user_id).update({"user_id": None}, synchronize_session=False)

    # 2. Delete the user
    db.delete(user)
    db.commit()
    return {"message": f"User '{user.name}' deleted successfully"}


from fastapi import UploadFile, File
import shutil
import os
from app.schemas.user import ChangePasswordRequest, PreferencesUpdate
from app.utils.security import verify_password

@router.put("/me/password")
def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change current user's password."""
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.password_hash = hash_password(request.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/me/photo")
def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload profile photo."""
    # 1. Content Type Check
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # 2. Extension Whitelist Check
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    _, file_extension = os.path.splitext(file.filename.lower())
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid image extension. Allowed: JPG, JPEG, PNG, GIF, WEBP")

    # 3. File Size Check (Max 5MB)
    max_size = 5 * 1024 * 1024
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > max_size:
        raise HTTPException(status_code=400, detail="File size exceeds maximum limit of 5MB")

    # Save file
    os.makedirs("uploads/profiles", exist_ok=True)
    file_path = f"uploads/profiles/{current_user.id}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    current_user.profile_image = f"/{file_path}"
    db.commit()
    
    return {"message": "Profile photo updated", "profile_image": current_user.profile_image}


@router.get("/me/preferences")
def get_preferences(current_user: User = Depends(get_current_user)):
    """Get user preferences."""
    return {"preferences": current_user.preferences or {}}


@router.put("/me/preferences")
def update_preferences(
    request: PreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update user preferences."""
    current_user.preferences = request.preferences
    db.commit()
    return {"message": "Preferences updated", "preferences": current_user.preferences}
