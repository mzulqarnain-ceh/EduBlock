from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = None


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "student"
    university_id: Optional[int] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
