from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    university_id: Optional[int] = None
    wallet_address: Optional[str] = None
    status: str
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
    status: str  # active, inactive, suspended
