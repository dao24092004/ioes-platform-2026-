"""Vòng lặp sự kiện không được đứng vì một request nặng.

Đây là test hồi quy cho một lỗi thật: ``POST /v1/learning-path/generate`` gọi
thẳng chuỗi agent đồng bộ trong một route ``async def``, nên suốt 96 giây sinh
lộ trình thì **cả tiến trình câm** — ``GET /health`` không trả về gì, curl đứt
ở mốc timeout 10 giây năm lần liên tiếp, và ``/internal/ai/proctor/analyze``
(exam-suite bắn một khung hình mỗi giây cho mỗi thí sinh) cũng chết theo.

Không chạm mạng: thay tầng dịch vụ bằng ``time.sleep`` — đúng thứ mà một lượt
``ChatOpenAI.invoke`` gây ra cho vòng lặp, mà không cần khoá API.

Dùng ``httpx.ASGITransport`` chứ không ``TestClient``: TestClient chạy request
qua một portal đồng bộ nên nó *luôn* tuần tự hoá, tức là không phân biệt được
"route chặn vòng lặp" với "route nhường đúng cách" — test sẽ xanh cả khi lỗi
còn nguyên.
"""

from __future__ import annotations

import asyncio
import threading
import time
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient

from ml_worker.api import learning_path as learning_path_api
from ml_worker.api import proctor as proctor_api
from ml_worker.core import concurrency
from ml_worker.core.config import get_settings
from ml_worker.main import app
from ml_worker.schemas.learning_path import LearningPathResponse
from ml_worker.schemas.proctor import FrameAnalysisResponse

# Một lượt "gọi mô hình" giả. Đủ dài để thấy rõ nếu vòng lặp bị chặn, đủ ngắn
# để bộ test không lê thê.
BLOCKING_SECONDS = 1.0

# Trần cho một request nhẹ chạy song song. Thực đo dưới 10ms; để 400ms cho máy
# CI chậm, vẫn cách xa 1000ms của trường hợp bị chặn nên không nhập nhằng.
FAST_LIMIT_SECONDS = 0.4

_REQUEST = {
    "userId": "u1",
    "goal": "Trở thành lập trình viên web",
    "hoursPerWeek": 8,
    "catalog": [],
}

_FRAME = {
    "attemptId": "a1",
    "capturedAt": "2026-09-21T00:00:00Z",
    "frameBase64": "x",
    "sequenceId": 1,
}


def _empty_path() -> LearningPathResponse:
    return LearningPathResponse(
        goal="Trở thành lập trình viên web",
        summary="",
        total_estimated_hours=0,
        weeks=0,
        steps=[],
        model="mock",
        generated_at=datetime.now(UTC),
    )


def _frame_result() -> FrameAnalysisResponse:
    return FrameAnalysisResponse(
        face_detected=True,
        face_count=1,
        attention_score=90,
        gaze_direction="CENTER",
    )


def _slow_generate(_payload: object) -> LearningPathResponse:
    """Chuỗi agent giả: chặn luồng gọi nó, y như ``ChatOpenAI.invoke`` thật."""
    time.sleep(BLOCKING_SECONDS)
    return _empty_path()


def _client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://ml-worker")


async def _let_it_start() -> None:
    """Nhường vòng lặp vài nhịp để task nặng chạy tới chỗ làm việc thật.

    Thiếu bước này thì ``/health`` trả lời xong mà task nặng còn chưa kịp khởi
    động — test xanh vì không có gì chạy song song cả, chứ không phải vì đã
    sửa đúng.

    Mốc bấm giờ phải đặt **trước** những nhịp nhường này: ở bản lỗi, đúng nhịp
    đầu tiên là task nặng cắm vào ``time.sleep`` và giữ luôn vòng lặp, nên mọi
    mốc đặt sau đó đều đo nhầm phần *sau* khi đã hết chặn.
    """
    for _ in range(5):
        await asyncio.sleep(0)


async def test_health_answers_while_a_generation_runs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Lỗi gốc: /health im lặng suốt thời gian sinh lộ trình."""
    monkeypatch.setattr(learning_path_api.orchestrator, "generate", _slow_generate)

    async with _client() as client:
        started = time.perf_counter()  # xem ``_let_it_start`` về thứ tự bấm giờ
        heavy = asyncio.create_task(client.post("/v1/learning-path/generate", json=_REQUEST))
        await _let_it_start()
        health = await client.get("/health")
        elapsed = time.perf_counter() - started

        assert health.status_code == 200
        assert health.json() == {"status": "ok", "service": "ml-worker"}
        # Trước khi sửa, con số này xấp xỉ BLOCKING_SECONDS.
        assert elapsed < FAST_LIMIT_SECONDS, f"/health mất {elapsed:.3f}s — vòng lặp đang bị chặn"
        # Chốt rằng phép đo trên thật sự diễn ra *trong lúc* việc nặng đang chạy.
        assert not heavy.done()

        assert (await heavy).status_code == 200


async def test_proctoring_keeps_running_while_a_generation_runs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """FR-AI-006: một người học sinh lộ trình không được làm cả phòng thi mất giám sát."""
    monkeypatch.setattr(learning_path_api.orchestrator, "generate", _slow_generate)
    monkeypatch.setattr(
        proctor_api.proctor_service, "analyze_frame", lambda _frame: _frame_result()
    )

    async with _client() as client:
        started = time.perf_counter()  # xem ``_let_it_start`` về thứ tự bấm giờ
        heavy = asyncio.create_task(client.post("/v1/learning-path/generate", json=_REQUEST))
        await _let_it_start()
        frame = await client.post("/internal/ai/proctor/analyze", json=_FRAME)
        elapsed = time.perf_counter() - started

        assert frame.status_code == 200
        assert frame.json()["attentionScore"] == 90
        assert elapsed < FAST_LIMIT_SECONDS, f"proctor mất {elapsed:.3f}s — vòng lặp đang bị chặn"
        assert not heavy.done()

        assert (await heavy).status_code == 200


async def test_heavy_work_never_exceeds_the_configured_slots(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Hạn ngạch có hiệu lực: không bao giờ quá ``llm_max_concurrency`` luồng nặng.

    Nếu không có trần này, một lượt sinh lộ trình giữ luồng cả phút, và đủ
    nhiều lượt song song sẽ ăn sạch threadpool — proctoring lại chết, chỉ chậm
    hơn một nhịp so với lỗi ban đầu.
    """
    monkeypatch.setenv("LLM_MAX_CONCURRENCY", "2")
    get_settings.cache_clear()

    lock = threading.Lock()
    state = {"now": 0, "peak": 0}

    def counted(_payload: object) -> LearningPathResponse:
        with lock:
            state["now"] += 1
            state["peak"] = max(state["peak"], state["now"])
        time.sleep(0.2)
        with lock:
            state["now"] -= 1
        return _empty_path()

    monkeypatch.setattr(learning_path_api.orchestrator, "generate", counted)

    async with _client() as client:
        responses = await asyncio.gather(
            *(client.post("/v1/learning-path/generate", json=_REQUEST) for _ in range(6))
        )

    assert [r.status_code for r in responses] == [200] * 6
    assert state["peak"] <= 2, f"có lúc {state['peak']} lượt nặng chạy cùng lúc"


async def test_queue_overflow_answers_503_instead_of_hanging(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Chờ quá hạn thì báo quá tải ngay, không treo tới lúc gateway tự đứt."""
    monkeypatch.setenv("LLM_MAX_CONCURRENCY", "1")
    monkeypatch.setenv("LLM_QUEUE_TIMEOUT_SECONDS", "0.1")
    get_settings.cache_clear()

    monkeypatch.setattr(learning_path_api.orchestrator, "generate", _slow_generate)

    async with _client() as client:
        first, second = await asyncio.gather(
            client.post("/v1/learning-path/generate", json=_REQUEST),
            client.post("/v1/learning-path/generate", json=_REQUEST),
        )

    codes = sorted(r.status_code for r in (first, second))
    assert codes == [200, 503]
    overloaded = first if first.status_code == 503 else second
    assert overloaded.headers["Retry-After"] == "30"


async def test_run_heavy_propagates_the_original_exception() -> None:
    """Lỗi của tầng dịch vụ phải bay lên nguyên vẹn, không bị bọc lại.

    Cả bốn route nặng đều bắt lỗi theo lớp (``AgentLlmError`` → 503,
    ``NoScopedMaterialError`` → 422). Bọc lại là mất hết các nhánh đó.
    """

    def explode() -> None:
        raise ValueError("hỏng ở luồng khác")

    with pytest.raises(ValueError, match="hỏng ở luồng khác"):
        await concurrency.run_heavy(explode)


async def test_run_heavy_runs_off_the_event_loop_thread() -> None:
    """Hàm đồng bộ phải chạy ở luồng khác luồng của vòng lặp sự kiện."""
    loop_thread = threading.get_ident()

    assert await concurrency.run_heavy(threading.get_ident) != loop_thread
