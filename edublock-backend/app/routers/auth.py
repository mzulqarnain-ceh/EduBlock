from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.utils.security import (
    hash_password, verify_password, create_access_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    # Check if email already exists
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Validate role
    try:
        role = UserRole(request.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {[r.value for r in UserRole]}"
        )

    # Create user
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        name=request.name,
        role=role,
        university_id=request.university_id,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate token
    token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "university_id": user.university_id,
        }
    )


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password."""
    user = db.query(User).filter(User.email == request.email).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user.status.value}. Contact administrator."
        )

    # If role is specified in request, validate it matches
    if request.role and user.role.value != request.role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid credentials for role: {request.role}"
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    # Generate token
    token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "university_id": user.university_id,
        }
    )


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Get current logged-in user's profile."""
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
        "university_id": current_user.university_id,
        "wallet_address": current_user.wallet_address,
        "status": current_user.status.value,
        "created_at": str(current_user.created_at) if current_user.created_at else None,
        "last_login": str(current_user.last_login) if current_user.last_login else None,
    }
