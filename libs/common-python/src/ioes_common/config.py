"""Centralised settings loader."""

from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseServiceSettings(BaseSettings):
    """Common settings; each service subclasses and adds its own."""

    model_config = SettingsConfigDict(
        env_file=".env",
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

    # Database
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/db"

    # Cache
    redis_url: str = "redis://localhost:6379/0"

    # Kafka
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_consumer_group: str = "ioes-default"

    # Auth
    jwt_secret: str = "ioes-jwt-secret-key-must-be-at-least-256-bits-long"
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
