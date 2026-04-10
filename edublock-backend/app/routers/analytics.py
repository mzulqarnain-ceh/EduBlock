from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.degree import Degree, DegreeStatus
from app.models.transaction import Transaction
from app.models.university import University
from app.utils.security import get_current_user, require_role

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard statistics based on user role."""
    if current_user.role == UserRole.ADMIN:
        # Admin sees stats for their university
        uni_id = current_user.university_id
        total_issued = db.query(Degree).filter(
            Degree.university_id == uni_id,
            Degree.status == DegreeStatus.ISSUED
        ).count()
        total_pending = db.query(Degree).filter(
            Degree.university_id == uni_id,
            Degree.status == DegreeStatus.PENDING
        ).count()
        total_revoked = db.query(Degree).filter(
            Degree.university_id == uni_id,
            Degree.status == DegreeStatus.REVOKED
        ).count()

        return {
            "total_issued": total_issued,
            "total_pending": total_pending,
            "total_revoked": total_revoked,
            "total": total_issued + total_pending + total_revoked,
        }

    elif current_user.role == UserRole.SUPERADMIN:
        # Super admin sees system-wide stats
        total_certs = db.query(Degree).count()
        total_users = db.query(User).count()
        total_universities = db.query(University).count()
        total_transactions = db.query(Transaction).count()

        return {
            "total_certificates": total_certs,
            "total_users": total_users,
            "total_universities": total_universities,
            "total_transactions": total_transactions,
        }

    elif current_user.role == UserRole.STUDENT:
        # Student sees their own stats
        own_degrees = db.query(Degree).filter(
            (Degree.student_id == current_user.email) |
            (Degree.student_name == current_user.name)
        ).count()
        verified = db.query(Degree).filter(
            (Degree.student_id == current_user.email) |
            (Degree.student_name == current_user.name),
            Degree.status == DegreeStatus.ISSUED
        ).count()

        return {
            "total_degrees": own_degrees,
            "verified": verified,
        }

    return {}
