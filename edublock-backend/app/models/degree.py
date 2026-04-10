from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class DegreeStatus(str, enum.Enum):
    PENDING = "pending"
    ISSUED = "issued"
    REVOKED = "revoked"


class Degree(Base):
    __tablename__ = "degrees"

    id = Column(Integer, primary_key=True, index=True)
    student_name = Column(String(255), nullable=False)
    student_id = Column(String(100), nullable=False, index=True)
    registration_no = Column(String(100), nullable=True)
    degree_name = Column(String(255), nullable=False)
    grade = Column(String(50), nullable=True)
    issue_date = Column(String(50), nullable=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    issued_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Blockchain fields
    ipfs_hash = Column(String(255), nullable=True)
    token_id = Column(Integer, unique=True, nullable=True, index=True)
    tx_hash = Column(String(255), nullable=True, index=True)
    blockchain_hash = Column(String(255), nullable=True)

    # QR & Status
    qr_code_data = Column(Text, nullable=True)
    status = Column(SQLEnum(DegreeStatus), nullable=False, default=DegreeStatus.PENDING)
    revoke_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    university = relationship("University", back_populates="degrees")
    issued_by_user = relationship("User", back_populates="issued_degrees", foreign_keys=[issued_by])
    transactions = relationship("Transaction", back_populates="degree")
