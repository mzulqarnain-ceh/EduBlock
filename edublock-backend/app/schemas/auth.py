from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequest(BaseModel):
    email: str  # Can be email or registration_no
    password: str
    role: Optional[str] = None


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    registration_no: Optional[str] = None
    password: str
    role: str = "student"
    university_id: Optional[int] = None
    university_name: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
