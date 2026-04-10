from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UniversityCreate(BaseModel):
    name: str
    email: EmailStr
    admin_name: Optional[str] = None
    admin_password: Optional[str] = None


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
