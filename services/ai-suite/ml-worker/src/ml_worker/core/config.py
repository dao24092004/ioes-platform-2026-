"""Pydantic settings for ml-worker."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import SettingsConfigDict

from ioes_common.config import BaseServiceSettings


class MLSettings(BaseServiceSettings):
    """ml-worker specific config; inherits DB / Kafka / JWT from
    {@link ioes_common.config.BaseServiceSettings}.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server
    app_host: str = "0.0.0.0"
    app_port: int = 9101

    # Model
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    batch_size: int = Field(default=32, ge=1, le=256)
    max_seq_length: int = Field(default=512, ge=64, le=4096)
    model_device: str = "cpu"  # cpu | cuda

    # Vector store
    milvus_host: str = "localhost"
    milvus_port: int = 19530
    # ADR-008: milvus_user/password — optional trong dev nếu MilIO không set auth
    milvus_user: str = ""
    milvus_password: str = ""
    milvus_database: str = "ioes_ai"

    # LLM
    # ADR-008: openai/azure API keys phải load từ env, không default trong code.
    llm_provider: str = "openai"
    openai_api_key: str = Field(default="")  # set via env OPENAI_API_KEY
    openai_model: str = "gpt-4o"
    azure_openai_endpoint: str = ""
    azure_openai_key: str = ""  # set via env AZURE_OPENAI_KEY
    azure_openai_deployment: str = ""

    # Service URLs (overrides BaseServiceSettings defaults)
    auth_service_url: str = "http://localhost:9000"
    content_service_url: str = "http://localhost:9001"
    exam_service_url: str = "http://localhost:9005"
    api_gateway_url: str = "http://localhost:8080"


@lru_cache
def get_settings() -> MLSettings:
    return MLSettings()
