"""Pydantic schemas for ML worker public API."""

from pydantic import BaseModel, Field


class EmbeddingRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=100)
    model: str | None = None


class EmbeddingItem(BaseModel):
    index: int
    vector: list[float]


class EmbeddingResponse(BaseModel):
    model: str
    items: list[EmbeddingItem]


class GradeRequest(BaseModel):
    submission_id: str
    exam_id: str
    answers: dict[str, str]


class GradeResponse(BaseModel):
    score: float
    feedback: str
    confidence: float
