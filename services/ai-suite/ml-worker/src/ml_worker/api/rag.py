"""Route cho tầng RAG."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from ioes_common import get_logger

from ml_worker.core.config import get_settings
from ml_worker.db import milvus
from ml_worker.schemas.rag import IngestResponse, RagQueryRequest, RagQueryResponse
from ml_worker.services import ingest as ingest_service
from ml_worker.services import rag as rag_service
from ml_worker.services.llm import LlmNotConfiguredError

logger = get_logger(__name__)

router = APIRouter(prefix="/v1/rag", tags=["rag"])


@router.post("/query", response_model=RagQueryResponse)
async def query(payload: RagQueryRequest) -> RagQueryResponse:
    """Trả lời câu hỏi dựa trên corpus học liệu.

    Corpus không chứa thông tin thì trả về ``grounded=False`` kèm lời từ chối,
    chứ không đoán bừa.
    """
    try:
        return rag_service.answer(payload.question, payload.top_k)
    except LlmNotConfiguredError as exc:
        logger.error("llm_not_configured", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.post("/ingest", response_model=IngestResponse)
async def ingest() -> IngestResponse:
    """Nạp lại corpus từ ``data/corpus/``.

    Xoá collection cũ trước khi nạp, nên chạy nhiều lần không nhân đôi dữ liệu.
    """
    result = ingest_service.ingest()
    return IngestResponse(**result)  # type: ignore[arg-type]


@router.get("/status")
async def rag_status() -> dict[str, object]:
    """Tình trạng tầng truy xuất, dùng để chẩn đoán nhanh."""
    settings = get_settings()
    return {
        "collection": settings.milvus_collection,
        "exists": milvus.collection_exists(),
        "rows": milvus.count_rows(),
        "llm_provider": settings.llm_provider,
        "top_k": settings.rag_top_k,
        "score_threshold": settings.rag_score_threshold,
    }
