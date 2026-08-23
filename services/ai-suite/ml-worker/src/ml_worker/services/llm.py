"""Chọn mô hình ngôn ngữ theo cấu hình.

LangChain đã trừu tượng hoá sẵn qua ``BaseChatModel``, nên không cần tự dựng
lớp ``LlmProvider`` riêng. Đổi nhà cung cấp chỉ là đổi biến ``LLM_PROVIDER``,
đúng khuyến nghị RK-006 trong PROJECT_MANAGEMENT_PLAN về tránh khoá chặt vào
một nhà cung cấp.

Gemini, OpenAI và DeepSeek đều phơi endpoint tương thích OpenAI, nên dùng chung
``ChatOpenAI`` và chỉ đổi ``base_url``.
"""

from __future__ import annotations

from functools import lru_cache

from ioes_common import get_logger
from langchain_core.language_models import BaseChatModel
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_openai import ChatOpenAI

from ml_worker.core.config import get_settings

logger = get_logger(__name__)

MOCK_REPLY = (
    "[mock] Chưa cấu hình mô hình ngôn ngữ thật. "
    "Đặt LLM_PROVIDER=gemini và GEMINI_API_KEY để bật câu trả lời thật."
)


class LlmNotConfiguredError(RuntimeError):
    """Nhà cung cấp được chọn nhưng thiếu khoá API."""


def _gemini() -> ChatOpenAI:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise LlmNotConfiguredError("LLM_PROVIDER=gemini nhưng GEMINI_API_KEY rỗng")
    return ChatOpenAI(
        model=settings.gemini_model,
        api_key=settings.gemini_api_key,
        base_url=settings.gemini_base_url,
        temperature=settings.llm_temperature,
        max_tokens=settings.rag_max_tokens,
        timeout=90,
        max_retries=2,
    )


def _openai() -> ChatOpenAI:
    settings = get_settings()
    if not settings.openai_api_key:
        raise LlmNotConfiguredError("LLM_PROVIDER=openai nhưng OPENAI_API_KEY rỗng")
    return ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        temperature=settings.llm_temperature,
        max_tokens=settings.rag_max_tokens,
        timeout=90,
        max_retries=2,
    )


def _mock() -> FakeListChatModel:
    """Mô hình giả, không gọi mạng.

    Cho phép chạy toàn bộ luồng RAG trong test mà không cần khoá API — tầng
    truy xuất vẫn thật, chỉ phần sinh câu trả lời là cố định.
    """
    return FakeListChatModel(responses=[MOCK_REPLY])


@lru_cache(maxsize=1)
def get_chat_model() -> BaseChatModel:
    settings = get_settings()
    provider = settings.llm_provider.strip().lower()

    builders = {
        "mock": _mock,
        "gemini": _gemini,
        "openai": _openai,
    }
    build = builders.get(provider)
    if build is None:
        raise LlmNotConfiguredError(
            f"LLM_PROVIDER='{provider}' không hợp lệ. "
            f"Chọn một trong: {', '.join(sorted(builders))}"
        )

    model = build()
    logger.info("llm_selected", provider=provider)
    return model


def active_model_name() -> str:
    """Tên mô hình đang dùng, để ghi vào chat_messages.model."""
    settings = get_settings()
    provider = settings.llm_provider.strip().lower()
    if provider == "gemini":
        return settings.gemini_model
    if provider == "openai":
        return settings.openai_model
    return "mock"
