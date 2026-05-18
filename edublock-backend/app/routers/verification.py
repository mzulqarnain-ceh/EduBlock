from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.degree import Degree, DegreeStatus
from app.schemas.degree import VerifyRequest, VerifyResponse, DegreeResponse
from app.services.blockchain_service import blockchain
from app.utils.security import is_safe_input

router = APIRouter(prefix="/api/verify", tags=["Verification"])


def _degree_to_response(degree: Degree) -> dict:
    """Convert a Degree ORM object to a DegreeResponse dict with university_name."""
    data = DegreeResponse.model_validate(degree).model_dump()
    if degree.university:
        data["university_name"] = degree.university.name
    return data


@router.post("/", response_model=VerifyResponse)
def verify_degree(request: VerifyRequest, db: Session = Depends(get_db)):
    """
    Verify a degree by token_id or tx_hash/blockchain_hash.
    Also checks blockchain for extra validation. No authentication required — public endpoint. (FR03)
    """
    # Security Validation for SQL Injection, XSS and Malicious Input
    if request.tx_hash and not is_safe_input(request.tx_hash):
        raise HTTPException(
            status_code=400,
            detail="Malicious input or invalid format detected in transaction hash."
        )

    degree = None

    if request.token_id:
        degree = db.query(Degree).filter(Degree.token_id == request.token_id).first()
    elif request.tx_hash:
        # Search by tx_hash first, then try blockchain_hash as fallback
        degree = db.query(Degree).filter(Degree.tx_hash == request.tx_hash).first()
        if not degree:
            degree = db.query(Degree).filter(Degree.blockchain_hash == request.tx_hash).first()
    else:
        raise HTTPException(status_code=400, detail="Provide token_id or tx_hash")

    if not degree:
        return VerifyResponse(
            verified=False,
            status="not_found",
            message="No degree found with the provided credentials. This may be a fake certificate.",
            degree=None,
        )

    if degree.status == DegreeStatus.REVOKED:
        return VerifyResponse(
            verified=False,
            status="revoked",
            message=f"This degree has been REVOKED. Reason: {degree.revoke_reason or 'Not specified'}",
            degree=_degree_to_response(degree),
        )

    if degree.status == DegreeStatus.PENDING:
        return VerifyResponse(
            verified=False,
            status="pending",
            message="⏳ This certificate is currently PENDING approval and has not been verified yet.",
            degree=_degree_to_response(degree),
        )

    # ========== BLOCKCHAIN VERIFICATION ==========
    blockchain_status = "database_only"
    blockchain_error = None
    try:
        if degree.blockchain_hash and blockchain.is_connected:
            chain_result = blockchain.verify_on_chain(degree.blockchain_hash)
            if chain_result and chain_result["exists"]:
                if chain_result["is_revoked"]:
                    blockchain_status = "revoked_on_chain"
                else:
                    blockchain_status = "verified_on_chain"
            else:
                blockchain_status = "not_found_on_chain"
    except Exception as e:
        blockchain_status = "blockchain_error"
        blockchain_error = str(e)
        print(f"[Blockchain Verification Error]: {e}")

    status_msg = "✅ This degree is authentic and verified."
    if blockchain_status == "verified_on_chain":
        status_msg += " ⛓️ Confirmed on blockchain."
    elif blockchain_status == "database_only":
        status_msg += " (Database verified, blockchain not available)"
    elif blockchain_status == "blockchain_error":
        status_msg += " (Database verified, blockchain check failed)"

    return VerifyResponse(
        verified=True,
        status="verified",
        message=status_msg,
        degree=_degree_to_response(degree),
    )


@router.get("/{token_id}", response_model=VerifyResponse)
def verify_by_token(token_id: int, db: Session = Depends(get_db)):
    """
    Public verification link — verify by token ID via GET request.
    This is a shareable link (FR05).
    """
    degree = db.query(Degree).filter(Degree.token_id == token_id).first()

    if not degree:
        return VerifyResponse(
            verified=False,
            status="not_found",
            message="No degree found with this Token ID.",
            degree=None,
        )

    if degree.status == DegreeStatus.REVOKED:
        return VerifyResponse(
            verified=False,
            status="revoked",
            message=f"This degree has been REVOKED.",
            degree=_degree_to_response(degree),
        )

    return VerifyResponse(
        verified=True,
        status="verified",
        message="✅ This degree is authentic and verified on the blockchain.",
        degree=_degree_to_response(degree),
    )
