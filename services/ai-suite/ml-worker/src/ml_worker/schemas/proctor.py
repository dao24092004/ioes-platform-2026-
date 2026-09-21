"""Schema cho endpoint giám sát thi (FR-AI-006).

Tên trường ở đây là **hợp đồng cứng** với exam-suite: `HttpProctorClient`
(`services/exam-suite/src/modules/exam-session/services/ai-proctor.client.ts`)
gửi đúng `FrameAnalysisRequest` và đọc đúng `FrameAnalysisResponse`, dạng
camelCase. Vì vậy code Python vẫn viết snake_case cho dễ đọc, còn lớp vỏ JSON
do ``alias_generator=to_camel`` lo — đổi tên trường ở đây là làm hỏng exam-suite.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

# Hướng nhìn quy chiếu theo **khung hình**, không theo người ngồi trước máy:
# LEFT nghĩa là ánh nhìn lệch về mép trái của ảnh. Chốt như vậy để không phải
# đoán xem webcam có bật chế độ soi gương hay không.
GazeDirection = Literal["CENTER", "LEFT", "RIGHT", "UP", "DOWN", "OUT_OF_FRAME"]

# ml-worker CHỈ báo những gì nhìn thấy trên ảnh. `LOW_ATTENTION` cố tình không
# có trong danh sách: ngưỡng BR-011 (<60 cảnh báo, <40 gắn cờ) và FR-PROC-006
# (mất mặt quá 5s) là việc của exam-suite, nó mới giữ trạng thái theo thời gian.
ViolationType = Literal["NO_FACE", "MULTIPLE_FACES", "OFF_SCREEN"]


class _CamelModel(BaseModel):
    """Đọc và ghi JSON theo camelCase, nhưng trong Python vẫn là snake_case."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class FrameAnalysisRequest(_CamelModel):
    """Một khung hình webcam do exam-suite chuyển tiếp."""

    attempt_id: str = Field(min_length=1, description="Lượt thi đang bị giám sát")
    captured_at: datetime = Field(
        description="Thời điểm chụp khung hình, ISO-8601 (exam-suite gửi Date đã tuần tự hoá)"
    )
    frame_base64: str = Field(
        min_length=1,
        description=(
            "Ảnh JPEG/PNG mã hoá base64. Chấp nhận cả tiền tố data-URI "
            "(`data:image/jpeg;base64,...`) vì trình duyệt sinh ra như vậy."
        ),
    )
    sequence_id: int | None = Field(
        default=None,
        ge=0,
        description="Số thứ tự khung hình; hiện chỉ dùng để ghi log, không ảnh hưởng kết quả",
    )


class FrameAnalysisResponse(_CamelModel):
    """Kết quả đo được trên đúng một khung hình.

    Không có trạng thái giữa các khung hình: mỗi lời gọi là độc lập. Mọi suy
    luận cần thời gian (mất mặt liên tục bao lâu, cộng dồn bao nhiêu vi phạm)
    do exam-suite đảm nhiệm.
    """

    face_detected: bool = Field(description="Có ít nhất một khuôn mặt trong khung hình")
    face_count: int = Field(ge=0, description="Số khuôn mặt đếm được (tối đa PROCTOR_MAX_FACES)")
    attention_score: int = Field(
        ge=0,
        le=100,
        description="Điểm tập trung 0–100; công thức và trọng số xem services/proctor.py",
    )
    gaze_direction: GazeDirection = Field(description="Hướng nhìn quy chiếu theo khung hình")
    violation_type: ViolationType | None = Field(
        default=None,
        description="Vi phạm thấy ngay trên khung hình này; None nghĩa là để exam-suite tự quyết",
    )
