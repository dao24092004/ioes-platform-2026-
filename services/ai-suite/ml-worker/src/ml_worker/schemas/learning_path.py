"""Schema cho endpoint lộ trình cá nhân hoá (FR-AI-005).

Tên trường phơi ra ngoài viết camelCase đúng như hợp đồng
``docs/02-architecture/AI_FEATURES_CONTRACT.md`` mục 2, vì ai-gateway lưu thẳng
cả cục JSON này vào cột ``payload`` của bảng ``learning_paths`` rồi web đọc lại
y nguyên. Đổi tên trường ở đây là làm hỏng dữ liệu đã lưu, không chỉ hỏng một
lượt gọi.

Trong mã Python vẫn viết snake_case; cầu nối là ``alias_generator=to_camel``
cộng ``populate_by_name=True`` — nhận được cả hai lối viết khi đọc, nhưng khi
ghi ra JSON thì FastAPI dùng alias nên luôn là camelCase.

Ngoài các model của hợp đồng, tệp này còn khai mấy model *nội bộ* mà năm agent
chuyền tay nhau (``LearnerProfile``, ``SkillGapReport``, ``DraftPlan``). Chúng
không đi ra ngoài HTTP, nhưng đặt chung ở đây để một chỗ duy nhất định nghĩa
hình dạng dữ liệu của cả chuỗi.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Đọc được cả camelCase lẫn snake_case, ghi ra luôn là camelCase."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---------------------------------------------------------------------------
# Đầu vào
# ---------------------------------------------------------------------------


class CatalogCourse(CamelModel):
    """Một khoá đã publish, do ai-gateway lấy từ content-service gửi sang.

    Đây là **nguồn sự thật duy nhất** về khoá học trong cả lượt sinh lộ trình:
    ml-worker không tự truy vấn content-service, nên khoá nào không nằm trong
    danh sách này thì coi như không tồn tại — agent ``validator`` dựa vào đúng
    tính chất đó để loại khoá do mô hình bịa ra.
    """

    course_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    short_description: str | None = None
    category_id: str | None = None
    level: int = 1
    duration_hours: float = Field(default=0, ge=0)
    price: float = Field(default=0, ge=0)
    enrollments: int = Field(default=0, ge=0)


class EnrolledCourse(CamelModel):
    """Khoá người học đã ghi danh, kèm tiến độ."""

    course_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    category_id: str | None = None
    level: int = 1
    progress_percent: float = Field(default=0, ge=0, le=100)
    completed: bool = False


class LearningPathRequest(CamelModel):
    user_id: str = Field(min_length=1)
    goal: str = Field(min_length=3, max_length=500)
    hours_per_week: float = Field(
        default=8,
        gt=0,
        le=80,
        description="Số giờ học mỗi tuần; dùng để quy tổng giờ ra số tuần.",
    )
    current_skills: list[str] = Field(default_factory=list)
    catalog: list[CatalogCourse] = Field(default_factory=list)
    enrolled: list[EnrolledCourse] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Đầu ra
# ---------------------------------------------------------------------------


class LearningResource(CamelModel):
    """Học liệu truy xuất từ Milvus, gắn kèm một bước."""

    title: str
    doc_id: str


class LearningStep(CamelModel):
    """Một bước trong lộ trình.

    ``course_id`` để ``None`` là hợp lệ: bước tự ôn, tự làm dự án thì không gắn
    khoá nào. Nhưng khi có giá trị thì bắt buộc phải là một khoá trong
    ``catalog`` của yêu cầu — xem ``services/learning_path/validator.py``.
    """

    order: int = Field(ge=1)
    title: str
    objective: str
    course_id: str | None = None
    estimated_hours: float = Field(ge=0)
    skills: list[str] = Field(default_factory=list)
    resources: list[LearningResource] = Field(default_factory=list)


class AgentTraceEntry(CamelModel):
    """Một dòng nhật ký của một agent trong chuỗi.

    Không phải để trang trí: khi lộ trình ra kết quả lạ, đây là chỗ duy nhất
    cho biết agent nào làm hỏng và nó mất bao lâu.
    """

    agent: str
    summary: str
    elapsed_ms: int = Field(ge=0)


class LearningPathResponse(CamelModel):
    goal: str
    summary: str
    total_estimated_hours: float = Field(ge=0)
    weeks: int = Field(ge=0)
    steps: list[LearningStep] = Field(default_factory=list)
    agent_trace: list[AgentTraceEntry] = Field(default_factory=list)
    model: str
    generated_at: datetime


# ---------------------------------------------------------------------------
# Dữ liệu nội bộ giữa các agent (không phơi qua HTTP)
# ---------------------------------------------------------------------------


class LearnerProfile(BaseModel):
    """Kết quả agent 1 — ``profiler``."""

    level: str = Field(default="beginner", description="beginner | intermediate | advanced")
    strengths: list[str] = Field(default_factory=list)
    summary: str = ""


class SkillGapReport(BaseModel):
    """Kết quả agent 2 — ``gap_analyzer``.

    ``missing_skills`` xếp theo thứ tự nên học trước - học sau, vì agent 3 dùng
    đúng thứ tự đó làm gợi ý sắp xếp bước.
    """

    missing_skills: list[str] = Field(default_factory=list)
    summary: str = ""


class PlannedStep(BaseModel):
    """Một bước do agent 3 đề xuất, CHƯA qua kiểm chứng.

    Khác ``LearningStep`` ở chỗ chưa có ``order`` chuẩn hoá, chưa có học liệu,
    và ``course_id`` có thể là khoá mô hình bịa ra.
    """

    title: str = ""
    objective: str = ""
    course_id: str | None = None
    estimated_hours: float = 0
    skills: list[str] = Field(default_factory=list)


class DraftPlan(BaseModel):
    """Kết quả agent 3 — ``curriculum_planner``."""

    summary: str = ""
    steps: list[PlannedStep] = Field(default_factory=list)
