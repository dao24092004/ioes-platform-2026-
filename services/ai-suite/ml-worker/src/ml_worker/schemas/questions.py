"""Schema cho endpoint sinh câu hỏi.

Giá trị enum viết thường, khớp đúng ``libs/common-node/src/events/question-types.ts``
và PostgreSQL ENUM bên exam-suite. Viết hoa sẽ làm INSERT fail khi giảng viên
lưu câu hỏi vào ngân hàng đề.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field

from ml_worker.schemas.rag import RetrievedSource, TokenUsage


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
    """Câu hỏi đã qua đủ ba tầng kiểm, kèm đúng đoạn học liệu đã chống lưng."""

    question_text: str
    question_type: QuestionType
    difficulty: Difficulty
    options: list[GeneratedOption] = Field(default_factory=list)
    answer_text: str | None = None
    explanation: str
    source: RetrievedSource


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
