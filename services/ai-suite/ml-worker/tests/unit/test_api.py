"""Kiểm thử route RAG.

Dùng TestClient của FastAPI, thay tầng dịch vụ bằng hàm giả — không chạm Milvus
và không gọi mô hình.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from ml_worker.api import rag as rag_api
from ml_worker.core.config import get_settings
from ml_worker.main import app
from ml_worker.schemas.rag import RagQueryResponse, RetrievedSource, TokenUsage
from ml_worker.services.llm import LlmNotConfiguredError


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _response(grounded: bool = True) -> RagQueryResponse:
    return RagQueryResponse(
        answer="Flexbox sắp xếp theo một chiều." if grounded else "Không đủ dữ liệu.",
        sources=(
            [
                RetrievedSource(
                    doc_id="vi-html-css",
                    chunk_id="vi-html-css#0",
                    title="HTML và CSS cơ bản",
                    score=0.83,
                    excerpt="Flexbox sắp xếp theo một chiều.",
                )
            ]
            if grounded
            else []
        ),
        model="gemini-3.5-flash-lite",
        usage=TokenUsage(prompt_tokens=17, completion_tokens=168, total_tokens=736),
        latency_ms=1420,
        grounded=grounded,
    )


def test_health(client: TestClient) -> None:
    body = client.get("/health").json()

    assert body == {"status": "ok", "service": "ml-worker"}


def test_query_returns_answer_and_sources(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(rag_api.rag_service, "answer", lambda *_a, **_k: _response())

    body = client.post("/v1/rag/query", json={"question": "Flexbox là gì?"}).json()

    assert body["grounded"] is True
    assert body["sources"][0]["chunk_id"] == "vi-html-css#0"
    assert body["usage"]["total_tokens"] == 736


def test_query_reports_ungrounded_without_sources(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(rag_api.rag_service, "answer", lambda *_a, **_k: _response(grounded=False))

    body = client.post("/v1/rag/query", json={"question": "Giá vàng?"}).json()

    assert body["grounded"] is False
    assert body["sources"] == []


def test_query_rejects_empty_question(client: TestClient) -> None:
    assert client.post("/v1/rag/query", json={"question": ""}).status_code == 422


def test_query_rejects_out_of_range_top_k(client: TestClient) -> None:
    response = client.post("/v1/rag/query", json={"question": "Flexbox?", "top_k": 999})

    assert response.status_code == 422


def test_query_returns_503_when_llm_not_configured(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Thiếu khoá API là lỗi cấu hình phía vận hành, không phải lỗi người dùng."""

    def explode(*_args: object, **_kwargs: object) -> None:
        raise LlmNotConfiguredError("GEMINI_API_KEY rỗng")

    monkeypatch.setattr(rag_api.rag_service, "answer", explode)

    response = client.post("/v1/rag/query", json={"question": "Flexbox?"})

    assert response.status_code == 503
    assert "GEMINI_API_KEY" in response.json()["detail"]


def test_status_reports_collection_state(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(rag_api.milvus, "collection_exists", lambda: True)
    monkeypatch.setattr(rag_api.milvus, "count_rows", lambda: 2283)
    get_settings.cache_clear()

    body = client.get("/v1/rag/status").json()

    assert body["exists"] is True
    assert body["rows"] == 2283
    assert body["collection"] == "course_embeddings"


def test_status_works_before_first_ingest(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Chưa nạp corpus thì báo rỗng, không được ném lỗi."""
    monkeypatch.setattr(rag_api.milvus, "collection_exists", lambda: False)
    monkeypatch.setattr(rag_api.milvus, "count_rows", lambda: 0)

    body = client.get("/v1/rag/status").json()

    assert body["exists"] is False
    assert body["rows"] == 0


def test_ingest_returns_counts(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        rag_api.ingest_service,
        "ingest",
        lambda *_a, **_k: {
            "documents": 96,
            "chunks": 2283,
            "collection": "course_embeddings",
            "total_rows": 2283,
        },
    )

    body = client.post("/v1/rag/ingest").json()

    assert body["documents"] == 96
    assert body["chunks"] == 2283
