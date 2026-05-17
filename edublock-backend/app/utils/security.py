from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import secrets
import re
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import get_db
from app.models.user import User

settings = get_settings()

# OAuth2 scheme for JWT token extraction from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    """Hash a plain text password using SHA-256 with salt."""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${hashed}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        salt, stored_hash = hashed_password.split("$")
        check_hash = hashlib.sha256((salt + plain_password).encode()).hexdigest()
        return check_hash == stored_hash
    except (ValueError, AttributeError):
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Dependency: Extract and validate user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if token is None:
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user


def require_role(*roles: str):
    """Dependency factory: Restrict access to specific user roles."""
    def role_checker(current_user: User = Depends(get_current_user)):
        user_role = current_user.role.value.lower() if hasattr(current_user.role, 'value') else str(current_user.role).lower()
        allowed_roles = [r.lower() for r in roles]
        
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(roles)}"
            )
        return current_user
    return role_checker


def is_safe_input(value: Optional[str]) -> bool:
    """
    Validate that a given string input is safe from SQL injection, XSS, and command injection.
    Only allows alphanumeric characters, spaces, and safe symbols: - _ @ . /
    Returns True if safe, False if potentially malicious.
    """
    if not value:
        return True
    
    # 1. Length constraint (defense in depth against buffer overflow or huge inputs)
    if len(value) > 255:
        return False
        
    # 2. Character white-listing (No quotes, semicolons, angle brackets, etc.)
    # Allowed: alphanumeric, space, hyphens, underscores, at signs, dots, forward slashes
    safe_pattern = re.compile(r"^[a-zA-Z0-9\s\-_@./]*$")
    if not safe_pattern.match(value):
        return False
        
    # 3. SQL injection and Script injection blacklist (case-insensitive check)
    blacklist = [
        "select", "union", "insert", "update", "delete", "drop", "alter", 
        "truncate", "exec", "script", "--", "/*", "*/", "xp_cmdshell"
    ]
    lower_val = value.lower()
    for keyword in blacklist:
        if keyword in lower_val:
            return False
            
    return True

