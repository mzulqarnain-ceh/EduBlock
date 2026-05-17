from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class AuditAction(str, enum.Enum):
    CERTIFICATE_ISSUED = "certificate_issued"
    CERTIFICATE_REVOKED = "certificate_revoked"
    CERTIFICATE_DELETED = "certificate_deleted"
    CERTIFICATE_STATUS_CHANGED = "certificate_status_changed"
    USER_CREATED = "user_created"
    USER_DELETED = "user_deleted"
    USER_STATUS_CHANGED = "user_status_changed"
    UNIVERSITY_CREATED = "university_created"
    UNIVERSITY_DELETED = "university_deleted"
    UNIVERSITY_STATUS_CHANGED = "university_status_changed"
    LOGIN = "login"
    BULK_ISSUE = "bulk_issue"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_name = Column(String(255), nullable=True)
    user_role = Column(String(50), nullable=True)
    target_type = Column(String(100), nullable=True)  # e.g., "degree", "user", "university"
    target_id = Column(Integer, nullable=True)
    target_name = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", backref="audit_logs")
