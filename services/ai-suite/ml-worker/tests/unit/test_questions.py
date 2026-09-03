"""Kiểm thử sinh câu hỏi.

Trọng tâm là bốn tầng chặn bịa, vì đó là lý do tồn tại của module này. Không
chạm Milvus, không gọi mạng: truy xuất thay bằng hàm giả, sinh và đối chiếu
thay bằng hàm giả.
"""

from __future__ import annotations

import pytest
from langchain_core.documents import Document

from ml_worker.core.config import get_settings
from ml_worker.schemas.questions import (
    Difficulty,
    DraftQuestion,
    DraftQuestionList,
    GeneratedOption,
    GenerateQuestionsRequest,
    QuestionType,
)
from ml_worker.services import llm, questions


@pytest.fixture(autouse=True)
def use_mock_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    get_settings.cache_clear()
    llm.get_chat_model.cache_clear()
    yield
    get_settings.cache_clear()
    llm.get_chat_model.cache_clear()


def _doc(index: int = 0) -> tuple[Document, float]:
    return (
        Document(
            page_content="Box model gồm content, padding, border và margin.",
            metadata={
                "doc_id": "box-model",
                "title": "Box model",
                "chunk_id": f"box-model#{index}",
            },
        ),
        0.81,
    )


def _mcq(source_index: int = 1, correct: int = 0) -> DraftQuestion:
    return DraftQuestion(
        question_text="Box model gồm những lớp nào?",
        options=[
            GeneratedOption(option_text=text, is_correct=(i == correct))
            for i, text in enumerate(["content, padding, border, margin", "B", "C", "D"])
        ],
        explanation="Tài liệu liệt kê đủ bốn lớp.",
        source_index=source_index,
    )


def _request(**overrides: object) -> GenerateQuestionsRequest:
    base: dict[str, object] = {
        "topic": "Box model",
        "question_type": QuestionType.MULTIPLE_CHOICE,
        "difficulty": Difficulty.MEDIUM,
        "count": 5,
    }
    base.update(overrides)
    return GenerateQuestionsRequest(**base)  # type: ignore[arg-type]


def _stub_generation(
    monkeypatch: pytest.MonkeyPatch,
    drafts: list[DraftQuestion],
    *,
    verified: bool = True,
) -> None:
    """Thay lượt sinh và lượt đối chiếu bằng kết quả cố định."""

    class _Chain:
        def __or__(self, _other: object) -> _Chain:
            return self

        def invoke(self, _payload: object) -> DraftQuestionList:
            return DraftQuestionList(questions=drafts)

    monkeypatch.setattr(questions, "PROMPT", _Chain())

    class _Model:
        def with_structured_output(self, _schema: object) -> _Chain:
            return _Chain()

    monkeypatch.setattr(questions, "get_chat_model", lambda *_a, **_k: _Model())
    monkeypatch.setattr(questions, "_verify", lambda *_a, **_k: verified)


# --- Tầng 1: ngữ cảnh là nguồn duy nhất ---------------------------------------


def test_returns_empty_when_corpus_has_nothing(monkeypatch: pytest.MonkeyPatch) -> None:
    """Học liệu không phủ chủ đề thì không sinh câu nào, không bịa."""
    monkeypatch.setattr(questions, "retrieve", lambda *_a, **_k: [])

    result = questions.generate(_request(topic="Gradient Descent"))

    assert result.grounded is False
    assert result.questions == []
    assert result.returned == 0


def test_does_not_call_model_when_corpus_has_nothing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Không có ngữ cảnh thì đừng tốn một lượt gọi mô hình."""
    monkeypatch.setattr(questions, "retrieve", lambda *_a, **_k: [])

    def explode(*_a: object, **_k: object) -> None:
        raise AssertionError("không được gọi mô hình khi chưa truy xuất được gì")

    monkeypatch.setattr(questions, "get_chat_model", explode)

    assert questions.generate(_request()).grounded is False


# --- Tầng 2: bắt trích nguồn ---------------------------------------------------


def test_drops_question_citing_source_out_of_range(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Khai nguồn [9] khi chỉ có 1 khối tài liệu — dấu hiệu bịa, phải loại."""
    monkeypatch.setattr(questions, "retrieve", lambda *_a, **_k: [_doc()])
    _stub_generation(monkeypatch, [_mcq(source_index=9)])

    result = questions.generate(_request())

    assert result.questions == []
    assert result.dropped_unverified == 1
    # Vẫn grounded: truy xuất được tài liệu, chỉ là câu sinh ra không dùng được.
    assert result.grounded is True


def test_keeps_question_with_valid_source(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(questions, "retrieve", lambda *_a, **_k: [_doc()])
    _stub_generation(monkeypatch, [_mcq(source_index=1)])

    result = questions.generate(_request())

    assert result.returned == 1
    assert result.dropped_unverified == 0
    assert result.questions[0].source.chunk_id == "box-model#0"


# --- Tầng 3: đối chiếu đáp án với đoạn văn -------------------------------------


def test_drops_question_the_excerpt_does_not_support(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(questions, "retrieve", lambda *_a, **_k: [_doc()])
    _stub_generation(monkeypatch, [_mcq()], verified=False)

    result = questions.generate(_request())

    assert result.questions == []
    assert result.dropped_unverified == 1


def test_verification_failure_drops_the_question(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Mô hình lỗi lúc đối chiếu thì loại câu, không cho qua.

    Thà mất một câu đúng còn hơn để lọt một câu sai vào ngân hàng đề.
    """

    def explode(*_a: object, **_k: object) -> None:
        raise RuntimeError("nhà cung cấp lỗi")

    monkeypatch.setattr(questions, "get_chat_model", explode)

    assert questions._verify(_mcq(), "Một đoạn văn bất kỳ") is False


# --- Tầng 4: count là trần, không phải chỉ tiêu --------------------------------


def test_returns_fewer_than_requested_without_padding(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Xin 5 mà học liệu chỉ đủ 2 thì trả 2, không đắp cho đủ."""
    monkeypatch.setattr(questions, "retrieve", lambda *_a, **_k: [_doc()])
    _stub_generation(monkeypatch, [_mcq(), _mcq()])

    result = questions.generate(_request(count=5))

    assert result.requested == 5
    assert result.returned == 2
    assert len(result.questions) == 2


def test_never_returns_more_than_requested(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mô hình nộp thừa thì cắt, không để nó tự quyết số lượng."""
    monkeypatch.setattr(questions, "retrieve", lambda *_a, **_k: [_doc()])
    _stub_generation(monkeypatch, [_mcq() for _ in range(6)])

    assert questions.generate(_request(count=2)).returned == 2


# --- Ràng buộc hình dạng theo loại câu hỏi -------------------------------------


def test_drops_multiple_choice_with_two_correct_options(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """MCQ hai đáp án đúng sẽ bị exam-suite từ chối lúc lưu, chặn từ đây."""
    draft = _mcq()
    draft.options[1].is_correct = True

    monkeypatch.setattr(questions, "retrieve", lambda *_a, **_k: [_doc()])
    _stub_generation(monkeypatch, [draft])

    result = questions.generate(_request())

    assert result.questions == []
    assert result.dropped_unverified == 1


def test_drops_short_answer_without_answer_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    draft = DraftQuestion(
        question_text="Box model gồm mấy lớp?",
        options=[],
        answer_text=None,
        explanation="Bốn lớp.",
        source_index=1,
    )

    monkeypatch.setattr(questions, "retrieve", lambda *_a, **_k: [_doc()])
    _stub_generation(monkeypatch, [draft])

    result = questions.generate(_request(question_type=QuestionType.SHORT_ANSWER))

    assert result.questions == []


def test_true_false_needs_exactly_two_options(monkeypatch: pytest.MonkeyPatch) -> None:
    draft = DraftQuestion(
        question_text="Box model có bao gồm margin không?",
        options=[
            GeneratedOption(option_text="Đúng", is_correct=True),
            GeneratedOption(option_text="Sai"),
        ],
        explanation="Tài liệu nêu margin là lớp ngoài cùng.",
        source_index=1,
    )

    monkeypatch.setattr(questions, "retrieve", lambda *_a, **_k: [_doc()])
    _stub_generation(monkeypatch, [draft])

    result = questions.generate(_request(question_type=QuestionType.TRUE_FALSE))

    assert result.returned == 1


# --- Đối chiếu: đọc đúng phán quyết của mô hình --------------------------------


def test_verify_accepts_co(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(questions, "VERIFY_PROMPT", _FixedChain("CO"))
    monkeypatch.setattr(questions, "get_chat_model", lambda *_a, **_k: object())

    assert questions._verify(_mcq(), "Box model gồm content, padding, border, margin.")


def test_verify_rejects_khong(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(questions, "VERIFY_PROMPT", _FixedChain("KHONG"))
    monkeypatch.setattr(questions, "get_chat_model", lambda *_a, **_k: object())

    assert questions._verify(_mcq(), "Đoạn văn nói về flexbox.") is False


class _Message:
    def __init__(self, content: str) -> None:
        self.content = content


class _FixedChain:
    """Chuỗi prompt | model giả, luôn trả cùng một phán quyết."""

    def __init__(self, verdict: str) -> None:
        self._verdict = verdict

    def __or__(self, _other: object) -> _FixedChain:
        return self

    def invoke(self, _payload: object) -> _Message:
        return _Message(self._verdict)


def test_verifies_against_full_passage_not_truncated_excerpt(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Doi chieu phai dung toan van doan, khong dung excerpt da cat.

    RetrievedSource.excerpt cat con 280 ky tu de hien thi, trong khi chunk dai
    toi 800. Doi chieu tren ban cat thi cau rut tu duoi chunk bi loai oan — do
    that tren "Box model trong CSS" mat 2 tren 3 cau.
    """
    long_tail = "A" * 400 + " Margin nam ngoai cung cua box model."
    doc = (
        Document(
            page_content=long_tail,
            metadata={"doc_id": "box", "title": "Box model", "chunk_id": "box#0"},
        ),
        0.9,
    )
    monkeypatch.setattr(questions, "retrieve", lambda *_a, **_k: [doc])

    seen: list[str] = []

    class _Chain:
        def __or__(self, _other: object) -> _Chain:
            return self

        def invoke(self, _payload: object) -> DraftQuestionList:
            return DraftQuestionList(questions=[_mcq()])

    class _Model:
        def with_structured_output(self, _schema: object) -> _Chain:
            return _Chain()

    monkeypatch.setattr(questions, "PROMPT", _Chain())
    monkeypatch.setattr(questions, "get_chat_model", lambda *_a, **_k: _Model())
    monkeypatch.setattr(
        questions,
        "_verify",
        lambda _draft, passage: (seen.append(passage), True)[1],
    )

    questions.generate(_request(count=1))

    assert seen, "khong goi doi chieu"
    assert seen[0] == long_tail, "doi chieu nhan ban cat thay vi toan van"


# --- Tang 2: cong loc lac de --------------------------------------------------


def test_refuses_when_material_is_off_topic(monkeypatch: pytest.MonkeyPatch) -> None:
    """Truy xuat ra tai lieu, nhung tai lieu khong ban ve chu de duoc hoi.

    Do that: hoi "Gradient Descent va learning rate" tren corpus khong co mang
    nay van ra 3 cau hop le, neo dung nguon — nhung noi dung la kiem thu phan
    mem va REST API.
    """
    monkeypatch.setattr(questions, "retrieve", lambda *_a, **_k: [_doc()])
    monkeypatch.setattr(questions, "_covers_topic", lambda *_a, **_k: False)

    def explode(*_a: object, **_k: object) -> None:
        raise AssertionError("khong duoc sinh de khi tai lieu lac de")

    monkeypatch.setattr(questions, "get_chat_model", explode)

    result = questions.generate(_request(topic="Gradient Descent"))

    assert result.grounded is False
    assert result.questions == []


def test_generates_when_material_covers_topic(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(questions, "retrieve", lambda *_a, **_k: [_doc()])
    monkeypatch.setattr(questions, "_covers_topic", lambda *_a, **_k: True)
    _stub_generation(monkeypatch, [_mcq()])

    assert questions.generate(_request()).returned == 1


def test_relevance_gate_lets_through_on_model_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Cong loc lac de hong thi cho qua — ba tang chan bia van dung nguyen."""

    def explode(*_a: object, **_k: object) -> None:
        raise RuntimeError("nha cung cap loi")

    monkeypatch.setattr(questions, "get_chat_model", explode)

    assert questions._covers_topic("Box model", "ngu canh bat ky") is True
