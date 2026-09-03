"""Kiểm thử chuỗi RAG.

Không chạm Milvus và không gọi mạng: phần truy xuất được thay bằng hàm giả,
phần sinh câu trả lời dùng nhà cung cấp mock.
"""

from __future__ import annotations

from typing import ClassVar

import pytest
from langchain_core.documents import Document
from langchain_core.language_models.fake_chat_models import FakeListChatModel

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
    # Tắt truy xuất song ngữ để bài này chỉ đo đúng một việc là sàn điểm.
    monkeypatch.setattr(rag, "expand_query", lambda _question: [])

    kept = rag.retrieve("câu hỏi", top_k=4)

    assert [round(score, 2) for _doc_, score in kept] == [0.9, 0.6]


def test_retrieve_merges_expanded_query_results(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Truy xuất thêm bằng bản dịch, rồi trộn hai danh sách theo thứ hạng.

    Corpus gần như toàn tiếng Anh còn học viên chỉ hỏi tiếng Việt. Đo trên bộ 20
    câu hỏi chuẩn: thêm truy vấn dịch nâng recall@10 từ 0.808 lên 0.933.
    """
    monkeypatch.setenv("RAG_SCORE_THRESHOLD", "0.0")
    get_settings.cache_clear()

    asked: list[str] = []

    class FakeStore:
        def similarity_search_with_score(self, query: str, k: int) -> list:
            asked.append(query)
            if query == "What methods do arrays have?":
                return [(_doc("Arrays", "arrays"), 0.80)][:k]
            return [(_doc("React cơ bản", "vi-react"), 0.85)][:k]

    monkeypatch.setattr(rag.milvus, "collection_exists", lambda: True)
    monkeypatch.setattr(rag.milvus, "get_vectorstore", lambda: FakeStore())
    monkeypatch.setattr(rag, "expand_query", lambda _q: ["What methods do arrays have?"])

    kept = rag.retrieve("Mảng có những phương thức nào?", top_k=4)

    assert asked == ["Mảng có những phương thức nào?", "What methods do arrays have?"]
    # Bài tiếng Anh phải lọt vào kết quả dù điểm thô thấp hơn: nó đứng đầu danh
    # sách của truy vấn dịch, nên thứ hạng bù lại cho điểm.
    assert {doc.metadata["doc_id"] for doc, _score in kept} == {"arrays", "vi-react"}


def test_expand_query_returns_empty_when_model_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Chuẩn hoá hỏng thì lui về một truy vấn, không làm sập cả lượt hỏi."""

    def boom(**_kwargs: object) -> object:
        raise RuntimeError("mô hình không phản hồi")

    monkeypatch.setattr(rag, "get_chat_model", boom)

    assert rag.expand_query("Mảng là gì?") == []


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


def test_expand_query_parses_both_rewrites(monkeypatch: pytest.MonkeyPatch) -> None:
    """Một lượt gọi trả về cả bản có dấu lẫn bản tiếng Anh."""

    reply = "VI: Rebase khác merge thế nào?" + chr(10) + "EN: git rebase versus git merge"
    monkeypatch.setattr(
        rag, "get_chat_model", lambda **_kwargs: FakeListChatModel(responses=[reply])
    )

    assert rag.expand_query("Rebase khac merge the nao?") == [
        "Rebase khác merge thế nào?",
        "git rebase versus git merge",
    ]


def test_expand_query_drops_a_rewrite_identical_to_the_question(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Bản viết lại trùng câu gốc thì bỏ, truy xuất hai lần cùng một chuỗi là phí."""

    reply = "VI: Closure là gì?" + chr(10) + "EN: what is a closure"
    monkeypatch.setattr(
        rag, "get_chat_model", lambda **_kwargs: FakeListChatModel(responses=[reply])
    )

    assert rag.expand_query("Closure là gì?") == ["what is a closure"]


def test_fuse_keeps_every_chunk_from_every_pool() -> None:
    """Hợp các bể chứ không cắt: thêm truy vấn chỉ được thêm, không được lấy đi.

    Cắt xuống top_k khiến bể dịch giành nửa số chỗ kể cả khi nó không có gì liên
    quan — đo thực tế làm câu hỏi về git đang trả lời được thành bị từ chối.
    """
    vi = [(_doc("Git và GitHub", "vi-git"), 0.80)]
    en = [(_doc("Flexbox", "flexbox"), 0.86)]

    fused = rag._fuse([vi, en], limit=4)

    assert {doc.metadata["doc_id"] for doc, _ in fused} == {"vi-git", "flexbox"}
