"""Agent 1 — ``profiler``: tóm tắt trình độ hiện tại của người học.

Đầu vào: ``currentSkills`` + khoá đã ghi danh (kèm tiến độ).
Đầu ra: ``LearnerProfile`` — chuyền thẳng cho agent 2.

Agent này KHÔNG được nhìn thấy ``catalog``. Nó chỉ mô tả người học đang ở đâu;
đưa danh mục khoá vào đây làm nó bắt đầu gợi ý khoá, tức giành việc của agent 3
và làm agent 2 phân tích thiếu hụt trên một bức tranh đã bị thiên lệch.
"""

from __future__ import annotations

from ioes_common import get_logger
from langchain_core.prompts import ChatPromptTemplate

from ml_worker.schemas.learning_path import LearnerProfile, LearningPathRequest
from ml_worker.services.learning_path.base import (
    JSON_ONLY_RULE,
    as_str_list,
    invoke_json,
    pick,
    request_overview,
)

logger = get_logger(__name__)

AGENT_NAME = "profiler"

_LEVELS = ("beginner", "intermediate", "advanced")

_SYSTEM_PROMPT = f"""Bạn là chuyên gia đánh giá trình độ học viên của hệ thống
học trực tuyến IOES.

Nhiệm vụ: đọc kỹ năng tự khai và các khoá học viên đã ghi danh, rồi tóm tắt
trình độ HIỆN TẠI. Chỉ mô tả cái đang có, tuyệt đối không gợi ý khoá học nào,
không nói người học nên làm gì tiếp.

{JSON_ONLY_RULE}

Lược đồ bắt buộc:
{{{{
  "level": "beginner" | "intermediate" | "advanced",
  "strengths": ["điểm mạnh cụ thể, tối đa 6 mục"],
  "summary": "2-3 câu tiếng Việt mô tả trình độ hiện tại"
}}}}

{JSON_ONLY_RULE}"""

_USER_PROMPT = """MỤC TIÊU NGHỀ NGHIỆP: {goal}

KỸ NĂNG TỰ KHAI: {skills}

CÁC KHOÁ ĐÃ GHI DANH:
{enrolled}

Hãy đánh giá trình độ hiện tại."""

PROMPT = ChatPromptTemplate.from_messages([("system", _SYSTEM_PROMPT), ("human", _USER_PROMPT)])


def _fallback(request: LearningPathRequest) -> LearnerProfile:
    """Hồ sơ dựng từ chính dữ liệu người dùng khai, không thêm suy đoán nào.

    Dùng khi mô hình gọi được nhưng trả về thứ không đọc nổi. Đây KHÔNG phải
    dữ liệu bịa: mọi chữ trong đây đều lấy từ yêu cầu gửi lên. Thà đi tiếp với
    một bản tóm tắt thô còn hơn bắt người học chờ rồi báo lỗi, vì phần quyết
    định chất lượng lộ trình nằm ở agent 3 chứ không ở đây.
    """
    completed = [course.title for course in request.enrolled if course.completed]
    strengths = [*request.current_skills[:6], *completed[:3]]
    done = f", đã hoàn thành {len(completed)} khoá" if completed else ""
    return LearnerProfile(
        level="beginner" if len(strengths) < 3 else "intermediate",
        strengths=strengths,
        summary=(
            f"Người học tự khai {len(request.current_skills)} kỹ năng"
            f"{done}. Mục tiêu: {request.goal}."
        ),
    )


def run(request: LearningPathRequest) -> tuple[LearnerProfile, str]:
    """Chạy agent 1. Trả về hồ sơ và một dòng tóm tắt cho ``agentTrace``."""
    data = invoke_json(PROMPT, request_overview(request), agent=AGENT_NAME)

    if data is None:
        profile = _fallback(request)
        logger.warning("learning_path_profiler_fallback", user_id=request.user_id)
        return profile, f"Mô hình trả JSON hỏng, dựng hồ sơ từ dữ liệu khai: {profile.level}"

    level = str(pick(data, "level", default="beginner")).strip().lower()
    if level not in _LEVELS:
        level = "beginner"

    profile = LearnerProfile(
        level=level,
        strengths=as_str_list(pick(data, "strengths", "strong_points"), limit=6),
        summary=str(pick(data, "summary", default="")).strip() or _fallback(request).summary,
    )

    logger.info(
        "learning_path_profiled",
        user_id=request.user_id,
        level=profile.level,
        strengths=len(profile.strengths),
    )
    return profile, f"Trình độ {profile.level}, {len(profile.strengths)} điểm mạnh"
