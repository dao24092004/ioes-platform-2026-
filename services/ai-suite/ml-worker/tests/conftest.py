"""Cấu hình dùng chung cho pytest."""

import pytest

from ml_worker.core.config import get_settings


@pytest.fixture(autouse=True)
def isolate_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """Không để .env của máy dev lọt vào test.

    Thiếu cái này thì test đỏ hay xanh tuỳ máy: máy có GEMINI_API_KEY sẽ gọi
    mạng thật, máy không có thì không.
    """
    for key in ("LLM_PROVIDER", "GEMINI_API_KEY", "OPENAI_API_KEY"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
