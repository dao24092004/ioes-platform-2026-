"""Route gợi ý khoá học (FR-AI-002)."""

from __future__ import annotations

from fastapi import APIRouter
from ioes_common import get_logger

from ml_worker.schemas.recommendations import (
    RecommendCoursesRequest,
    RecommendCoursesResponse,
)
from ml_worker.services import recommender as recommender_service

logger = get_logger(__name__)

router = APIRouter(prefix="/v1/recommendations", tags=["recommendations"])


@router.post("/courses", response_model=RecommendCoursesResponse)
def recommend_courses(payload: RecommendCoursesRequest) -> RecommendCoursesResponse:
    """Xếp hạng danh mục khoá học cho một người dùng.

    Thuần embedding + luật, **không gọi LLM**, nên không có nhánh 503 vì hết
    quota như ``/v1/rag/query``.

    ``def`` trần chứ không ``async def``: ``_similarity_scores`` chạy
    sentence-transformers trên CPU cho cả danh mục — việc đồng bộ, nặng CPU,
    y hệt MediaPipe bên ``api/proctor.py``. FastAPI đẩy sang threadpool.
    Không cần ``run_heavy`` vì nó có trần thời gian rõ (dưới một giây cho danh
    mục cỡ thật), khác hẳn một lượt sinh lộ trình dài 96 giây.

    Danh mục rỗng hoặc người học đã ghi danh hết thì trả ``items: []`` với HTTP
    200 — đó là **kết quả hợp lệ, không phải lỗi**, để web phân biệt được với sự
    cố hạ tầng và hiện đúng trạng thái "chưa có gợi ý nào".
    """
    return recommender_service.recommend(payload)
