from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
import re


class UniversityCreate(BaseModel):
    name: str
    email: EmailStr
    admin_name: Optional[str] = None
    admin_password: Optional[str] = None

    @staticmethod
    def _scan_injections(val: str, field_name: str):
        if not val:
            return
        trimmed = val.strip()
        lower_val = trimmed.lower()
        
        # Check standard SQL injection keywords
        sql_keywords = ['select ', 'union ', 'insert ', 'update ', 'delete ', 'drop ', 'alter ', '--', '/*', 'xp_cmdshell']
        if any(kw in lower_val for kw in sql_keywords):
            raise ValueError(f"Unsafe SQL keyword detected in {field_name}")
            
        # Check standard XSS injection signatures
        xss_patterns = ['<script', 'javascript:', 'onload', 'onerror']
        if any(p in lower_val for p in xss_patterns):
            raise ValueError(f"Unsafe HTML/Script tags detected in {field_name}")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        trimmed = v.strip() if v else ""
        if not trimmed:
            raise ValueError("University name cannot be empty")
        if len(trimmed) < 3 or len(trimmed) > 100:
            raise ValueError("University name must be between 3 and 100 characters")
        
        # Injection scan
        cls._scan_injections(trimmed, "University Name")
        
        # Allow letters, numbers, spaces, dots, hyphens, parentheses, slashes, or ampersands
        if not re.match(r"^[a-zA-Z0-9\s.()'/&-]+$", trimmed):
            raise ValueError("University name contains invalid characters")
        return trimmed

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        # EmailStr already validates general structure, we add custom boundary checks
        trimmed = v.strip() if v else ""
        if len(trimmed) > 100:
            raise ValueError("Email address is too long (max 100 characters)")
        return trimmed

    @field_validator('admin_name')
    @classmethod
    def validate_admin_name(cls, v):
        if v is None:
            return v
        trimmed = v.strip()
        if not trimmed:
            return None
        if len(trimmed) < 2 or len(trimmed) > 100:
            raise ValueError("Admin name must be between 2 and 100 characters")
        
        # Injection scan
        cls._scan_injections(trimmed, "Admin Name")
        
        # Only allow letters, spaces, dots, hyphens, and apostrophes
        if not re.match(r"^[a-zA-Z\s.'-]+$", trimmed):
            raise ValueError("Admin name must only contain letters, spaces, or dots")
        return trimmed

    @field_validator('admin_password')
    @classmethod
    def validate_admin_password(cls, v):
        if v is None:
            return v
        trimmed = v.strip()
        if not trimmed:
            return None
        if len(trimmed) < 6 or len(trimmed) > 100:
            raise ValueError("Admin password must be between 6 and 100 characters")
        return trimmed


class UniversityUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    status: Optional[str] = None


class UniversityResponse(BaseModel):
    id: int
    name: str
    email: str
    status: str
    contract_address: Optional[str] = None
    created_at: Optional[datetime] = None
    student_count: Optional[int] = 0

    class Config:
        from_attributes = True
