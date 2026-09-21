"""Schema cho endpoint sinh câu hỏi.

Giá trị enum viết thường, khớp đúng ``libs/common-node/src/events/question-types.ts``
và PostgreSQL ENUM bên exam-suite. Viết hoa sẽ làm INSERT fail khi giảng viên
lưu câu hỏi vào ngân hàng đề.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from ml_worker.schemas.rag import RetrievedSource, TokenUsage

#: Id của khoá/bài đi thẳng vào biểu thức lọc của Milvus, nên chỉ cho phép ký
#: tự an toàn. UUID lọt hết; dấu nháy thì không — đó là đường tiêm biểu thức.
_ID_PATTERN = r"^[A-Za-z0-9_-]+$"


class QuestionType(StrEnum):
    MULTIPLE_CHOICE = "multiple_choice"
    MULTIPLE_SELECT = "multiple_select"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"


class Difficulty(StrEnum):
    VERY_EASY = "very_easy"
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    VERY_HARD = "very_hard"


class GenerateQuestionsRequest(BaseModel):
    """Yêu cầu sinh câu hỏi.

    ``courseId``/``lessonId`` (FR-AI-004) thu hẹp ngữ cảnh về đúng học liệu
    thật đã nạp từ content-service. Bỏ trống cả hai thì hành vi y như cũ: truy
    xuất trên toàn bộ collection, gồm cả corpus tĩnh.
    """

    model_config = ConfigDict(populate_by_name=True)

    topic: str = Field(min_length=2, max_length=200)
    question_type: QuestionType = QuestionType.MULTIPLE_CHOICE
    difficulty: Difficulty = Difficulty.MEDIUM
    count: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Trần, không phải chỉ tiêu. Học liệu không đủ căn cứ thì trả về ít hơn.",
    )
    language: Literal["vi", "en"] = "vi"
    instructions: str | None = Field(default=None, max_length=1000)
    top_k: int | None = Field(default=None, ge=1, le=20)
    course_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("courseId", "course_id"),
        serialization_alias="courseId",
        min_length=1,
        max_length=64,
        pattern=_ID_PATTERN,
        description="Chỉ lấy ngữ cảnh từ học liệu của khoá này.",
    )
    lesson_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("lessonId", "lesson_id"),
        serialization_alias="lessonId",
        min_length=1,
        max_length=64,
        pattern=_ID_PATTERN,
        description="Chỉ lấy ngữ cảnh từ đúng bài học này.",
    )

    @property
    def is_scoped(self) -> bool:
        """Có thu hẹp về học liệu thật không."""
        return bool(self.course_id or self.lesson_id)


class GeneratedOption(BaseModel):
    option_text: str = Field(min_length=1, max_length=500)
    is_correct: bool = False


class DraftQuestion(BaseModel):
    """Câu hỏi mô hình vừa sinh, CHƯA qua kiểm chứng.

    ``source_index`` là số ``[n]`` của khối tài liệu chứa đáp án. Mô hình bắt
    buộc khai; khai sai hoặc ngoài khoảng thì câu bị loại — mô hình bịa thường
    không gán nổi nguồn đúng, đây là chỗ nó lộ.
    """

    question_text: str = Field(min_length=10, max_length=2000)
    options: list[GeneratedOption] = Field(default_factory=list)
    answer_text: str | None = None
    explanation: str = Field(min_length=1, max_length=5000)
    source_index: int


class DraftQuestionList(BaseModel):
    """Bọc danh sách vì structured output cần một object ở gốc, không phải mảng."""

    questions: list[DraftQuestion] = Field(default_factory=list)


class GeneratedQuestion(BaseModel):
    """Câu hỏi đã qua đủ ba tầng kiểm, kèm đúng đoạn học liệu đã chống lưng.

    ``sourceLessonId``/``sourceCourseId`` (FR-AI-004) trỏ về bài học thật đã
    sinh ra câu này. ``null`` nghĩa là câu rút từ corpus tĩnh cũ — giảng viên
    nhìn vào đó để biết có truy ngược được về bài giảng hay không.
    """

    model_config = ConfigDict(populate_by_name=True)

    question_text: str
    question_type: QuestionType
    difficulty: Difficulty
    options: list[GeneratedOption] = Field(default_factory=list)
    answer_text: str | None = None
    explanation: str
    source: RetrievedSource
    source_lesson_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("sourceLessonId", "source_lesson_id"),
        serialization_alias="sourceLessonId",
    )
    source_course_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("sourceCourseId", "source_course_id"),
        serialization_alias="sourceCourseId",
    )


class GenerateQuestionsResponse(BaseModel):
    questions: list[GeneratedQuestion] = Field(default_factory=list)
    requested: int = Field(description="Số câu người dùng xin")
    returned: int = Field(description="Số câu thực sự qua được kiểm")
    dropped_unverified: int = Field(
        description="Số câu bị loại vì trích nguồn sai hoặc đoạn văn không chống lưng đáp án",
    )
    grounded: bool = Field(
        description=(
            "False khi học liệu không có nội dung về chủ đề. Khi đó questions rỗng "
            "và KHÔNG được coi là lỗi — frontend phải nói rõ cho người dùng."
        )
    )
    model: str
    usage: TokenUsage = Field(default_factory=TokenUsage)
    latency_ms: int
