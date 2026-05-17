from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.degree import Degree, DegreeStatus
from app.models.transaction import Transaction
from app.models.university import University
from app.utils.security import get_current_user, require_role
from app.models.audit_log import AuditLog
from datetime import datetime, timedelta
from sqlalchemy import extract, desc

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get role as uppercase string for robust comparison
    role_raw = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    user_role = role_raw.upper().split('.')[-1]

    if user_role == "ADMIN":
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

    elif user_role == "SUPERADMIN":
        # Super admin sees system-wide stats
        total_certs = db.query(Degree).count()
        total_users = db.query(User).count()
        total_universities = db.query(University).count()
        total_transactions = db.query(Transaction).count()

        # Monthly Certificates Issued (last 6 months)
        six_months_ago = datetime.now() - timedelta(days=180)
        monthly_stats = db.query(
            extract('month', Degree.created_at).label('month'),
            func.count(Degree.id).label('count')
        ).filter(Degree.created_at >= six_months_ago)\
         .group_by('month')\
         .order_by('month')\
         .all()

        # Convert month number to name
        month_names = {1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun', 
                       7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'}
        formatted_monthly = [{"month": month_names.get(int(m.month), str(m.month)), "count": m.count} for m in monthly_stats]

        # Certificates by University
        uni_stats = db.query(
            University.name,
            func.count(Degree.id).label('count')
        ).outerjoin(Degree, University.id == Degree.university_id)\
         .group_by(University.id)\
         .all()
        
        formatted_uni = [{"name": u.name, "count": u.count} for u in uni_stats]

        # Recent System Activity (last 10 logs)
        recent_logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(10).all()
        formatted_logs = []
        for log in recent_logs:
            # Map action to a readable format and type
            action_map = {
                "certificate_issued": ("Certificate Issued", "success"),
                "certificate_revoked": ("Certificate Revoked", "warning"),
                "user_created": ("User Registered", "info"),
                "university_created": ("University Added", "success"),
                "login": ("User Login", "info")
            }
            display_action, action_type = action_map.get(log.action, (log.action.replace('_', ' ').title(), "info"))
            
            formatted_logs.append({
                "action": display_action,
                "user": log.user_name or log.target_name or "System",
                "time": log.created_at.isoformat(),
                "type": action_type
            })

        return {
            "total_certificates": total_certs,
            "total_users": total_users,
            "total_universities": total_universities,
            "total_transactions": total_transactions,
            "monthly_issued": formatted_monthly,
            "university_issued": formatted_uni,
            "recent_activity": formatted_logs
        }

    elif user_role == "STUDENT":
        # Student sees their own stats (robust cross-matching)
        user_email = current_user.email.strip().lower() if current_user.email else ""
        user_reg = current_user.registration_no.strip().lower() if current_user.registration_no else ""
        user_name = current_user.name.strip().lower() if current_user.name else ""
        
        own_degrees_filter = (
            (Degree.student_user_id == current_user.id) |
            (func.trim(func.lower(Degree.student_id)) == user_email) |
            (func.trim(func.lower(Degree.student_id)) == user_reg) |
            (func.trim(func.lower(Degree.registration_no)) == user_reg) |
            (func.trim(func.lower(Degree.registration_no)) == user_email) |
            (func.trim(func.lower(Degree.student_name)) == user_name)
        )
        
        own_degrees = db.query(Degree).filter(own_degrees_filter).count()
        
        verified = db.query(Degree).filter(
            own_degrees_filter,
            Degree.status == DegreeStatus.ISSUED
        ).count()

        return {
            "total_degrees": own_degrees,
            "verified": verified,
        }

    return {}
