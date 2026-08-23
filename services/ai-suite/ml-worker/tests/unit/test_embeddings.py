"""Kiểm thử tầng nhúng.

Không nạp mô hình thật: nạp mất vài giây và vài trăm MB, mà thứ cần kiểm ở đây
là logic chọn mô hình và gắn tiền tố, không phải chất lượng vector.
"""

from __future__ import annotations

import pytest

from ml_worker.core.config import get_settings
from ml_worker.services import embeddings as emb


@pytest.fixture(autouse=True)
def clear_cache() -> None:
    get_settings.cache_clear()
    emb.get_embeddings.cache_clear()
    yield
    get_settings.cache_clear()
    emb.get_embeddings.cache_clear()


class _Recorder:
    """Ghi lại chuỗi thực sự được đưa vào mô hình."""

    def __init__(self) -> None:
        self.documents: list[str] = []
        self.queries: list[str] = []

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        self.documents.extend(texts)
        return [[0.0] * 384 for _ in texts]

    def embed_query(self, text: str) -> list[float]:
        self.queries.append(text)
        return [0.0] * 384


def _e5(monkeypatch: pytest.MonkeyPatch) -> tuple[emb.E5Embeddings, _Recorder]:
    recorder = _Recorder()
    monkeypatch.setattr(emb.HuggingFaceEmbeddings, "embed_documents", recorder.embed_documents)
    monkeypatch.setattr(emb.HuggingFaceEmbeddings, "embed_query", recorder.embed_query)
    model = emb.E5Embeddings.__new__(emb.E5Embeddings)
    return model, recorder


def test_e5_prefixes_passages_when_embedding_documents(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    model, recorder = _e5(monkeypatch)

    model.embed_documents(["Flexbox sắp xếp theo một chiều."])

    assert recorder.documents == ["passage: Flexbox sắp xếp theo một chiều."]


def test_e5_prefixes_query_when_embedding_question(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    model, recorder = _e5(monkeypatch)

    model.embed_query("Flexbox là gì?")

    assert recorder.queries == ["query: Flexbox là gì?"]


def test_e5_uses_different_prefixes_for_the_two_sides(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Trộn lẫn hai tiền tố còn tệ hơn không dùng tiền tố nào."""
    model, recorder = _e5(monkeypatch)

    model.embed_documents(["cùng một câu"])
    model.embed_query("cùng một câu")

    assert recorder.documents[0] != recorder.queries[0]
    assert recorder.documents[0].startswith(emb.PASSAGE_PREFIX)
    assert recorder.queries[0].startswith(emb.QUERY_PREFIX)


def test_e5_batches_all_documents(monkeypatch: pytest.MonkeyPatch) -> None:
    model, recorder = _e5(monkeypatch)

    model.embed_documents(["một", "hai", "ba"])

    assert len(recorder.documents) == 3
    assert all(t.startswith(emb.PASSAGE_PREFIX) for t in recorder.documents)


def test_e5_class_chosen_for_e5_model(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    def fake_init(self, **kwargs: object) -> None:
        captured.update(kwargs)

    monkeypatch.setenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-small")
    monkeypatch.setattr(emb.E5Embeddings, "__init__", fake_init)
    monkeypatch.setattr(emb.HuggingFaceEmbeddings, "__init__", fake_init)

    model = emb.get_embeddings()

    assert isinstance(model, emb.E5Embeddings)
    assert captured["model_name"] == "intfloat/multilingual-e5-small"


def test_plain_class_chosen_for_non_e5_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Mô hình khác mà thêm tiền tố E5 vào thì chất lượng tệ hơn."""

    def fake_init(self, **kwargs: object) -> None:
        return None

    monkeypatch.setenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    monkeypatch.setattr(emb.HuggingFaceEmbeddings, "__init__", fake_init)

    model = emb.get_embeddings()

    assert not isinstance(model, emb.E5Embeddings)


def test_normalisation_is_on(monkeypatch: pytest.MonkeyPatch) -> None:
    """Milvus dùng độ đo IP. Không chuẩn hoá thì điểm số mất ý nghĩa."""
    captured: dict[str, object] = {}

    def fake_init(self, **kwargs: object) -> None:
        captured.update(kwargs)

    monkeypatch.setattr(emb.E5Embeddings, "__init__", fake_init)
    emb.get_embeddings()

    assert captured["encode_kwargs"]["normalize_embeddings"] is True


def test_model_is_loaded_only_once(monkeypatch: pytest.MonkeyPatch) -> None:
    """Nạp lại theo từng request sẽ làm mỗi câu hỏi chậm thêm vài giây."""
    calls = []

    def fake_init(self, **kwargs: object) -> None:
        calls.append(1)

    monkeypatch.setattr(emb.E5Embeddings, "__init__", fake_init)

    emb.get_embeddings()
    emb.get_embeddings()
    emb.get_embeddings()

    assert len(calls) == 1
