"""Chuỗi năm agent sinh lộ trình cá nhân hoá (FR-AI-005).

Chạy tuần tự, đầu ra của agent trước là đầu vào của agent sau:

    yêu cầu ──> profiler ──────────> LearnerProfile
                     │                    │
                     └──────────> gap_analyzer ──> SkillGapReport
                                          │              │
                              curriculum_planner <───────┘
                                          │
                                     DraftPlan
                                          │
                              resource_retriever ──> học liệu theo bước
                                          │
                                      validator ──> LearningPathResponse

Vì sao tuần tự chứ không song song
----------------------------------
Bốn cạnh trong sơ đồ trên đều là phụ thuộc dữ liệu thật: agent 2 cần bản đánh
giá trình độ mới biết cái gì là "còn thiếu", agent 3 cần thứ tự kỹ năng thiếu
mới xếp được bước, agent 4 cần tên bước mới có câu truy vấn, agent 5 cần cả
bản nháp lẫn học liệu. Không có cặp nào chạy song song được, nên độ trễ tổng
xấp xỉ tổng ba lượt gọi mô hình cộng phần truy xuất — thường 8-20 giây.

``agentTrace`` ghi lại từng chặng để còn biết chặng nào chậm và chặng nào làm
hỏng, vì nhìn vào lộ trình cuối cùng thì không phân biệt được "mô hình xếp dở"
với "validator loại mất quá nửa số bước".
"""

from __future__ import annotations

import time
from collections.abc import Callable
from typing import TypeVar

from ioes_common import get_logger

from ml_worker.schemas.learning_path import (
    AgentTraceEntry,
    LearningPathRequest,
    LearningPathResponse,
)
from ml_worker.services.learning_path import (
    curriculum_planner,
    gap_analyzer,
    profiler,
    resource_retriever,
    validator,
)

logger = get_logger(__name__)

T = TypeVar("T")

# Đúng thứ tự trong hợp đồng. Dùng để test khẳng định không agent nào bị bỏ.
AGENT_ORDER = (
    profiler.AGENT_NAME,
    gap_analyzer.AGENT_NAME,
    curriculum_planner.AGENT_NAME,
    resource_retriever.AGENT_NAME,
    validator.AGENT_NAME,
)


def _record(
    trace: list[AgentTraceEntry],
    agent: str,
    run: Callable[[], tuple[T, str]],
) -> T:
    """Chạy một agent, đo thời gian và ghi một dòng vào ``agentTrace``.

    Agent ném lỗi thì KHÔNG ghi dòng nào: chuỗi dừng ngay tại đó và tầng API
    trả lỗi, nên một dòng trace nửa vời chỉ gây hiểu nhầm là agent đã xong.
    """
    started = time.perf_counter()
    result, summary = run()
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    trace.append(AgentTraceEntry(agent=agent, summary=summary, elapsed_ms=elapsed_ms))
    logger.info("learning_path_agent_done", agent=agent, elapsed_ms=elapsed_ms)
    return result


def generate(request: LearningPathRequest) -> LearningPathResponse:
    """Sinh lộ trình cho một người học.

    Ném ``AgentLlmError`` (hoặc ``LlmNotConfiguredError``) khi mô hình ngôn ngữ
    không dùng được — tầng API dịch thành 503. Không có nhánh nào trả về lộ
    trình dựng sẵn.
    """
    started = time.perf_counter()
    trace: list[AgentTraceEntry] = []

    profile = _record(trace, profiler.AGENT_NAME, lambda: profiler.run(request))
    gaps = _record(trace, gap_analyzer.AGENT_NAME, lambda: gap_analyzer.run(request, profile))
    plan = _record(
        trace,
        curriculum_planner.AGENT_NAME,
        lambda: curriculum_planner.run(request, profile, gaps),
    )
    resources = _record(
        trace,
        resource_retriever.AGENT_NAME,
        lambda: resource_retriever.run(plan.steps),
    )
    response = _record(
        trace,
        validator.AGENT_NAME,
        lambda: validator.run(request, plan, resources),
    )

    # Gán sau cùng, và gán một bản sao: agent 5 chạy xong thì dòng trace của
    # chính nó mới có trong danh sách.
    response.agent_trace = list(trace)

    logger.info(
        "learning_path_generated",
        user_id=request.user_id,
        steps=len(response.steps),
        weeks=response.weeks,
        total_ms=int((time.perf_counter() - started) * 1000),
    )
    return response
