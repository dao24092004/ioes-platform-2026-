"""Route sinh câu hỏi từ học liệu."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from ioes_common import get_logger

from ml_worker.core.concurrency import run_heavy
from ml_worker.schemas.questions import (
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
)
from ml_worker.services import questions as question_service
from ml_worker.services.llm import LlmNotConfiguredError
from ml_worker.services.questions import NoScopedMaterialError

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

    Gửi kèm ``courseId``/``lessonId`` (FR-AI-004) thì ngữ cảnh khoá chặt vào
    đúng học liệu đã nạp từ content-service, và mỗi câu trả về mang
    ``sourceLessonId``/``sourceCourseId``. Bộ lọc không khớp học liệu nào →
    **422**, chứ không lui về corpus rồi ra đề sai bài.

    ``run_heavy``: soạn một bộ đề là một lượt sinh cộng hai lượt thẩm định cho
    mỗi câu, toàn bộ đồng bộ — hàng chục giây chặn vòng lặp sự kiện nếu gọi
    thẳng. Xem ``core/concurrency.py``.
    """
    try:
        return await run_heavy(question_service.generate, payload)
    except NoScopedMaterialError as exc:
        logger.info(
            "question_scope_empty",
            course_id=payload.course_id,
            lesson_id=payload.lesson_id,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc
    except LlmNotConfiguredError as exc:
        logger.error("llm_not_configured", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
