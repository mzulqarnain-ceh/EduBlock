from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog, AuditAction
from app.utils.security import get_current_user, require_role

router = APIRouter(prefix="/api/audit", tags=["Audit Logs"])


def create_audit_log(
    db: Session,
    action: AuditAction,
    user: User = None,
    target_type: str = None,
    target_id: int = None,
    target_name: str = None,
    details: str = None,
):
    """Helper function to create an audit log entry."""
    log = AuditLog(
        action=action.value if hasattr(action, 'value') else str(action),
        user_id=user.id if user else None,
        user_name=user.name if user else None,
        user_role=user.role.value if user and hasattr(user.role, 'value') else (str(user.role) if user else None),
        target_type=target_type,
        target_id=target_id,
        target_name=target_name,
        details=details,
    )
    db.add(log)
    # Don't commit here — let the caller commit with their own transaction
    return log


@router.get("/logs")
def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    """Get paginated audit logs. Admin/SuperAdmin only."""
    query = db.query(AuditLog)

    # Filter by action type if provided (now comparing strings)
    if action:
        query = query.filter(AuditLog.action == action)

    # Get role as uppercase string for robust comparison
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role).upper()

    # Admin only sees their own actions
    if user_role == "ADMIN":
        query = query.filter(AuditLog.user_id == current_user.id)

    total = query.count()
    logs = (
        query.order_by(desc(AuditLog.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "user_name": log.user_name or "System",
                "user_role": log.user_role or "",
                "target_type": log.target_type or "",
                "target_id": log.target_id,
                "target_name": log.target_name or "",
                "details": log.details or "",
                "created_at": str(log.created_at) if log.created_at else "",
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }
