"""Kiểm thử tầng vectorstore.

Thay pymilvus bằng hàm giả — không cần Milvus chạy để kiểm logic ở đây.
"""

from __future__ import annotations

import pytest

from ml_worker.core.config import get_settings
from ml_worker.db import milvus


@pytest.fixture(autouse=True)
def clear_cache() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_connection_args_build_uri_from_settings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("MILVUS_HOST", "milvus.noi-bo")
    monkeypatch.setenv("MILVUS_PORT", "19999")
    get_settings.cache_clear()

    assert milvus.connection_args() == {"uri": "http://milvus.noi-bo:19999"}


def test_metric_is_inner_product() -> None:
    """Vector đã chuẩn hoá L2 nên IP bằng đúng cosine mà tính nhanh hơn.

    Đổi độ đo là phải nạp lại toàn bộ corpus, nên khoá lại bằng test.
    """
    assert milvus.METRIC_TYPE == "IP"
    assert milvus.INDEX_PARAMS["metric_type"] == "IP"


def test_index_is_hnsw() -> None:
    assert milvus.INDEX_PARAMS["index_type"] == "HNSW"
    assert milvus.INDEX_PARAMS["params"]["M"] == 16


def test_collection_exists_asks_milvus(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(milvus, "_connect", lambda: None)
    monkeypatch.setattr(milvus.utility, "has_collection", lambda _n: True)

    assert milvus.collection_exists() is True


def test_count_rows_returns_zero_before_first_ingest(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Chưa nạp corpus thì trả 0, không được ném lỗi ra endpoint status."""
    monkeypatch.setattr(milvus, "collection_exists", lambda: False)

    assert milvus.count_rows() == 0


def test_drop_collection_is_a_no_op_when_absent(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    dropped: list[str] = []
    monkeypatch.setattr(milvus, "_connect", lambda: None)
    monkeypatch.setattr(milvus.utility, "has_collection", lambda _n: False)
    monkeypatch.setattr(milvus.utility, "drop_collection", lambda n: dropped.append(n))

    milvus.drop_collection()

    assert dropped == []


def test_drop_collection_removes_an_existing_one(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    dropped: list[str] = []
    monkeypatch.setattr(milvus, "_connect", lambda: None)
    monkeypatch.setattr(milvus.utility, "has_collection", lambda _n: True)
    monkeypatch.setattr(milvus.utility, "drop_collection", lambda n: dropped.append(n))

    milvus.drop_collection()

    assert dropped == ["course_embeddings"]


def test_drop_collection_reraises_milvus_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Nuốt lỗi ở đây sẽ khiến ingest nạp chồng lên dữ liệu cũ."""

    def explode(_name: str) -> None:
        raise milvus.MilvusException(message="mat ket noi")

    monkeypatch.setattr(milvus, "_connect", lambda: None)
    monkeypatch.setattr(milvus.utility, "has_collection", lambda _n: True)
    monkeypatch.setattr(milvus.utility, "drop_collection", explode)

    with pytest.raises(milvus.MilvusException):
        milvus.drop_collection()


def test_vectorstore_never_drops_existing_data(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """drop_old phải là False.

    Bật lên thì mỗi lần lấy vectorstore là xoá sạch corpus, kể cả khi chỉ định
    truy vấn — việc xoá do ingest chủ động gọi drop_collection.
    """
    captured: dict[str, object] = {}

    def fake_milvus(**kwargs: object):
        captured.update(kwargs)
        return object()

    monkeypatch.setattr(milvus, "Milvus", fake_milvus)
    monkeypatch.setattr(milvus, "get_embeddings", lambda: object())

    milvus.get_vectorstore()

    assert captured["drop_old"] is False
    assert captured["collection_name"] == "course_embeddings"


def test_connect_is_idempotent(monkeypatch: pytest.MonkeyPatch) -> None:
    """Gọi nhiều lần không được mở thêm kết nối."""
    calls: list[dict] = []
    monkeypatch.setattr(milvus.connections, "has_connection", lambda _a: bool(calls))
    monkeypatch.setattr(milvus.connections, "connect", lambda **kw: calls.append(kw))

    milvus._connect()
    milvus._connect()
    milvus._connect()

    assert len(calls) == 1
    assert calls[0]["host"] == "localhost"
    assert calls[0]["port"] == "19530"


def test_count_rows_flushes_before_counting(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Không flush thì đoạn vừa nạp chưa được tính, và ingest báo thiếu."""
    events: list[str] = []

    class FakeCollection:
        def __init__(self, _name: str) -> None:
            events.append("open")

        def flush(self) -> None:
            events.append("flush")

        @property
        def num_entities(self) -> int:
            events.append("count")
            return 2283

    monkeypatch.setattr(milvus, "collection_exists", lambda: True)
    monkeypatch.setattr("pymilvus.Collection", FakeCollection)

    assert milvus.count_rows() == 2283
    assert events.index("flush") < events.index("count")
