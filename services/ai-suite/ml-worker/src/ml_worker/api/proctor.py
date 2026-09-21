"""Route giám sát thi (FR-AI-006).

Tiền tố ``/internal/ai`` chứ không phải ``/v1``: exam-suite gọi thẳng sang đây
trong mạng nội bộ, không đi qua ai-gateway, và ``HttpProctorClient`` đã ghim
sẵn đường dẫn ``{AI_PROCTOR_URL}/internal/ai/proctor/analyze``.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from ioes_common import get_logger

from ml_worker.schemas.proctor import FrameAnalysisRequest, FrameAnalysisResponse
from ml_worker.services import proctor as proctor_service

logger = get_logger(__name__)

router = APIRouter(prefix="/internal/ai/proctor", tags=["proctor"])


@router.post("/analyze", response_model=FrameAnalysisResponse)
def analyze(payload: FrameAnalysisRequest) -> FrameAnalysisResponse:
    """Đo mức tập trung trên một khung hình webcam.

    Khai báo ``def`` chứ không ``async def`` là có chủ ý: suy luận MediaPipe là
    việc nặng CPU (~9ms/khung), FastAPI sẽ đẩy handler đồng bộ sang threadpool
    thay vì chặn vòng lặp sự kiện. Với nhịp 1 khung/giây/thí sinh (FR-PROC-001),
    hàng chục lượt thi song song vẫn không làm nghẽn các route khác.

    Chỉ trả về những gì đo được trên ảnh. Ngưỡng cảnh báo/gắn cờ (BR-011) và
    quy tắc mất mặt quá 5 giây (FR-PROC-006) thuộc về exam-suite.
    """
    try:
        result = proctor_service.analyze_frame(payload.frame_base64)
    except proctor_service.FrameDecodeError as exc:
        # Ảnh hỏng là lỗi dữ liệu của phía gửi → 400, không phải 500.
        logger.warning(
            "proctor_frame_decode_failed",
            attempt_id=payload.attempt_id,
            sequence_id=payload.sequence_id,
            error=str(exc),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except proctor_service.FaceLandmarkerUnavailableError as exc:
        # Thiếu mô hình là lỗi vận hành. Trả 503 để exam-suite ghi log và bỏ qua
        # khung hình, thay vì trả điểm bịa khiến thí sinh bị gắn cờ oan.
        logger.error("proctor_model_unavailable", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc

    if result.violation_type is not None:
        logger.warning(
            "proctor_violation",
            attempt_id=payload.attempt_id,
            sequence_id=payload.sequence_id,
            violation_type=result.violation_type,
            face_count=result.face_count,
            attention_score=result.attention_score,
        )

    return result
