from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
import re


class DegreeIssue(BaseModel):
    student_name: str
    student_id: str
    registration_no: Optional[str] = None
    degree_name: str
    grade: Optional[str] = None
    issue_date: str

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

    @field_validator('student_name')
    @classmethod
    def validate_student_name(cls, v):
        trimmed = v.strip() if v else ""
        if not trimmed:
            raise ValueError("Student name cannot be empty")
        if len(trimmed) < 2 or len(trimmed) > 100:
            raise ValueError("Student name must be between 2 and 100 characters")
        
        # Injection scan
        cls._scan_injections(trimmed, "Student Name")
        
        # Only allow letters, spaces, dots, hyphens, and apostrophes
        if not re.match(r"^[a-zA-Z\s.'-]+$", trimmed):
            raise ValueError("Student name must only contain letters, spaces, or dots")
        return trimmed

    @field_validator('student_id')
    @classmethod
    def validate_student_id(cls, v):
        trimmed = v.strip() if v else ""
        if not trimmed:
            raise ValueError("Student ID / Email is required")
        if len(trimmed) < 3 or len(trimmed) > 100:
            raise ValueError("Student ID / Email must be between 3 and 100 characters")
            
        # Injection scan
        cls._scan_injections(trimmed, "Student ID / Email")
        return trimmed

    @field_validator('registration_no')
    @classmethod
    def validate_registration_no(cls, v):
        if v is None:
            return v
        trimmed = v.strip()
        if not trimmed:
            return None
        if len(trimmed) < 3 or len(trimmed) > 50:
            raise ValueError("Registration number must be between 3 and 50 characters")
            
        # Injection scan
        cls._scan_injections(trimmed, "Registration Number")
        
        if not re.match(r"^[a-zA-Z0-9\s/-]+$", trimmed):
            raise ValueError("Registration number must contain only letters, numbers, hyphens, or slashes")
        return trimmed

    @field_validator('degree_name')
    @classmethod
    def validate_degree_name(cls, v):
        trimmed = v.strip() if v else ""
        if not trimmed:
            raise ValueError("Degree name is required")
        if len(trimmed) < 3 or len(trimmed) > 100:
            raise ValueError("Degree name must be between 3 and 100 characters")
            
        # Injection scan
        cls._scan_injections(trimmed, "Degree Name")
        
        if not re.match(r"^[a-zA-Z0-9\s.()'/&-]+$", trimmed):
            raise ValueError("Degree name must contain only letters, numbers, spaces, or standard symbols")
        return trimmed

    @field_validator('grade')
    @classmethod
    def validate_grade(cls, v):
        if v is None:
            return v
        trimmed = v.strip().upper()
        if not trimmed:
            return None
            
        # Injection scan
        cls._scan_injections(trimmed, "Grade / CGPA")

        # Check if numeric CGPA
        if re.match(r"^\d+(\.\d*)?$", trimmed):
            num = float(trimmed)
            if num < 0.0 or num > 4.0:
                raise ValueError("CGPA must be between 0.0 and 4.0")
            if '.' in trimmed:
                decimal_part = trimmed.split('.')[1]
                if len(decimal_part) > 2:
                    raise ValueError("CGPA allows at most 2 decimal places")
            return trimmed
            
        # Check if letter grade
        valid_grades = ['A', 'A+', 'B', 'B+', 'C', 'D', 'F']
        if trimmed not in valid_grades:
            raise ValueError("Grade must be a valid CGPA (0.0 - 4.0) or letter grade (A, A+, B, B+, C, D, F)")
        return trimmed

    @field_validator('issue_date')
    @classmethod
    def validate_issue_date(cls, v):
        trimmed = v.strip() if v else ""
        if not trimmed:
            raise ValueError("Issue date is required")
        try:
            # Parse as YYYY-MM-DD
            dt = datetime.strptime(trimmed, "%Y-%m-%d")
            # Ensure it is not in the future
            if dt.date() > datetime.now().date():
                raise ValueError("Issue date cannot be in the future")
        except ValueError as e:
            if "future" in str(e):
                raise e
            raise ValueError("Issue date must be in YYYY-MM-DD format")
        return trimmed


class DegreeBulkIssue(BaseModel):
    degrees: List[DegreeIssue]


class DegreeResponse(BaseModel):
    id: int
    student_name: str
    student_id: str
    registration_no: Optional[str] = None
    degree_name: str
    grade: Optional[str] = None
    issue_date: str
    university_id: Optional[int] = None
    university_name: Optional[str] = None
    ipfs_hash: Optional[str] = None
    token_id: Optional[int] = None
    tx_hash: Optional[str] = None
    blockchain_hash: Optional[str] = None
    qr_code_data: Optional[str] = None
    status: str
    revoke_reason: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DegreeRevoke(BaseModel):
    reason: str


class DegreeStatusUpdate(BaseModel):
    status: str  # "issued", "pending", "revoked"


class VerifyRequest(BaseModel):
    token_id: Optional[int] = None
    tx_hash: Optional[str] = None


class VerifyResponse(BaseModel):
    verified: bool
    status: str
    message: str
    degree: Optional[DegreeResponse] = None


class DegreeBulkDelete(BaseModel):
    degree_ids: List[int]
