"""Schema cho endpoint RAG."""

from __future__ import annotations

from pydantic import BaseModel, Field


class RetrievedSource(BaseModel):
    """Một đoạn học liệu đã truy xuất, kèm điểm tương đồng."""

    doc_id: str = Field(description="Tài liệu nguồn")
    chunk_id: str = Field(description="Khoá đoạn văn trong tài liệu")
    title: str = Field(description="Tiêu đề tài liệu, dùng khi trích dẫn")
    score: float = Field(description="Cosine similarity, càng cao càng gần")
    excerpt: str = Field(description="Trích đoạn ngắn để người đọc đối chiếu")


class TokenUsage(BaseModel):
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = Field(
        default=None,
        description=(
            "Gồm cả token suy luận ẩn. KHÔNG bằng prompt + completion với "
            "Gemini — dùng cột này để tính hạn mức."
        ),
    )


class RagQueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    top_k: int | None = Field(default=None, ge=1, le=20)


class RagQueryResponse(BaseModel):
    answer: str
    sources: list[RetrievedSource] = Field(default_factory=list)
    model: str
    usage: TokenUsage = Field(default_factory=TokenUsage)
    latency_ms: int
    grounded: bool = Field(
        description=(
            "True khi câu trả lời dựa trên đoạn văn truy xuất được. False khi "
            "corpus không chứa thông tin và mô hình đã từ chối trả lời."
        )
    )


class IngestResponse(BaseModel):
    documents: int
    chunks: int
    collection: str
    total_rows: int
