from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DegreeIssue(BaseModel):
    student_name: str
    student_id: str
    registration_no: Optional[str] = None
    degree_name: str
    grade: Optional[str] = None
    issue_date: str


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
    university_id: int
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


class VerifyRequest(BaseModel):
    token_id: Optional[int] = None
    certificate_id: Optional[str] = None
    tx_hash: Optional[str] = None


class VerifyResponse(BaseModel):
    verified: bool
    status: str
    message: str
    degree: Optional[DegreeResponse] = None
