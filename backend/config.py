import os
import sys
import logging
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

# Setup structured logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("PolytopeConfig")

class Settings(BaseSettings):
    # Deployment Environment
    APP_ENV: str = "development"  # development, production, local_sovereign
    
    # Security & Sovereignty
    POLYTOPE_MASTER_KEY: str
    VERUS_ID_IDENTITY: Optional[str] = None
    VERUS_ID_PRIVATE_KEY: Optional[str] = None
    
    # Model Providers
    GEMINI_API_KEY: str
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # Network
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Execution Governance
    MAX_AUTONOMY_RETRIES: int = 3
    CRITIC_THRESHOLD: float = 0.75
    MAX_CONCURRENT_TASKS: int = 5

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("POLYTOPE_MASTER_KEY")
    @classmethod
    def validate_master_key(cls, v: str, info) -> str:
        """Enforces secure key requirements in all environments."""
        if not v or "PLACEHOLDER" in v:
            # Strict enforcement: No auto-generation allowed.
            logger.critical("🚨 FATAL: POLYTOPE_MASTER_KEY must be set in .env or environment variables.")
            sys.exit(1)
        return v

    @field_validator("GEMINI_API_KEY")
    @classmethod
    def validate_api_key(cls, v: str) -> str:
        if not v or "PLACEHOLDER" in v:
            logger.critical("🚨 FATAL: GEMINI_API_KEY is required for the Inference Engine.")
            sys.exit(1)
        return v

def load_settings() -> Settings:
    try:
        return Settings()
    except Exception as e:
        logger.critical(f"Configuration Load Failed: {e}")
        sys.exit(1)
