"""Schema cho endpoint gợi ý khoá học (FR-AI-002).

Tên trường trong JSON là camelCase vì hợp đồng đã chốt với ai-gateway (NestJS)
và web — xem ``docs/02-architecture/AI_FEATURES_CONTRACT.md`` mục 1. Đổi tên là
gãy cả ba phía đang làm song song.

Bên trong Python vẫn giữ snake_case cho đồng bộ với các schema còn lại, nên
dùng ``alias_generator`` thay vì đặt tên trường kiểu camelCase. ``populate_by_name``
bật để test viết được bằng tên Python mà route vẫn nhận đúng JSON camelCase.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ReasonCode(StrEnum):
    """Tín hiệu đã quyết định việc chọn khoá này.

    Giá trị VIẾT HOA đúng như hợp đồng: web dùng chính chuỗi này làm khoá i18n
    trong ``locales/vi|en/recommendations.json``, viết thường sẽ hỏng tra cứu.
    """

    SAME_CATEGORY = "SAME_CATEGORY"
    SIMILAR_CONTENT = "SIMILAR_CONTENT"
    NEXT_LEVEL = "NEXT_LEVEL"
    POPULAR = "POPULAR"
    NEW = "NEW"


class _CamelModel(BaseModel):
    """Gốc chung để mọi model dưới đây nói chuyện bằng camelCase."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class EnrolledCourse(_CamelModel):
    """Một khoá người dùng đã ghi danh.

    Chỉ ``courseId`` và ``title`` là bắt buộc; phần còn lại có mặc định vì
    content-service có thể chưa gán chuyên mục hoặc trình độ cho khoá cũ — thiếu
    dữ liệu thì bỏ qua tín hiệu đó, không được làm hỏng cả lượt gợi ý bằng 422.
    """

    course_id: str = Field(min_length=1, max_length=64)
    title: str = Field(default="", max_length=500)
    category_id: str | None = Field(default=None, max_length=64)
    level: int = Field(default=1, ge=0, le=10)
    progress_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    completed: bool = False


class CatalogCourse(_CamelModel):
    """Một khoá đã publish trong danh mục, tức là ứng viên để gợi ý.

    ``createdAt`` không có trong ví dụ của hợp đồng nên để tuỳ chọn: có thì dùng
    làm tín hiệu NEW, không có thì tín hiệu đó bằng 0 chứ không đoán tuổi khoá.
    """

    course_id: str = Field(min_length=1, max_length=64)
    title: str = Field(default="", max_length=500)
    short_description: str | None = Field(default=None, max_length=2000)
    category_id: str | None = Field(default=None, max_length=64)
    level: int = Field(default=1, ge=0, le=10)
    duration_hours: float = Field(default=0.0, ge=0.0)
    price: float = Field(default=0.0, ge=0.0)
    enrollments: int = Field(default=0, ge=0)
    created_at: datetime | None = None


class RecommendCoursesRequest(_CamelModel):
    """Toàn bộ dữ liệu để xếp hạng nằm trong request.

    ml-worker không tự gọi content-service: ai-gateway đã có sẵn catalog và danh
    sách ghi danh, truyền thẳng vào đây thì lượt gợi ý không phụ thuộc thêm một
    service nào nữa và test chạy được hoàn toàn offline.
    """

    user_id: str = Field(min_length=1, max_length=64)
    limit: int = Field(default=6, ge=1, le=50)
    enrolled: list[EnrolledCourse] = Field(default_factory=list)
    catalog: list[CatalogCourse] = Field(default_factory=list)


class RecommendationItem(_CamelModel):
    """Một khoá được gợi ý, kèm điểm và lý do đọc được cho người dùng."""

    course_id: str
    score: float = Field(ge=0.0, le=1.0, description="0..1, càng cao càng hợp")
    reason: str = Field(description="Câu tiếng Việt hiển thị thẳng cho người học")
    reason_code: ReasonCode = Field(description="Tín hiệu chiếm trọng số lớn nhất")


class RecommendCoursesResponse(_CamelModel):
    """Danh mục rỗng hoặc đã học hết thì ``items`` rỗng — đó là kết quả hợp lệ."""

    items: list[RecommendationItem] = Field(default_factory=list)
    strategy: str = Field(default="embedding+rules")
