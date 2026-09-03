"""Route sinh câu hỏi từ học liệu."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from ioes_common import get_logger

from ml_worker.schemas.questions import (
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
)
from ml_worker.services import questions as question_service
from ml_worker.services.llm import LlmNotConfiguredError

logger = get_logger(__name__)

router = APIRouter(prefix="/v1/questions", tags=["questions"])


@router.post("/generate", response_model=GenerateQuestionsResponse)
async def generate(payload: GenerateQuestionsRequest) -> GenerateQuestionsResponse:
    """Soạn câu hỏi kiểm tra từ corpus học liệu.

    Chỉ dùng nội dung truy xuất được, không dùng kiến thức nền của mô hình.
    Học liệu không có gì về chủ đề thì trả ``grounded=False`` với danh sách
    rỗng — đó là **kết quả hợp lệ, không phải lỗi**, nên vẫn trả 200 để phía
    gọi phân biệt được với sự cố hạ tầng.

    ``count`` là trần: đủ căn cứ tới đâu trả tới đó. So ``returned`` với
    ``requested`` để biết học liệu có đáp ứng nổi không.
    """
    try:
        return question_service.generate(payload)
    except LlmNotConfiguredError as exc:
        logger.error("llm_not_configured", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
