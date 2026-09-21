"""Phần dùng chung của năm agent: gọi mô hình và đọc JSON nó trả về.

Vì sao không dùng ``with_structured_output`` như ``services/questions.py``
-------------------------------------------------------------------------
Bên sinh câu hỏi gọi mô hình đúng một lần cho một lược đồ phẳng, nên để
LangChain ép kiểu là gọn. Ở đây ba agent gọi nối tiếp, mỗi agent nhận đầu ra
của agent trước làm đầu vào; nếu một lượt ép kiểu ném lỗi thì cả chuỗi chết mà
không biết agent nào hỏng và mô hình đã thật sự nói gì.

Nên ở đây xin JSON trần rồi tự đọc: khi mô hình trả về JSON bọc trong ``` hoặc
kèm một câu dẫn — Gemini làm thế thường xuyên dù đã dặn — vẫn cứu được, và khi
không cứu được thì log lại nguyên văn để còn lần ra.

Ranh giới giữa "hỏng" và "lệch chuẩn"
------------------------------------
- Mô hình không gọi được (hết quota, mạng lỗi, thiếu khoá) → ``AgentLlmError``
  → tầng API trả 503. Không có đường nào khác: bịa ra lộ trình là chính thứ
  hợp đồng cấm.
- Mô hình gọi được nhưng trả JSON sai hình dạng → mỗi agent tự quyết, xem
  docstring của từng agent. Agent mô tả người học thì lui về dữ liệu có sẵn
  trong yêu cầu; agent xếp lộ trình thì báo hỏng.
"""

from __future__ import annotations

import json
import time
from typing import Any

from ioes_common import get_logger
from langchain_core.prompts import ChatPromptTemplate

from ml_worker.schemas.learning_path import (
    CatalogCourse,
    EnrolledCourse,
    LearningPathRequest,
)
from ml_worker.services.llm import LlmNotConfiguredError, get_chat_model

logger = get_logger(__name__)

# Lộ trình học phải lặp lại được: cùng mục tiêu, cùng catalog thì hai lần bấm
# phải ra xấp xỉ một kết quả, nếu không người học không tin. 0,2 chứ không phải
# 0 để phần diễn đạt còn tự nhiên.
AGENT_TEMPERATURE = 0.2

# Câu dặn chung, ghép vào cuối mọi lời nhắc hệ thống. Nhắc hai lần (đầu và cuối
# lời nhắc) vì mô hình hay quên đoạn giữa khi ngữ cảnh dài.
JSON_ONLY_RULE = (
    "Trả về DUY NHẤT một đối tượng JSON hợp lệ. Không viết lời dẫn, "
    "không giải thích, không bọc trong dấu ```."
)


class AgentLlmError(RuntimeError):
    """Mô hình ngôn ngữ không dùng được cho một agent.

    Tầng API dịch thành HTTP 503. Cố tình KHÔNG có đường lui về dữ liệu giả.
    """


def _strip_fences(text: str) -> str:
    """Bỏ lớp ```json ... ``` mà mô hình hay bọc quanh JSON."""
    stripped = text.strip()
    if not stripped.startswith("```"):
        return stripped

    # Bỏ dòng mở (có thể là ``` hoặc ```json) và dòng đóng nếu có.
    lines = stripped.splitlines()
    lines = lines[1:]
    while lines and lines[-1].strip().startswith("```"):
        lines.pop()
    return "\n".join(lines).strip()


def parse_json_object(text: str) -> dict[str, Any] | None:
    """Đọc một object JSON từ câu trả lời của mô hình.

    Ba nước, từ dễ tới khó:

    1. Đọc thẳng.
    2. Bóc lớp ``` rồi đọc lại.
    3. Cắt từ dấu ``{`` đầu tiên tới dấu ``}`` cuối cùng rồi đọc lại — cứu được
       trường hợp mô hình thêm một câu dẫn kiểu "Đây là lộ trình của bạn:".

    Trả ``None`` khi cả ba nước đều thất bại. Không ném lỗi: bên gọi mới là bên
    biết mất dữ liệu này thì nên lui hay nên báo hỏng.
    """
    candidates = [text.strip(), _strip_fences(text)]

    body = _strip_fences(text)
    start, end = body.find("{"), body.rfind("}")
    if start != -1 and end > start:
        candidates.append(body[start : end + 1])

    for candidate in candidates:
        if not candidate:
            continue
        try:
            parsed = json.loads(candidate)
        except (ValueError, TypeError):
            continue
        if isinstance(parsed, dict):
            return parsed

    return None


def pick(data: dict[str, Any], *keys: str, default: Any = None) -> Any:
    """Lấy giá trị theo tên trường, chấp nhận cả camelCase lẫn snake_case.

    Lời nhắc có ghi rõ tên trường, nhưng mô hình vẫn đổi qua lại giữa hai lối
    viết giữa các lượt gọi. Chấp nhận cả hai rẻ hơn nhiều so với loại cả bước
    học chỉ vì nó ghi ``courseId`` thay vì ``course_id``.
    """
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return default


def as_str_list(value: Any, limit: int = 20) -> list[str]:
    """Ép về danh sách chuỗi. Mô hình có khi trả chuỗi ngăn cách bởi dấu phẩy."""
    if value is None:
        return []
    if isinstance(value, str):
        items = [part.strip() for part in value.split(",")]
    elif isinstance(value, (list, tuple)):
        items = [str(item).strip() for item in value if item is not None]
    else:
        return []
    return [item for item in items if item][:limit]


def as_float(value: Any, default: float = 0.0) -> float:
    """Ép về số thực. Mô hình hay trả "12 giờ" thay vì 12."""
    if isinstance(value, bool):
        return default
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        digits = "".join(ch for ch in value if ch.isdigit() or ch in ".,-")
        digits = digits.replace(",", ".").strip(".-")
        try:
            return float(digits)
        except ValueError:
            return default
    return default


def invoke_json(
    prompt: ChatPromptTemplate,
    payload: dict[str, Any],
    *,
    agent: str,
) -> dict[str, Any] | None:
    """Gọi mô hình một lượt và trả về object JSON nó nói ra.

    Ném ``AgentLlmError`` khi *không gọi được* mô hình. Trả ``None`` khi gọi
    được nhưng câu trả lời không phải JSON — hai chuyện khác hẳn nhau nên
    không gộp làm một.
    """
    started = time.perf_counter()
    try:
        message = (prompt | get_chat_model(AGENT_TEMPERATURE)).invoke(payload)
    except LlmNotConfiguredError as exc:
        raise AgentLlmError(str(exc)) from exc
    except Exception as exc:  # hết quota, mạng lỗi, 5xx của nhà cung cấp
        logger.error("learning_path_agent_llm_failed", agent=agent, error=str(exc))
        raise AgentLlmError(f"Agent '{agent}' không gọi được mô hình ngôn ngữ: {exc}") from exc

    raw = str(getattr(message, "content", "")).strip()
    parsed = parse_json_object(raw)
    if parsed is None:
        logger.warning(
            "learning_path_agent_bad_json",
            agent=agent,
            elapsed_ms=int((time.perf_counter() - started) * 1000),
            raw=raw[:500],
        )
    return parsed


# ---------------------------------------------------------------------------
# Định dạng dữ liệu yêu cầu để nhét vào lời nhắc
# ---------------------------------------------------------------------------


def format_skills(skills: list[str]) -> str:
    return ", ".join(skills) if skills else "(chưa khai báo kỹ năng nào)"


def format_enrolled(enrolled: list[EnrolledCourse]) -> str:
    """Khoá đã ghi danh, kèm tiến độ — dữ liệu cho agent 1."""
    if not enrolled:
        return "(chưa ghi danh khoá nào)"
    lines = []
    for course in enrolled:
        state = "đã hoàn thành" if course.completed else f"tiến độ {course.progress_percent:.0f}%"
        lines.append(f"- {course.title} (cấp độ {course.level}, {state})")
    return "\n".join(lines)


def format_catalog(catalog: list[CatalogCourse]) -> str:
    """Danh mục khoá cho agent 3 chọn.

    Có ``courseId`` kèm theo vì mô hình phải chép lại đúng mã đó; mô tả cắt còn
    160 ký tự để danh mục vài trăm khoá vẫn lọt cửa sổ ngữ cảnh.
    """
    if not catalog:
        return "(danh mục rỗng)"
    lines = []
    for course in catalog:
        description = (course.short_description or "").strip().replace("\n", " ")
        if len(description) > 160:
            description = description[:157] + "..."
        lines.append(
            f"- courseId={course.course_id} | {course.title} "
            f"| cấp độ {course.level} | {course.duration_hours:g} giờ"
            + (f" | {description}" if description else "")
        )
    return "\n".join(lines)


def request_overview(request: LearningPathRequest) -> dict[str, str]:
    """Phần mô tả người học, dùng lại cho cả ba agent gọi mô hình."""
    return {
        "goal": request.goal,
        "skills": format_skills(request.current_skills),
        "enrolled": format_enrolled(request.enrolled),
        "hours_per_week": f"{request.hours_per_week:g}",
    }
