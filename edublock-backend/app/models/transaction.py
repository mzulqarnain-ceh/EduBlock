from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class TransactionType(str, enum.Enum):
    MINT = "mint"
    DEPLOY = "deploy"
    REVOKE = "revoke"


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    tx_hash = Column(String(255), unique=True, nullable=True, index=True)
    type = Column(SQLEnum(TransactionType), nullable=False)
    degree_id = Column(Integer, ForeignKey("degrees.id"), nullable=True)
    from_address = Column(String(255), nullable=True)
    to_address = Column(String(255), nullable=True)
    gas_used = Column(Integer, nullable=True)
    gas_fee_eth = Column(Float, nullable=True)
    status = Column(SQLEnum(TransactionStatus), nullable=False, default=TransactionStatus.PENDING)
    block_number = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    degree = relationship("Degree", back_populates="transactions")
