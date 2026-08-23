"""Kiểm thử việc chọn nhà cung cấp mô hình ngôn ngữ."""

from __future__ import annotations

import pytest

from ml_worker.core.config import get_settings
from ml_worker.services import llm


@pytest.fixture(autouse=True)
def clear_caches() -> None:
    """Cấu hình và mô hình đều được nhớ đệm, phải xoá giữa các test."""
    get_settings.cache_clear()
    llm.get_chat_model.cache_clear()
    yield
    get_settings.cache_clear()
    llm.get_chat_model.cache_clear()


def test_mock_provider_needs_no_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    monkeypatch.setenv("GEMINI_API_KEY", "")

    model = llm.get_chat_model()

    assert model.invoke("bất kỳ câu gì").content == llm.MOCK_REPLY


def test_mock_provider_makes_no_network_call(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock")

    # Nếu bản mock lỡ gọi mạng thì test phải đỏ, chứ không được im lặng đi qua.
    def explode(*_args: object, **_kwargs: object) -> None:
        raise AssertionError("mock provider không được gọi mạng")

    monkeypatch.setattr("socket.socket.connect", explode)

    assert llm.get_chat_model().invoke("xin chào").content == llm.MOCK_REPLY


def test_gemini_without_key_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "")

    with pytest.raises(llm.LlmNotConfiguredError, match="GEMINI_API_KEY"):
        llm.get_chat_model()


def test_gemini_uses_openai_compatible_endpoint(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "khoa-gia-de-test")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.6-flash")

    model = llm.get_chat_model()

    assert model.model_name == "gemini-3.6-flash"
    assert "generativelanguage.googleapis.com" in str(model.openai_api_base)


def test_unknown_provider_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "khong-ton-tai")

    with pytest.raises(llm.LlmNotConfiguredError, match="không hợp lệ"):
        llm.get_chat_model()


@pytest.mark.parametrize(
    ("provider", "expected"),
    [("mock", "mock"), ("gemini", "gemini-3.6-flash")],
)
def test_active_model_name(monkeypatch: pytest.MonkeyPatch, provider: str, expected: str) -> None:
    monkeypatch.setenv("LLM_PROVIDER", provider)
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.6-flash")

    assert llm.active_model_name() == expected


def test_max_tokens_leaves_room_for_reasoning(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Gemini tính token suy luận ẩn vào tổng.

    Đo thực tế: prompt 17 + completion 168 nhưng tổng là 736, tức khoảng 551
    token suy luận. Đặt max_tokens thấp thì câu trả lời bị cắt cụt mà không báo
    lỗi gì, nên mặc định phải rộng rãi.
    """
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "khoa-gia-de-test")

    assert llm.get_chat_model().max_tokens >= 800
