"""Kiểm thử chuỗi RAG.

Không chạm Milvus và không gọi mạng: phần truy xuất được thay bằng hàm giả,
phần sinh câu trả lời dùng nhà cung cấp mock.
"""

from __future__ import annotations

from typing import ClassVar

import pytest
from langchain_core.documents import Document

from ml_worker.core.config import get_settings
from ml_worker.services import llm, rag


@pytest.fixture(autouse=True)
def use_mock_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    get_settings.cache_clear()
    llm.get_chat_model.cache_clear()
    yield
    get_settings.cache_clear()
    llm.get_chat_model.cache_clear()


def _doc(title: str = "Git và GitHub", doc_id: str = "git-github") -> Document:
    return Document(
        page_content="Rebase viết lại lịch sử để thành đường thẳng.",
        metadata={"doc_id": doc_id, "title": title, "chunk_id": f"{doc_id}#0"},
    )


def test_answer_refuses_when_nothing_retrieved(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Corpus không có gì liên quan thì phải nói không biết, không được bịa."""
    monkeypatch.setattr(rag, "retrieve", lambda *_args, **_kwargs: [])

    result = rag.answer("Giá vàng hôm nay bao nhiêu?")

    assert result.grounded is False
    assert result.sources == []
    assert result.answer == rag.NO_CONTEXT_ANSWER


def test_answer_does_not_call_model_when_nothing_retrieved(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Không có ngữ cảnh thì đừng tốn một lượt gọi mô hình."""
    monkeypatch.setattr(rag, "retrieve", lambda *_args, **_kwargs: [])

    def explode() -> None:
        raise AssertionError("không được gọi mô hình khi chưa truy xuất được gì")

    monkeypatch.setattr(rag, "get_chat_model", explode)

    assert rag.answer("Câu hỏi ngoài phạm vi").grounded is False


def test_answer_is_grounded_when_documents_found(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(rag, "retrieve", lambda *_a, **_k: [(_doc(), 0.81)])

    result = rag.answer("Rebase khác merge thế nào?")

    assert result.grounded is True
    assert len(result.sources) == 1
    assert result.sources[0].title == "Git và GitHub"
    assert result.sources[0].score == pytest.approx(0.81)
    assert result.latency_ms >= 0


def test_sources_carry_chunk_id_for_citation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(rag, "retrieve", lambda *_a, **_k: [(_doc(), 0.9)])

    result = rag.answer("Git là gì?")

    assert result.sources[0].chunk_id == "git-github#0"
    assert result.sources[0].doc_id == "git-github"
    assert result.sources[0].excerpt


def test_retrieve_drops_hits_below_threshold(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Chỉ giữ đoạn vượt sàn điểm.

    Đây là sàn lọc rác thô, KHÔNG phải chốt chặn chống bịa — phân bố điểm trong
    và ngoài phạm vi chồng lấn với cả hai mô hình nhúng đã thử, nên việc phán
    đoán giao cho mô hình ngôn ngữ. Xem docstring của ml_worker.services.rag.
    """
    monkeypatch.setenv("RAG_SCORE_THRESHOLD", "0.5")
    get_settings.cache_clear()

    class FakeStore:
        def similarity_search_with_score(self, _query: str, k: int) -> list:
            return [(_doc(), 0.9), (_doc(), 0.6), (_doc(), 0.2), (_doc(), 0.1)][:k]

    monkeypatch.setattr(rag.milvus, "collection_exists", lambda: True)
    monkeypatch.setattr(rag.milvus, "get_vectorstore", lambda: FakeStore())

    kept = rag.retrieve("câu hỏi", top_k=4)

    assert [round(score, 2) for _doc_, score in kept] == [0.9, 0.6]


def test_retrieve_returns_empty_when_collection_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Chưa nạp corpus thì trả rỗng, không được ném lỗi ra ngoài."""
    monkeypatch.setattr(rag.milvus, "collection_exists", lambda: False)

    assert rag.retrieve("bất kỳ") == []


def test_format_context_numbers_and_labels_sources() -> None:
    context = rag._format_context([(_doc(), 0.83), (_doc("REST API", "rest"), 0.42)])

    assert "[1] Git và GitHub" in context
    assert "[2] REST API" in context
    assert "0.83" in context


def test_extract_usage_handles_missing_metadata() -> None:
    class Bare:
        pass

    usage = rag._extract_usage(Bare())

    assert usage.total_tokens is None
    assert usage.prompt_tokens is None


def test_extract_usage_reads_langchain_metadata() -> None:
    class WithUsage:
        usage_metadata: ClassVar[dict[str, int]] = {
            "input_tokens": 17,
            "output_tokens": 168,
            "total_tokens": 736,
        }

    usage = rag._extract_usage(WithUsage())

    assert usage.prompt_tokens == 17
    assert usage.completion_tokens == 168
    # Tổng lớn hơn hẳn tổng hai thành phần vì có token suy luận ẩn.
    assert usage.total_tokens == 736
