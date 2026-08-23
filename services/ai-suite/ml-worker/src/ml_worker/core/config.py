"""Pydantic settings for ml-worker."""

from functools import lru_cache

from ioes_common.config import BaseServiceSettings
from pydantic import Field
from pydantic_settings import SettingsConfigDict


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
    # Mo hinh truy xuat da ngu, 384 chieu. Xem services/embeddings.py de
    # biet vi sao khong dung paraphrase-multilingual: phan bo diem trong
    # va ngoai pham vi chong lan hoan toan nen mat chot chan chong bia.
    embedding_model: str = "intfloat/multilingual-e5-small"
    batch_size: int = Field(default=32, ge=1, le=256)
    max_seq_length: int = Field(default=512, ge=64, le=4096)
    model_device: str = "cpu"  # cpu | cuda

    # Vector store
    milvus_host: str = "localhost"
    milvus_port: int = 19530
    milvus_user: str = ""
    milvus_password: str = ""
    milvus_database: str = "ioes_ai"
    milvus_collection: str = "course_embeddings"

    # LLM. `mock` khong goi mang, dung cho test va khi chua co API key.
    llm_provider: str = "mock"  # mock | gemini | openai
    llm_temperature: float = Field(default=0.7, ge=0.0, le=2.0)

    # Gemini phoi endpoint tuong thich OpenAI nen dung chung client.
    gemini_api_key: str = ""
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    # flash-lite chu khong phai flash: han muc mien phi cua gemini-3.6-flash
    # chi 20 request/ngay, khong du de vua phat trien vua demo. Dong
    # flash-lite rong hon nhieu va du cho khoi luong cua US-017.
    gemini_model: str = "gemini-3.5-flash-lite"

    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    azure_openai_endpoint: str = ""
    azure_openai_key: str = ""
    azure_openai_deployment: str = ""

    # RAG
    # 8 chu khong phai 4: E5 cho diem gan nhu phang. Do tren corpus nay,
    # 20 ket qua dau chi trai rong 0.008 diem, nen thu hang gan voi nhieu.
    # Cau hoi 'Box model gom nhung lop nao?' co doan dung o hang 7.
    # Cua so rong hon bu lai; muon xep hang that su tot phai them
    # cross-encoder reranker.
    rag_top_k: int = Field(default=8, ge=1, le=20)
    # San loc rac tho, KHONG phai chot chan chong bia. Do thuc te cho thay
    # phan bo diem trong va ngoai pham vi chong lan voi ca hai mo hinh nhung
    # da thu, nen viec phan doan giao cho mo hinh ngon ngu — xem services/rag.py.
    rag_score_threshold: float = Field(default=0.70, ge=-1.0, le=1.0)
    rag_chunk_size: int = Field(default=800, ge=100, le=4000)
    rag_chunk_overlap: int = Field(default=120, ge=0, le=1000)
    # Gemini tinh ca token suy luan an vao tong, nen gioi han thap se cat cut
    # cau tra loi ma khong bao loi. Do thuc te: 17 + 168 nhung tong la 736.
    rag_max_tokens: int = Field(default=1200, ge=256, le=8192)

    # Service URLs (overrides BaseServiceSettings defaults)
    auth_service_url: str = "http://localhost:9000"
    content_service_url: str = "http://localhost:9001"
    exam_service_url: str = "http://localhost:9005"
    api_gateway_url: str = "http://localhost:8080"


@lru_cache
def get_settings() -> MLSettings:
    return MLSettings()
