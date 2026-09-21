"""Schema cho endpoint nạp học liệu thật (FR-AI-004).

Tên trường ``courseId`` viết theo hợp đồng ``AI_FEATURES_CONTRACT.md``; bản
snake_case vẫn nhận được nhờ ``populate_by_name`` để script nội bộ khỏi phải
đổi.
"""

from __future__ import annotations

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class IngestContentRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    course_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("courseId", "course_id"),
        serialization_alias="courseId",
        min_length=1,
        max_length=64,
        pattern=r"^[A-Za-z0-9_-]+$",
        description="Chỉ nạp đúng một khoá. Bỏ trống thì nạp mọi khoá đã publish.",
    )
    replace: bool = Field(
        default=True,
        description=(
            "Xoá phần học liệu content-service đã nạp lần trước rồi mới ghi. "
            "Không đụng tới corpus tĩnh."
        ),
    )


class IngestContentResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source: str = Field(description='Luôn là "content-service"')
    course_id: str | None = Field(default=None, serialization_alias="courseId")
    courses: int = Field(description="Số khoá đã đọc được từ content-service")
    documents: int = Field(description="Số bài học có nội dung, đã thành tài liệu")
    chunks: int = Field(description="Số đoạn thực sự ghi vào Milvus")
    collection: str
    total_rows: int = Field(
        serialization_alias="totalRows",
        description="Tổng số đoạn trong collection, gồm cả corpus tĩnh",
    )
