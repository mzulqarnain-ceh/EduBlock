from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/edublock"

    # JWT
    SECRET_KEY: str = "edublock-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Blockchain
    BLOCKCHAIN_RPC_URL: str = "http://127.0.0.1:8545"
    CONTRACT_ADDRESS: str = ""
    DEPLOYER_PRIVATE_KEY: str = ""

    # IPFS (Pinata)
    PINATA_API_KEY: str = ""
    PINATA_SECRET_KEY: str = ""

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # App
    APP_NAME: str = "EduBlock"
    APP_VERSION: str = "1.0.0"
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
