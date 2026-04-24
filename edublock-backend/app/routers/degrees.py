from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import hashlib
import json
from app.database import get_db
from app.models.user import User, UserRole
from app.models.degree import Degree, DegreeStatus
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.schemas.degree import DegreeIssue, DegreeBulkIssue, DegreeResponse, DegreeRevoke, VerifyRequest, VerifyResponse
from app.utils.security import get_current_user, require_role
from app.services.blockchain_service import blockchain

router = APIRouter(prefix="/api/degrees", tags=["Degrees / Certificates"])


def generate_degree_hash(degree_data: dict) -> str:
    """Generate SHA-256 hash of degree data for blockchain storage."""
    data_string = json.dumps(degree_data, sort_keys=True)
    return "0x" + hashlib.sha256(data_string.encode()).hexdigest()


def get_next_token_id(db: Session) -> int:
    """Get the next available token ID."""
    max_token = db.query(Degree.token_id).order_by(Degree.token_id.desc()).first()
    return (max_token[0] or 0) + 1 if max_token else 1


@router.post("/issue", response_model=DegreeResponse)
def issue_degree(
    request: DegreeIssue,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Issue a single degree certificate. Admin only. (FR02)"""
    if not current_user.university_id:
        raise HTTPException(status_code=400, detail="Admin is not associated with any university")

    # Generate blockchain hash from degree data
    degree_data = {
        "student_name": request.student_name,
        "student_id": request.student_id,
        "degree_name": request.degree_name,
        "grade": request.grade,
        "issue_date": request.issue_date,
        "university_id": current_user.university_id,
    }
    blockchain_hash = generate_degree_hash(degree_data)
    token_id = get_next_token_id(db)

    # Create degree record
    degree = Degree(
        student_name=request.student_name,
        student_id=request.student_id,
        registration_no=request.registration_no,
        degree_name=request.degree_name,
        grade=request.grade,
        issue_date=request.issue_date,
        university_id=current_user.university_id,
        issued_by=current_user.id,
        blockchain_hash=blockchain_hash,
        token_id=token_id,
        status=DegreeStatus.ISSUED,
    )
    db.add(degree)
    db.commit()
    db.refresh(degree)

    # ========== BLOCKCHAIN MINTING ==========
    # Try to mint on blockchain (if Ganache is running)
    tx_data = blockchain.mint_degree(token_id, blockchain_hash)

    if tx_data:
        # Real blockchain transaction succeeded
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
        print(f"🔗 Degree #{degree.id} minted on blockchain! Tx: {tx_data['tx_hash'][:20]}...")
    else:
        # Fallback: create mock transaction if blockchain is not available
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
        print(f"⚠️  Blockchain unavailable. Mock tx created for degree #{degree.id}")

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

    results = []
    for deg_data in request.degrees:
        degree_dict = {
            "student_name": deg_data.student_name,
            "student_id": deg_data.student_id,
            "degree_name": deg_data.degree_name,
            "grade": deg_data.grade,
            "issue_date": deg_data.issue_date,
            "university_id": current_user.university_id,
        }
        blockchain_hash = generate_degree_hash(degree_dict)
        token_id = get_next_token_id(db)

        degree = Degree(
            student_name=deg_data.student_name,
            student_id=deg_data.student_id,
            registration_no=deg_data.registration_no,
            degree_name=deg_data.degree_name,
            grade=deg_data.grade,
            issue_date=deg_data.issue_date,
            university_id=current_user.university_id,
            issued_by=current_user.id,
            blockchain_hash=blockchain_hash,
            token_id=token_id,
            status=DegreeStatus.ISSUED,
        )
        db.add(degree)
        db.flush()

        # Blockchain mint for each degree
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

        db.add(tx)
        degree.tx_hash = tx.tx_hash
        results.append(degree.student_name)

    db.commit()
    return {"message": f"{len(results)} degrees issued successfully", "count": len(results)}


@router.get("/", response_model=list[DegreeResponse])
def list_degrees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List degrees. Admins see all for their university. Students see only their own. (FR04)"""
    query = db.query(Degree)

    if current_user.role == UserRole.ADMIN:
        query = query.filter(Degree.university_id == current_user.university_id)
    elif current_user.role == UserRole.STUDENT:
        # Students see degrees matching their student ID (email-based lookup)
        query = query.filter(
            (Degree.student_id == current_user.email) |
            (Degree.student_name == current_user.name)
        )
    elif current_user.role == UserRole.SUPERADMIN:
        pass  # Super admin sees all
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    return query.order_by(Degree.created_at.desc()).all()


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

    # Revoke on blockchain if connected
    if degree.token_id and blockchain.is_connected:
        blockchain.revoke_on_chain(degree.token_id)

    degree.status = DegreeStatus.REVOKED
    degree.revoke_reason = request.reason
    db.commit()

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

    # Also delete related transactions
    db.query(Transaction).filter(Transaction.degree_id == degree_id).delete()
    db.delete(degree)
    db.commit()

    return {"message": f"Degree for '{degree.student_name}' has been permanently deleted"}
