"""Route nạp học liệu thật từ content-service (FR-AI-004).

Tách khỏi ``/v1/rag/ingest`` — đó là nạp corpus tĩnh và nó **xoá cả
collection**. Hai việc khác hẳn nhau nên không gộp một endpoint: gọi nhầm sẽ
mất sạch nguồn kia.

Đăng ký router: ``from ml_worker.api.ingest import router as ingest_router``.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from ioes_common import get_logger

from ml_worker.schemas.ingest import IngestContentRequest, IngestContentResponse
from ml_worker.services import ingest as ingest_service
from ml_worker.services.content_client import ContentServiceError

logger = get_logger(__name__)

router = APIRouter(prefix="/v1/ingest", tags=["ingest"])


@router.post("/content", response_model=IngestContentResponse)
async def ingest_content(
    payload: IngestContentRequest | None = None,
) -> IngestContentResponse:
    """Đọc khoá đã publish + chương + bài học, cắt đoạn và nạp vào Milvus.

    Mỗi đoạn mang ``courseId``, ``lessonId``, ``chapterId``, ``title`` và
    ``source="content-service"`` — đúng bộ metadata mà
    ``POST /v1/questions/generate`` dùng để lọc.

    Thân rỗng nghĩa là nạp toàn bộ danh mục. ``courseId`` thu hẹp về một khoá,
    và khoá đó phải đang ``published``; không phải thì 422 chứ không nạp thầm 0
    tài liệu.

    content-service chết hoặc từ chối → 502, để phía gọi phân biệt được sự cố
    hạ tầng với "chưa có học liệu".
    """
    request = payload or IngestContentRequest()

    try:
        result = await ingest_service.ingest_content(request.course_id, replace=request.replace)
    except ContentServiceError as exc:
        logger.error("content_service_unavailable", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    if request.course_id and not result["courses"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"Không có khoá học đã publish với courseId {request.course_id}. "
                "Kiểm tra lại mã khoá, hoặc publish khoá trước khi nạp."
            ),
        )

    return IngestContentResponse(**result)  # type: ignore[arg-type]
