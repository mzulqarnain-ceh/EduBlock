from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    university_id: Optional[int] = None
    university_name: Optional[str] = None
    wallet_address: Optional[str] = None
    status: str
    profile_image: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "student"
    university_id: Optional[int] = None


class UserStatusUpdate(BaseModel):
    status: str  # active, inactive, suspended, pending


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class PreferencesUpdate(BaseModel):
    preferences: dict


class UserProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
