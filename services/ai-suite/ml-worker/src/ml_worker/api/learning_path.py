"""Route sinh lộ trình học cá nhân hoá (FR-AI-005)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from ioes_common import get_logger

from ml_worker.core.concurrency import run_heavy
from ml_worker.schemas.learning_path import LearningPathRequest, LearningPathResponse
from ml_worker.services.learning_path import orchestrator
from ml_worker.services.learning_path.base import AgentLlmError
from ml_worker.services.llm import LlmNotConfiguredError

logger = get_logger(__name__)

router = APIRouter(prefix="/v1/learning-path", tags=["learning-path"])


@router.post("/generate", response_model=LearningPathResponse)
async def generate(payload: LearningPathRequest) -> LearningPathResponse:
    """Sinh lộ trình học từ mục tiêu, trình độ hiện tại và danh mục khoá.

    Chạy tuần tự năm agent — ``profiler``, ``gap_analyzer``,
    ``curriculum_planner``, ``resource_retriever``, ``validator`` — và trả về
    một dòng ``agentTrace`` cho mỗi agent.

    Danh mục rỗng hoặc không khoá nào hợp mục tiêu thì trả 200 với ``steps``
    rỗng: đó là câu trả lời thật, không phải sự cố.

    Mô hình ngôn ngữ hỏng, hết quota hoặc chưa cấu hình thì trả **503**. Cố ý
    không có đường lui sang lộ trình dựng sẵn: người học không phân biệt được
    lộ trình thật với lộ trình bịa, nên trả về bản giả còn hại hơn báo lỗi.

    ``run_heavy`` chứ không gọi thẳng: chuỗi agent là **96 giây việc đồng bộ**
    (ba lượt ``ChatOpenAI.invoke``, cộng một lượt mở rộng truy vấn cho mỗi
    bước). Gọi thẳng trong ``async def`` thì vòng lặp sự kiện đứng nguyên chừng
    ấy — đo được ``GET /health`` không trả lời suốt 90 giây, và proctoring của
    mọi phòng thi chết theo. Xem ``core/concurrency.py``.
    """
    try:
        return await run_heavy(orchestrator.generate, payload)
    except (AgentLlmError, LlmNotConfiguredError) as exc:
        logger.error(
            "learning_path_llm_unavailable",
            user_id=payload.user_id,
            error=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"Không sinh được lộ trình vì mô hình ngôn ngữ hiện không khả dụng. Chi tiết: {exc}"
            ),
        ) from exc
