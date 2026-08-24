"""Centralised settings loader.

ADR-008: SINGLE SOURCE OF TRUTH — always loads `.env` from the
MONOREPO ROOT, never from the service cwd.
"""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _find_monorepo_root() -> Path:
    """Find the monorepo root by walking up looking for `.env.example`."""
    cwd = Path.cwd()
    for parent in [cwd, *cwd.parents]:
        if (parent / ".env.example").exists():
            return parent
    return cwd  # fallback


MONOREPO_ROOT = _find_monorepo_root()
ROOT_ENV_FILE = MONOREPO_ROOT / ".env"


class BaseServiceSettings(BaseSettings):
    """Common settings; each service subclasses and adds its own."""

    model_config = SettingsConfigDict(
        env_file=str(ROOT_ENV_FILE) if ROOT_ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Service identity
    service_name: str = "ioes-service"
    service_version: str = "1.0.0"
    environment: str = Field(default="development")

    # Logging
    log_level: str = "INFO"
    log_json: bool = True

    # Tracing
    otlp_endpoint: Optional[str] = None

    # Database (host port 5433 maps to container 5432; see infrastructure/docker-compose.yml)
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5433/db"

    # Cache
    redis_url: str = "redis://localhost:6379/0"

    # Kafka
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_consumer_group: str = "ioes-default"

    # Auth
    # ADR-008: jwt_secret KHÔNG có default fallback.
    # Pydantic sẽ throw ValidationError nếu không có env var JWT_SECRET.
    jwt_secret: str = Field(...)  # required, no default
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # CORS
    cors_origins: List[str] = Field(default_factory=lambda: ["*"])

    # API Gateway
    api_gateway_url: str = "http://api-gateway:8080"

    # Inter-service URLs
    auth_service_url: str = "http://auth-service:9000"
    content_service_url: str = "http://content-service:9001"
    exam_service_url: str = "http://exam-suite:9005"
    analytics_service_url: str = "http://analytics-service:9004"
    notification_service_url: str = "http://notification-service:9009"

    # LLM
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None


@lru_cache
def get_settings() -> BaseServiceSettings:
    return BaseServiceSettings()
