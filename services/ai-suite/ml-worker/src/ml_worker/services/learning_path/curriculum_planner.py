"""Agent 3 — ``curriculum_planner``: xếp khoá trong catalog thành chuỗi bước.

Đầu vào: yêu cầu gốc + hồ sơ (agent 1) + danh sách kỹ năng thiếu (agent 2).
Đầu ra: ``DraftPlan`` — **bản nháp**, chưa được tin.

Đây là agent duy nhất sinh ra ``courseId``, nên cũng là agent duy nhất có thể
bịa khoá học. Lời nhắc dặn chỉ được chép mã từ danh mục, nhưng dặn là một
chuyện: đo thực tế trên Gemini flash-lite, khi danh mục không có khoá nào khớp
kỹ năng đang thiếu thì mô hình tự chế ra một mã trông rất giống UUID thật rồi
đặt cho nó một cái tên hợp lý. Vì vậy agent 5 kiểm lại bằng mã, không tin lời
agent này — xem ``validator.py``.

Khác với agent 1 và 2, ở đây JSON hỏng là hỏng thật: không có bản nháp thì
không có gì để kiểm, mà đoán đại vài khoá chính là thứ hợp đồng cấm. Ném
``AgentLlmError`` để tầng API trả 503.
"""

from __future__ import annotations

from typing import Any

from ioes_common import get_logger
from langchain_core.prompts import ChatPromptTemplate

from ml_worker.schemas.learning_path import (
    DraftPlan,
    LearnerProfile,
    LearningPathRequest,
    PlannedStep,
    SkillGapReport,
)
from ml_worker.services.learning_path.base import (
    JSON_ONLY_RULE,
    AgentLlmError,
    as_float,
    as_str_list,
    format_catalog,
    format_skills,
    invoke_json,
    pick,
)

logger = get_logger(__name__)

AGENT_NAME = "curriculum_planner"

# Trần số bước. Lộ trình 20 bước thì không ai học hết, và mỗi bước thừa là một
# chỗ nữa cho mô hình bịa mã khoá.
MAX_STEPS = 12


_SYSTEM_PROMPT = f"""Bạn là người thiết kế chương trình học của hệ thống IOES.

Nhiệm vụ: xếp các khoá trong DANH MỤC thành một chuỗi bước học có thứ tự, đưa
người học từ trình độ hiện tại tới mục tiêu.

Quy tắc bắt buộc:
- `courseId` CHỈ được chép nguyên văn từ DANH MỤC bên dưới. Tuyệt đối không tự
  tạo mã mới, không đoán, không sửa một ký tự nào.
- Không có khoá nào trong danh mục phù hợp với một kỹ năng đang thiếu thì đặt
  `courseId` là null và mô tả bước tự học. Đó là cách xử lý ĐÚNG; bịa ra mã
  khoá là sai nghiêm trọng.
- Mỗi khoá xuất hiện nhiều nhất một lần.
- Xếp theo thứ tự học: nền tảng trước, nâng cao sau.
- `estimated_hours` lấy theo số giờ của khoá trong danh mục. Bước tự học thì
  ước lượng hợp lý.
- Tối đa {MAX_STEPS} bước. Ít mà đúng hơn nhiều mà thừa.

{JSON_ONLY_RULE}

Lược đồ bắt buộc:
{{{{
  "summary": "2-3 câu tiếng Việt tóm tắt lộ trình",
  "steps": [
    {{{{
      "title": "tên bước",
      "objective": "học xong bước này thì làm được gì",
      "course_id": "mã chép từ danh mục, hoặc null",
      "estimated_hours": 12,
      "skills": ["kỹ năng bước này rèn"]
    }}}}
  ]
}}}}

{JSON_ONLY_RULE}"""

_USER_PROMPT = """MỤC TIÊU NGHỀ NGHIỆP: {goal}

TRÌNH ĐỘ HIỆN TẠI (agent profiler): {level} — {profile_summary}
Điểm mạnh: {strengths}

KỸ NĂNG CÒN THIẾU, theo thứ tự nên học (agent gap_analyzer):
{gaps}
Nhận xét: {gap_summary}

QUỸ THỜI GIAN: {hours_per_week} giờ mỗi tuần.

DANH MỤC KHOÁ ĐƯỢC PHÉP DÙNG:
{catalog}

CÁC KHOÁ ĐÃ HỌC (đừng xếp lại, trừ khi tiến độ còn dở dang):
{enrolled}

Hãy xếp lộ trình."""

PROMPT = ChatPromptTemplate.from_messages([("system", _SYSTEM_PROMPT), ("human", _USER_PROMPT)])


def _format_gaps(gaps: list[str]) -> str:
    if not gaps:
        return "(không xác định được, hãy suy ra từ mục tiêu)"
    return "\n".join(f"{index}. {skill}" for index, skill in enumerate(gaps, start=1))


def _to_step(raw: Any) -> PlannedStep | None:
    """Đọc một bước từ JSON của mô hình, bỏ qua thứ không đọc được."""
    if not isinstance(raw, dict):
        return None

    title = str(pick(raw, "title", "name", default="")).strip()
    if not title:
        return None

    course_id = pick(raw, "course_id", "courseId")
    # Mô hình hay trả chuỗi "null", "none", "" thay vì null thật.
    if isinstance(course_id, str):
        course_id = course_id.strip()
        if course_id.casefold() in ("", "null", "none", "n/a"):
            course_id = None
    elif course_id is not None:
        course_id = str(course_id)

    return PlannedStep(
        title=title[:300],
        objective=str(pick(raw, "objective", "goal", default="")).strip()[:1000],
        course_id=course_id,
        estimated_hours=as_float(pick(raw, "estimated_hours", "estimatedHours"), default=0.0),
        skills=as_str_list(pick(raw, "skills"), limit=10),
    )


def run(
    request: LearningPathRequest,
    profile: LearnerProfile,
    gaps: SkillGapReport,
) -> tuple[DraftPlan, str]:
    """Chạy agent 3 trên đầu ra của agent 1 và agent 2."""
    data = invoke_json(
        PROMPT,
        {
            "goal": request.goal,
            "level": profile.level,
            "profile_summary": profile.summary or "(không có)",
            "strengths": format_skills(profile.strengths),
            "gaps": _format_gaps(gaps.missing_skills),
            "gap_summary": gaps.summary or "(không có)",
            "hours_per_week": f"{request.hours_per_week:g}",
            "catalog": format_catalog(request.catalog),
            "enrolled": "\n".join(f"- {c.title}" for c in request.enrolled) or "(chưa có)",
        },
        agent=AGENT_NAME,
    )

    if data is None:
        # Không có bản nháp thì không có lộ trình. Trả 503 chứ không dựng đại.
        raise AgentLlmError(
            "Mô hình ngôn ngữ trả về dữ liệu không đọc được khi xếp lộ trình. "
            "Vui lòng thử lại sau."
        )

    raw_steps = pick(data, "steps", "plan", default=[])
    steps: list[PlannedStep] = []
    if isinstance(raw_steps, list):
        for raw in raw_steps[:MAX_STEPS]:
            step = _to_step(raw)
            if step is not None:
                steps.append(step)

    plan = DraftPlan(
        summary=str(pick(data, "summary", default="")).strip(),
        steps=steps,
    )

    logger.info(
        "learning_path_planned",
        user_id=request.user_id,
        steps=len(plan.steps),
        catalog=len(request.catalog),
    )
    return plan, f"Đề xuất {len(plan.steps)} bước từ {len(request.catalog)} khoá trong danh mục"
