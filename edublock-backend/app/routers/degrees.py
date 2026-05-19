from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from typing import Optional
import hashlib
import json
from datetime import datetime
from app.database import get_db
from app.models.user import User, UserRole
from app.models.degree import Degree, DegreeStatus
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.models.university import University, UniversityStatus # Add this
from app.models.audit_log import AuditAction
from app.schemas.degree import DegreeIssue, DegreeBulkIssue, DegreeResponse, DegreeRevoke, DegreeStatusUpdate, VerifyRequest, VerifyResponse, DegreeBulkDelete, DegreeClaimRequest, DegreeApproveRequest
from app.utils.security import get_current_user, require_role
from app.services.blockchain_service import blockchain
from app.routers.audit import create_audit_log

router = APIRouter(prefix="/api/degrees", tags=["Degrees / Certificates"])


def generate_degree_hash(degree_data: dict) -> str:
    """Generate SHA-256 hash of degree data for blockchain storage."""
    data_string = json.dumps(degree_data, sort_keys=True)
    return "0x" + hashlib.sha256(data_string.encode()).hexdigest()


def get_next_token_id(db: Session) -> int:
    """Get the next available token ID."""
    max_token = db.query(Degree.token_id).filter(Degree.token_id.isnot(None)).order_by(Degree.token_id.desc()).first()
    return (max_token[0] or 0) + 1 if max_token and max_token[0] is not None else 1


def _lookup_student_user(db: Session, registration_no: str, email: str = None) -> Optional[User]:
    """Look up a student user by registration_no or email for proper linking."""
    if registration_no:
        # Case-insensitive lookup for registration_no
        user = db.query(User).filter(
            func.lower(User.registration_no) == registration_no.lower().strip(),
            User.role == UserRole.STUDENT
        ).first()
        if user:
            return user
            
    if email:
        # Case-insensitive lookup for email
        user = db.query(User).filter(
            func.lower(User.email) == email.lower().strip(),
            User.role == UserRole.STUDENT
        ).first()
        if user:
            return user
            
    return None


def check_overlapping_degrees(db: Session, student_name: str, registration_no: str, new_issue_date_str: str, new_duration_years: int):
    """
    1. Enforce unique student name matching for the same registration number.
    2. Prevent overlapping study intervals for the same registration number.
    """
    from datetime import timedelta
    reg_no_clean = registration_no.lower().strip()
    
    # Get all active (non-revoked) degrees for this registration number
    existing_degrees = db.query(Degree).filter(
        func.lower(func.trim(Degree.registration_no)) == reg_no_clean,
        Degree.status != DegreeStatus.REVOKED
    ).all()
    
    if not existing_degrees:
        return
        
    # Rule 1: Enforce same student name check (Identity protection)
    first_existing = existing_degrees[0]
    if first_existing.student_name.lower().strip() != student_name.lower().strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration number '{registration_no}' belongs to student '{first_existing.student_name}'. Cannot issue to '{student_name}'."
        )
        
    # Rule 2: Overlapping study duration check
    try:
        new_end = datetime.strptime(new_issue_date_str.strip(), "%Y-%m-%d")
        new_start = new_end - timedelta(days=float(new_duration_years) * 365.25)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid issue date format. Must be YYYY-MM-DD."
        )
        
    for existing in existing_degrees:
        try:
            exist_end = datetime.strptime(existing.issue_date.strip(), "%Y-%m-%d")
            exist_duration = getattr(existing, 'duration_years', 4) or 4
            exist_start = exist_end - timedelta(days=float(exist_duration) * 365.25)
            
            # Strict Inequality Overlap Formula: A < D and C < B
            if new_start < exist_end and exist_start < new_end:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Student is already enrolled in another active degree ({existing.degree_name}) during this period ({existing.issue_date} with {exist_duration}-year duration). Overlapping degrees are not allowed."
                )
        except ValueError:
            continue


@router.post("/issue", response_model=DegreeResponse)
def issue_degree(
    request: DegreeIssue,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Issue a single degree certificate. Admin only. (FR02)"""
    if not current_user.university_id:
        raise HTTPException(status_code=400, detail="Admin is not associated with any university")

    # Validate required fields
    if not request.student_name or not request.student_name.strip():
        raise HTTPException(status_code=400, detail="Student name is required")
    if not request.registration_no or not request.registration_no.strip():
        raise HTTPException(status_code=400, detail="Registration number is required")
    if not request.degree_name or not request.degree_name.strip():
        raise HTTPException(status_code=400, detail="Degree name is required")
    if not request.issue_date or not request.issue_date.strip():
        raise HTTPException(status_code=400, detail="Issue date is required")

    # Look up student user for proper linking (check registration_no first, then email)
    student_user = _lookup_student_user(db, request.registration_no, request.student_email)
    student_user_id = student_user.id if student_user else None
    
    # Auto-link student user to this university if not already linked
    if student_user and student_user.university_id is None:
        student_user.university_id = current_user.university_id
        db.add(student_user)

    # Overlapping degree check
    check_overlapping_degrees(db, request.student_name, request.registration_no, request.issue_date, request.duration_years)

    # Generate blockchain hash from degree data
    degree_data = {
        "student_name": request.student_name,
        "student_id": request.registration_no, # Maps registration_no to student_id for backwards compat
        "registration_no": request.registration_no,
        "degree_name": request.degree_name,
        "grade": request.grade,
        "issue_date": request.issue_date,
        "university_id": current_user.university_id,
    }
    blockchain_hash = generate_degree_hash(degree_data)

    # --- Prevent Duplicate Degrees ---
    # 1. Check if the exact same degree hash has been issued already
    existing_by_hash = db.query(Degree).filter(Degree.blockchain_hash == blockchain_hash).first()
    if existing_by_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Degree already issued against this record."
        )

    # 2. Check for an active (non-revoked) certificate by student Name, Registration No, and Degree Name
    dup_filters = [
        func.lower(func.trim(Degree.student_name)) == request.student_name.lower().strip(),
        func.lower(func.trim(Degree.degree_name)) == request.degree_name.lower().strip(),
        Degree.university_id == current_user.university_id,
        Degree.status != DegreeStatus.REVOKED,
        func.lower(func.trim(Degree.registration_no)) == request.registration_no.lower().strip()
    ]
    
    existing_degree = db.query(Degree).filter(*dup_filters).first()
    
    if existing_degree:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Degree already issued against this record."
        )

    token_id = get_next_token_id(db)

    # Create degree record
    degree = Degree(
        student_name=request.student_name,
        student_id=request.registration_no,
        registration_no=request.registration_no,
        student_email=request.student_email,
        duration_years=request.duration_years,
        degree_name=request.degree_name,
        grade=request.grade,
        issue_date=request.issue_date,
        university_id=current_user.university_id,
        university_name=current_user.university.name if current_user.university else None,
        issued_by=current_user.id,
        student_user_id=student_user_id,
        blockchain_hash=blockchain_hash,
        token_id=token_id,
        status=DegreeStatus.ISSUED,
    )
    db.add(degree)
    db.commit()
    db.refresh(degree)

    # ========== BLOCKCHAIN MINTING ==========
    try:
        tx_data = blockchain.mint_degree(token_id, blockchain_hash)

        if tx_data:
            tx = Transaction(
                tx_hash=tx_data["tx_hash"],
                type=TransactionType.MINT,
                degree_id=degree.id,
                from_address=tx_data["from_address"],
                status=TransactionStatus.CONFIRMED if tx_data["status"] == "confirmed" else TransactionStatus.FAILED,
                block_number=tx_data["block_number"],
                gas_used=tx_data["gas_used"],
            )
            db.add(tx)
            degree.tx_hash = tx_data["tx_hash"]
            db.commit()
            print(f"[Blockchain Mint]: Degree #{degree.id} minted on blockchain! Tx: {tx_data['tx_hash'][:20]}...")
        else:
            _create_mock_transaction(db, degree, current_user)
    except Exception as e:
        print(f"[Blockchain Mint Error]: {e}")
        _create_mock_transaction(db, degree, current_user)

    # ========== AUDIT LOG ==========
    create_audit_log(
        db=db,
        action=AuditAction.CERTIFICATE_ISSUED,
        user=current_user,
        target_type="degree",
        target_id=degree.id,
        target_name=f"{request.student_name} - {request.degree_name}",
        details=f"Issued to {request.student_name} ({request.registration_no}), Token #{token_id}",
    )
    db.commit()

    # ========== EMAIL NOTIFICATION ==========
    try:
        from app.services.email_service import send_certificate_issued_email
        email_to_use = request.student_email or (student_user.email if student_user else None)
        if email_to_use:
            send_certificate_issued_email(
                student_email=email_to_use,
                student_name=request.student_name,
                degree_name=request.degree_name,
                tx_hash=degree.tx_hash or "",
            )
    except Exception as e:
        print(f"[Email Notification Failed]: {e}")

    return degree


def _create_mock_transaction(db: Session, degree: Degree, current_user: User):
    """Create a mock transaction when blockchain is unavailable."""
    mock_tx_hash = f"0x{hashlib.sha256(str(degree.id).encode()).hexdigest()[:64]}"
    tx = Transaction(
        tx_hash=mock_tx_hash,
        type=TransactionType.MINT,
        degree_id=degree.id,
        from_address=current_user.wallet_address or "0x0000",
        status=TransactionStatus.CONFIRMED,
    )
    db.add(tx)
    degree.tx_hash = mock_tx_hash
    db.commit()
    print(f"[Blockchain Warning]: Blockchain unavailable. Mock tx created for degree #{degree.id}")


@router.post("/claim", response_model=DegreeResponse)
def claim_degree(
    request: DegreeClaimRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    """Allow a registered student to request/claim their degree from a university."""
    if not current_user.registration_no or not current_user.registration_no.strip():
        raise HTTPException(
            status_code=400, 
            detail="Please set your registration number in your profile first before claiming a degree."
        )

    # 1. Fetch university name to ensure it exists
    uni = db.query(University).filter(University.id == request.university_id).first()
    if not uni:
        raise HTTPException(status_code=404, detail="Selected University not found")

    # 2. Check if a pending or active degree with this name already exists for this registration no
    existing = db.query(Degree).filter(
        func.lower(func.trim(Degree.registration_no)) == current_user.registration_no.lower().strip(),
        func.lower(func.trim(Degree.degree_name)) == request.degree_name.lower().strip(),
        Degree.status != DegreeStatus.REVOKED
    ).first()

    if existing:
        if existing.status == DegreeStatus.PENDING:
            raise HTTPException(status_code=400, detail="You have already submitted a pending claim request for this degree.")
        else:
            raise HTTPException(status_code=400, detail="This degree is already issued to you!")

    # 3. Create a PENDING Degree record
    degree = Degree(
        student_name=current_user.name,
        student_id=current_user.registration_no,
        registration_no=current_user.registration_no,
        student_email=current_user.email,
        degree_name=request.degree_name,
        university_id=request.university_id,
        university_name=uni.name,
        student_user_id=current_user.id,
        status=DegreeStatus.PENDING,
        grade="",
        issue_date="",  # Filled later by Admin on issuance
    )

    db.add(degree)
    db.commit()
    db.refresh(degree)

    # 4. Audit Log
    create_audit_log(
        db=db,
        action=AuditAction.CERTIFICATE_ISSUED,
        user=current_user,
        target_type="degree",
        target_id=degree.id,
        target_name=f"{current_user.name} - {request.degree_name}",
        details=f"Student claimed pending degree for {request.degree_name} from {uni.name}",
    )
    db.commit()

    return degree


@router.post("/bulk-issue")
def bulk_issue_degrees(
    request: DegreeBulkIssue,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Bulk issue degrees from CSV data. Admin only. (FR12)"""
    if not current_user.university_id:
        raise HTTPException(status_code=400, detail="Admin is not associated with any university")

    if not request.degrees or len(request.degrees) == 0:
        raise HTTPException(status_code=400, detail="No degrees provided for bulk issue")

    results = []
    errors = []
    duplicate_count = 0

    for idx, deg_data in enumerate(request.degrees):
        try:
            # Look up student for proper linking
            student_user = _lookup_student_user(db, deg_data.registration_no, deg_data.student_email)
            
            # Auto-link student user to this university if not already linked
            if student_user and student_user.university_id is None:
                student_user.university_id = current_user.university_id
                db.add(student_user)

            # Overlapping major degree check (raises HTTPException which we'll catch as Exception)
            try:
                check_overlapping_degrees(db, deg_data.student_name, deg_data.registration_no, deg_data.issue_date, deg_data.duration_years)
            except HTTPException as he:
                raise ValueError(he.detail)

            degree_dict = {
                "student_name": deg_data.student_name,
                "student_id": deg_data.registration_no,
                "registration_no": deg_data.registration_no,
                "degree_name": deg_data.degree_name,
                "grade": deg_data.grade,
                "issue_date": deg_data.issue_date,
                "university_id": current_user.university_id,
                "duration_years": deg_data.duration_years,
            }
            blockchain_hash = generate_degree_hash(degree_dict)

            # --- Prevent Duplicate Degrees ---
            # 1. Check if the exact same degree hash has been issued already
            existing_by_hash = db.query(Degree).filter(Degree.blockchain_hash == blockchain_hash).first()
            if existing_by_hash:
                duplicate_count += 1
                raise ValueError("Degree already issued against this record.")

            # 2. Check for an active (non-revoked) certificate by student Name, Registration No, and Degree Name
            dup_filters = [
                func.lower(func.trim(Degree.student_name)) == deg_data.student_name.lower().strip(),
                func.lower(func.trim(Degree.degree_name)) == deg_data.degree_name.lower().strip(),
                Degree.university_id == current_user.university_id,
                Degree.status != DegreeStatus.REVOKED,
                func.lower(func.trim(Degree.registration_no)) == deg_data.registration_no.lower().strip()
            ]
            
            existing_degree = db.query(Degree).filter(*dup_filters).first()
            
            if existing_degree:
                duplicate_count += 1
                raise ValueError("Degree already issued against this record.")

            token_id = get_next_token_id(db)

            degree = Degree(
                student_name=deg_data.student_name,
                student_id=deg_data.registration_no,
                registration_no=deg_data.registration_no,
                student_email=deg_data.student_email,
                degree_name=deg_data.degree_name,
                grade=deg_data.grade,
                issue_date=deg_data.issue_date,
                duration_years=deg_data.duration_years,
                university_id=current_user.university_id,
                university_name=current_user.university.name if current_user.university else None,
                issued_by=current_user.id,
                student_user_id=student_user.id if student_user else None,
                blockchain_hash=blockchain_hash,
                token_id=token_id,
                status=DegreeStatus.ISSUED,
            )
            db.add(degree)
            db.flush()

            # Blockchain mint
            try:
                tx_data = blockchain.mint_degree(token_id, blockchain_hash)
                if tx_data:
                    tx = Transaction(
                        tx_hash=tx_data["tx_hash"],
                        type=TransactionType.MINT,
                        degree_id=degree.id,
                        from_address=tx_data["from_address"],
                        status=TransactionStatus.CONFIRMED,
                        block_number=tx_data["block_number"],
                        gas_used=tx_data["gas_used"],
                    )
                else:
                    tx = Transaction(
                        tx_hash=f"0x{hashlib.sha256(str(degree.id).encode()).hexdigest()[:64]}",
                        type=TransactionType.MINT,
                        degree_id=degree.id,
                        from_address=current_user.wallet_address or "0x0000",
                        status=TransactionStatus.CONFIRMED,
                    )
            except Exception:
                tx = Transaction(
                    tx_hash=f"0x{hashlib.sha256(str(degree.id).encode()).hexdigest()[:64]}",
                    type=TransactionType.MINT,
                    degree_id=degree.id,
                    from_address=current_user.wallet_address or "0x0000",
                    status=TransactionStatus.CONFIRMED,
                )

            db.add(tx)
            degree.tx_hash = tx.tx_hash
            results.append(degree.student_name)
        except Exception as e:
            errors.append(f"Row {idx + 1} ({deg_data.student_name}): {str(e)}")

    if len(results) == 0:
        # All records were duplicates or failed
        if duplicate_count == len(request.degrees):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All uploaded degrees are duplicates of already issued records."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to issue degrees. Errors: {'; '.join(errors)}"
            )

    # Audit log for bulk issue
    create_audit_log(
        db=db,
        action=AuditAction.BULK_ISSUE,
        user=current_user,
        target_type="degree",
        details=f"Bulk issued {len(results)} certificates. {duplicate_count} duplicates skipped. {len(errors) - duplicate_count} errors.",
    )

    db.commit()

    msg = f"{len(results)} degrees issued successfully."
    if duplicate_count > 0:
        msg += f" {duplicate_count} duplicate certificates were skipped."

    response = {"message": msg, "count": len(results)}
    if errors:
        response["errors"] = errors
    return response


@router.get("/")
def list_degrees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List degrees. Admins see all for their university. Students see only their own. (FR04)"""
    query = db.query(Degree)

    # Get role as uppercase string for robust comparison (handles "STUDENT" or "UserRole.STUDENT")
    role_raw = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    user_role = role_raw.upper().split('.')[-1]

    if user_role == "ADMIN":
        query = query.filter(Degree.university_id == current_user.university_id)
        print(f"DEBUG: Admin {current_user.id} listing degrees for Uni {current_user.university_id}")
    elif user_role == "STUDENT":
        # Build filters dynamically based on available user data
        # Always match by direct student_user_id if available
        filters = [Degree.student_user_id == current_user.id]
        
        user_email = current_user.email.strip().lower() if current_user.email else ""
        user_reg = current_user.registration_no.strip().lower() if current_user.registration_no else ""
        
        # Add email-based matches
        if user_email:
            filters.append(func.lower(func.trim(Degree.student_id)) == user_email)
            filters.append(func.lower(func.trim(Degree.registration_no)) == user_email)
            
        # Add registration number based matches
        if user_reg:
            filters.append(func.lower(func.trim(Degree.student_id)) == user_reg)
            filters.append(func.lower(func.trim(Degree.registration_no)) == user_reg)
            # Only use partial matching if registration number is long enough to be unique
            if len(user_reg) > 3:
                filters.append(Degree.registration_no.ilike(f"%{user_reg}%"))

        print(f"DEBUG: Student {current_user.id} listing degrees with {len(filters)} filter conditions.")
        query = query.filter(or_(*filters))
    elif user_role == "SUPERADMIN":
        print(f"DEBUG: SuperAdmin {current_user.id} listing all degrees")
        pass  # Super admin sees all
    else:
        print(f"DEBUG: Unknown role '{user_role}' for user {current_user.id}")
        raise HTTPException(status_code=403, detail="Access denied")

    degrees = query.order_by(Degree.created_at.desc()).all()
    print(f"DEBUG: Found {len(degrees)} degrees for role {user_role}")

    # Attach university name to each degree
    result = []
    for deg in degrees:
        deg_dict = DegreeResponse.model_validate(deg).model_dump()
        if deg.university:
            deg_dict["university_name"] = deg.university.name
        else:
            deg_dict["university_name"] = deg.university_name or "Unknown University"
        result.append(deg_dict)

    return result


@router.get("/{degree_id}", response_model=DegreeResponse)
def get_degree(
    degree_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single degree details."""
    degree = db.query(Degree).filter(Degree.id == degree_id).first()
    if not degree:
        raise HTTPException(status_code=404, detail="Degree not found")
    return degree


@router.post("/{degree_id}/approve", response_model=DegreeResponse)
def approve_pending_degree(
    degree_id: int,
    request: DegreeApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Approve and officially issue a pending student degree claim. Admin only."""
    if not current_user.university_id:
        raise HTTPException(status_code=400, detail="Admin is not associated with any university")

    # Fetch the pending degree request
    degree = db.query(Degree).filter(
        Degree.id == degree_id,
        Degree.university_id == current_user.university_id
    ).first()

    if not degree:
        raise HTTPException(status_code=404, detail="Pending degree request not found")

    if degree.status != DegreeStatus.PENDING:
        raise HTTPException(status_code=400, detail="This degree is not in PENDING status")

    # Validate grade and issue date
    if not request.grade or not request.grade.strip():
        raise HTTPException(status_code=400, detail="Grade/CGPA is required for approval")
    if not request.issue_date or not request.issue_date.strip():
        raise HTTPException(status_code=400, detail="Issue date is required for approval")

    # Overlapping degree check
    check_overlapping_degrees(db, degree.student_name, degree.registration_no, request.issue_date, request.duration_years)

    # Generate blockchain hash from degree data
    degree_data = {
        "student_name": degree.student_name,
        "student_id": degree.registration_no,
        "registration_no": degree.registration_no,
        "degree_name": degree.degree_name,
        "grade": request.grade,
        "issue_date": request.issue_date,
        "university_id": current_user.university_id,
    }
    blockchain_hash = generate_degree_hash(degree_data)

    # Prevent duplicates
    existing_by_hash = db.query(Degree).filter(Degree.blockchain_hash == blockchain_hash).first()
    if existing_by_hash:
        raise HTTPException(status_code=400, detail="Degree already issued against this record.")

    # Assign details and approve
    token_id = get_next_token_id(db)
    degree.grade = request.grade
    degree.issue_date = request.issue_date
    degree.duration_years = request.duration_years
    degree.blockchain_hash = blockchain_hash
    degree.token_id = token_id
    degree.status = DegreeStatus.ISSUED
    degree.issued_by = current_user.id

    db.commit()
    db.refresh(degree)

    # ========== BLOCKCHAIN MINTING ==========
    try:
        tx_data = blockchain.mint_degree(token_id, blockchain_hash)
        if tx_data:
            tx = Transaction(
                tx_hash=tx_data["tx_hash"],
                type=TransactionType.MINT,
                degree_id=degree.id,
                from_address=tx_data["from_address"],
                status=TransactionStatus.CONFIRMED if tx_data["status"] == "confirmed" else TransactionStatus.FAILED,
                block_number=tx_data["block_number"],
                gas_used=tx_data["gas_used"],
            )
            db.add(tx)
            degree.tx_hash = tx_data["tx_hash"]
            db.commit()
        else:
            _create_mock_transaction(db, degree, current_user)
    except Exception as e:
        print(f"[Blockchain Warning] Blockchain approval minting error: {e}")
        _create_mock_transaction(db, degree, current_user)

    # ========== AUDIT LOG ==========
    create_audit_log(
        db=db,
        action=AuditAction.CERTIFICATE_ISSUED,
        user=current_user,
        target_type="degree",
        target_id=degree.id,
        target_name=f"{degree.student_name} - {degree.degree_name}",
        details=f"Approved pending claim and issued to {degree.student_name} ({degree.registration_no}), Token #{token_id}",
    )
    db.commit()

    # ========== EMAIL NOTIFICATION ==========
    try:
        from app.services.email_service import send_certificate_issued_email
        email_to_use = degree.student_email
        if email_to_use:
            send_certificate_issued_email(
                student_email=email_to_use,
                student_name=degree.student_name,
                degree_name=degree.degree_name,
                tx_hash=degree.tx_hash or "",
            )
    except Exception as e:
        print(f"[Email Notification Failed on Approval]: {e}")

    return degree


@router.put("/{degree_id}/status")
def update_degree_status(
    degree_id: int,
    request: DegreeStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    """Change certificate status (Issued/Pending/Revoked). Admin/SuperAdmin only."""
    degree = db.query(Degree).filter(Degree.id == degree_id).first()
    if not degree:
        raise HTTPException(status_code=404, detail="Degree not found")

    # Validate status
    valid_statuses = {"issued": DegreeStatus.ISSUED, "pending": DegreeStatus.PENDING, "revoked": DegreeStatus.REVOKED}
    new_status = valid_statuses.get(request.status.lower())
    if not new_status:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {list(valid_statuses.keys())}")

    old_status = degree.status.value
    degree.status = new_status

    # Clear revoke reason if changing back from revoked
    if new_status != DegreeStatus.REVOKED:
        degree.revoke_reason = None

    # Commit status change FIRST (so it always works)
    db.commit()

    # Then try audit log separately
    try:
        create_audit_log(
            db=db,
            action=AuditAction.CERTIFICATE_STATUS_CHANGED,
            user=current_user,
            target_type="degree",
            target_id=degree.id,
            target_name=f"{degree.student_name} - {degree.degree_name}",
            details=f"Status changed from '{old_status}' to '{request.status.lower()}'",
        )
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Audit Log Error]: Audit log failed for status change: {e}")

    return {"message": f"Certificate status changed from '{old_status}' to '{request.status.lower()}'"}


@router.post("/{degree_id}/revoke")
def revoke_degree(
    degree_id: int,
    request: DegreeRevoke,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    """Revoke a degree. Admin/SuperAdmin only."""
    degree = db.query(Degree).filter(Degree.id == degree_id).first()
    if not degree:
        raise HTTPException(status_code=404, detail="Degree not found")

    if degree.status == DegreeStatus.REVOKED:
        raise HTTPException(status_code=400, detail="Degree is already revoked")

    # Revoke on blockchain if connected
    try:
        if degree.token_id and blockchain.is_connected:
            blockchain.revoke_on_chain(degree.token_id)
    except Exception as e:
        print(f"[Blockchain Revoke Failed]: {e}")

    degree.status = DegreeStatus.REVOKED
    degree.revoke_reason = request.reason

    # Audit log
    create_audit_log(
        db=db,
        action=AuditAction.CERTIFICATE_REVOKED,
        user=current_user,
        target_type="degree",
        target_id=degree.id,
        target_name=f"{degree.student_name} - {degree.degree_name}",
        details=f"Reason: {request.reason}",
    )

    db.commit()

    # Email notification
    try:
        from app.services.email_service import send_certificate_revoked_email
        send_certificate_revoked_email(
            student_email=degree.student_id,
            student_name=degree.student_name,
            degree_name=degree.degree_name,
            reason=request.reason,
        )
    except Exception as e:
        print(f"[Email Notification Failed]: {e}")

    return {"message": f"Degree for '{degree.student_name}' has been revoked"}


@router.delete("/{degree_id}")
def delete_degree(
    degree_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    """Permanently delete a degree. Admin/SuperAdmin only."""
    degree = db.query(Degree).filter(Degree.id == degree_id).first()
    if not degree:
        raise HTTPException(status_code=404, detail="Degree not found")

    student_name = degree.student_name
    degree_name = degree.degree_name

    # Audit log (before deletion)
    create_audit_log(
        db=db,
        action=AuditAction.CERTIFICATE_DELETED,
        user=current_user,
        target_type="degree",
        target_id=degree.id,
        target_name=f"{student_name} - {degree_name}",
        details=f"Permanently deleted certificate for {student_name}",
    )

    # Delete related transactions
    db.query(Transaction).filter(Transaction.degree_id == degree_id).delete()
    db.delete(degree)
    db.commit()

    return {"message": f"Degree for '{student_name}' has been permanently deleted"}


@router.post("/bulk-delete")
def bulk_delete_degrees(
    request: DegreeBulkDelete,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
):
    """Permanently delete multiple degrees in bulk. Admin/SuperAdmin only."""
    if not request.degree_ids:
        raise HTTPException(status_code=400, detail="No degree IDs provided for deletion")

    # Fetch degrees that match the IDs and belong to the admin's university (if not superadmin)
    query = db.query(Degree).filter(Degree.id.in_(request.degree_ids))
    if current_user.role != UserRole.SUPERADMIN:
        query = query.filter(Degree.university_id == current_user.university_id)

    degrees_to_delete = query.all()
    if not degrees_to_delete:
        raise HTTPException(status_code=404, detail="No matching degrees found for deletion")

    deleted_names = []
    deleted_ids = [d.id for d in degrees_to_delete]

    # Delete associated transactions
    db.query(Transaction).filter(Transaction.degree_id.in_(deleted_ids)).delete(synchronize_session=False)

    for degree in degrees_to_delete:
        deleted_names.append(degree.student_name)
        # Create audit log for each deletion
        create_audit_log(
            db=db,
            action=AuditAction.CERTIFICATE_DELETED,
            user=current_user,
            target_type="degree",
            target_id=degree.id,
            target_name=f"{degree.student_name} - {degree.degree_name}",
            details=f"Permanently deleted certificate for {degree.student_name} via bulk delete",
        )
        db.delete(degree)

    db.commit()

    return {
        "message": f"Successfully deleted {len(deleted_ids)} certificates.",
        "deleted_count": len(deleted_ids),
        "deleted_names": deleted_names
    }
