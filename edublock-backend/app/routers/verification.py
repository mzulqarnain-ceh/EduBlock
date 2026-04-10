from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.degree import Degree, DegreeStatus
from app.schemas.degree import VerifyRequest, VerifyResponse, DegreeResponse

router = APIRouter(prefix="/api/verify", tags=["Verification"])


@router.post("/", response_model=VerifyResponse)
def verify_degree(request: VerifyRequest, db: Session = Depends(get_db)):
    """
    Verify a degree by token_id, certificate_id (student ID), or tx_hash.
    No authentication required — public endpoint. (FR03)
    """
    degree = None

    if request.token_id:
        degree = db.query(Degree).filter(Degree.token_id == request.token_id).first()
    elif request.certificate_id:
        degree = db.query(Degree).filter(Degree.student_id == request.certificate_id).first()
    elif request.tx_hash:
        degree = db.query(Degree).filter(Degree.tx_hash == request.tx_hash).first()
    else:
        raise HTTPException(status_code=400, detail="Provide token_id, certificate_id, or tx_hash")

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
            degree=DegreeResponse.model_validate(degree),
        )

    return VerifyResponse(
        verified=True,
        status="verified",
        message="✅ This degree is authentic and verified on the blockchain.",
        degree=DegreeResponse.model_validate(degree),
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
            degree=DegreeResponse.model_validate(degree),
        )

    return VerifyResponse(
        verified=True,
        status="verified",
        message="✅ This degree is authentic and verified on the blockchain.",
        degree=DegreeResponse.model_validate(degree),
    )
