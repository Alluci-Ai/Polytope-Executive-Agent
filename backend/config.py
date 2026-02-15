
import os
import sys
import logging
from typing import List
from pydantic_settings import BaseSettings
from pydantic import ValidationError, field_validator, ValidationInfo

# Setup simplified logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("PolytopeConfig")

class Settings(BaseSettings):
    # Security
    POLYTOPE_MASTER_KEY: str
    GEMINI_API_KEY: str
    OPENAI_API_KEY: str
    ANTHROPIC_API_KEY: str
    
    # Network
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Execution Limits
    MAX_AUTONOMY_RETRIES: int = 3
    CRITIC_THRESHOLD: float = 0.8

    @field_validator("POLYTOPE_MASTER_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY")
    @classmethod
    def check_not_empty(cls, v: str, info: ValidationInfo) -> str:
        if not v or not v.strip():
            raise ValueError(f"{info.field_name} cannot be empty.")
        if "PLACEHOLDER" in v:
             raise ValueError(f"{info.field_name} contains placeholder text. Please update your configuration.")
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True

def load_settings() -> Settings:
    try:
        settings = Settings()
        return settings
    except ValidationError as e:
        logger.critical("--- [ FATAL ] CONFIGURATION ERROR ---")
        logger.critical("The Polytope Daemon cannot start due to missing or invalid security keys.")
        logger.critical(f"Details: {e}")
        logger.critical("Please set POLYTOPE_MASTER_KEY, GEMINI_API_KEY, OPENAI_API_KEY, and ANTHROPIC_API_KEY in your environment.")
        sys.exit(1)
