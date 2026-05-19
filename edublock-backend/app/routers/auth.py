from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.utils.security import (
    hash_password, verify_password, create_access_token, get_current_user
)
from app.services.email_service import send_forgot_password_email, send_pending_admin_email
from app.models.university import University

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    try:
        # Check if email already exists
        existing = db.query(User).filter(User.email == request.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Check if registration number already exists (for students)
        if request.registration_no:
            existing_reg = db.query(User).filter(User.registration_no == request.registration_no).first()
            if existing_reg:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Registration number already registered"
                )

        # Validate role
        try:
            role = UserRole(request.role.upper())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {[r.value for r in UserRole]}"
            )

        # Handle Admin Registration vs Student Registration
        initial_status = UserStatus.ACTIVE
        if role == UserRole.ADMIN:
            initial_status = UserStatus.PENDING

        # Create user
        user = User(
            email=request.email,
            registration_no=request.registration_no,
            password_hash=hash_password(request.password),
            name=request.name,
            role=role,
            university_id=request.university_id,
            status=initial_status,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Notify Super Admin if new Institute Admin is pending
        university_name = "Unknown"
        if initial_status == UserStatus.PENDING:
            # Find super admin
            super_admin = db.query(User).filter(User.role == UserRole.SUPERADMIN).first()
            if user.university_id:
                uni = db.query(University).filter(University.id == user.university_id).first()
                if uni:
                    university_name = uni.name
                    
            if super_admin:
                try:
                    send_pending_admin_email(super_admin.email, user.name, user.email, university_name)
                except Exception as e:
                    print(f"Email error: {e}")

        # Generate token
        token = create_access_token(data={"sub": str(user.id)})

        return TokenResponse(
            access_token=token,
            user={
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role.value,
                "registration_no": user.registration_no,
                "university_id": user.university_id,
                "university_name": university_name if user.role == UserRole.ADMIN else None,
                "profile_image": user.profile_image,
            }
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        print(f"Registration Error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login with email or registration_no and password."""
    # Try finding by email or registration_no
    user = db.query(User).filter(
        (User.email == request.email) | (User.registration_no == request.email)
    ).first()

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
    if request.role and user.role.value != request.role.upper():
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
            "registration_no": user.registration_no,
            "university_id": user.university_id,
            "university_name": user.university.name if user.university else None,
            "profile_image": user.profile_image,
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
        "registration_no": current_user.registration_no,
        "university_id": current_user.university_id,
        "wallet_address": current_user.wallet_address,
        "status": current_user.status.value,
        "profile_image": current_user.profile_image,
        "created_at": str(current_user.created_at) if current_user.created_at else None,
        "last_login": str(current_user.last_login) if current_user.last_login else None,
    }


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send a password reset link to the user's email."""
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Return success anyway to prevent email enumeration
        return {"message": "If that email exists in our system, a reset link has been sent."}

    # In a real app, generate a secure random token and save to DB
    # For now, we'll use a signed JWT as a simple stateless reset token
    reset_token = create_access_token(data={"sub": str(user.id), "type": "reset"}, expires_delta=timedelta(minutes=60))
    
    # Normally this would point to the frontend reset page
    reset_link = f"http://localhost:5173/reset-password?token={reset_token}"
    
    # Send email
    send_forgot_password_email(user.email, user.name, reset_link)
    
    return {"message": "If that email exists in our system, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using token."""
    from jose import jwt, JWTError
    from app.config import get_settings
    settings = get_settings()
    
    try:
        payload = jwt.decode(request.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        
        if not user_id or token_type != "reset":
            raise HTTPException(status_code=400, detail="Invalid reset token")
            
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Update password
        user.password_hash = hash_password(request.new_password)
        db.commit()
        
        return {"message": "Password reset successfully. You can now log in."}
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
