"""Agent 2 — ``gap_analyzer``: so mục tiêu với trình độ, liệt kê kỹ năng thiếu.

Đầu vào: yêu cầu gốc + ``LearnerProfile`` của agent 1.
Đầu ra: ``SkillGapReport`` — danh sách kỹ năng còn thiếu, **đã xếp theo thứ tự
nên học trước - học sau**, chuyền cho agent 3.

Thứ tự là phần quan trọng nhất ở đây. Agent 3 chỉ ghép khoá vào kỹ năng; nếu
danh sách này lộn xộn thì lộ trình cũng lộn xộn theo, mà nhìn vào lộ trình thì
không biết lỗi nằm ở agent nào. Vì vậy lời nhắc bắt xếp thứ tự ngay tại đây.
"""

from __future__ import annotations

from ioes_common import get_logger
from langchain_core.prompts import ChatPromptTemplate

from ml_worker.schemas.learning_path import (
    LearnerProfile,
    LearningPathRequest,
    SkillGapReport,
)
from ml_worker.services.learning_path.base import (
    JSON_ONLY_RULE,
    as_str_list,
    format_skills,
    invoke_json,
    pick,
)

logger = get_logger(__name__)

AGENT_NAME = "gap_analyzer"

MAX_GAPS = 12

_SYSTEM_PROMPT = f"""Bạn là cố vấn học tập của hệ thống học trực tuyến IOES.

Nhiệm vụ: đối chiếu mục tiêu nghề nghiệp với trình độ hiện tại, liệt kê những
kỹ năng người học CÒN THIẾU để đạt mục tiêu.

Quy tắc:
- Không liệt kê lại kỹ năng người học đã có.
- Xếp theo thứ tự nên học trước rồi mới tới sau: kỹ năng nền tảng lên đầu,
  kỹ năng nâng cao xuống cuối.
- Mỗi kỹ năng là một cụm danh từ ngắn, không phải một câu.
- Tối đa {MAX_GAPS} kỹ năng. Không bịa kỹ năng chỉ để cho dài danh sách.

{JSON_ONLY_RULE}

Lược đồ bắt buộc:
{{{{
  "missing_skills": ["kỹ năng 1", "kỹ năng 2"],
  "summary": "2-3 câu tiếng Việt nêu khoảng cách chính giữa hiện tại và mục tiêu"
}}}}

{JSON_ONLY_RULE}"""

_USER_PROMPT = """MỤC TIÊU NGHỀ NGHIỆP: {goal}

TRÌNH ĐỘ HIỆN TẠI (do agent profiler đánh giá):
- Mức: {level}
- Điểm mạnh: {strengths}
- Nhận xét: {profile_summary}

KỸ NĂNG NGƯỜI HỌC TỰ KHAI: {skills}

Hãy liệt kê kỹ năng còn thiếu."""

PROMPT = ChatPromptTemplate.from_messages([("system", _SYSTEM_PROMPT), ("human", _USER_PROMPT)])


def _fallback(request: LearningPathRequest) -> SkillGapReport:
    """Không phân tích được thì nói thẳng là không có danh sách kỹ năng.

    Trả danh sách rỗng chứ không đoán bừa vài kỹ năng "thường gặp": agent 3 vẫn
    xếp được lộ trình từ mục tiêu và danh mục khoá, chỉ kém tinh hơn. Bịa kỹ
    năng thiếu ở đây sẽ kéo cả lộ trình lệch theo.
    """
    return SkillGapReport(
        missing_skills=[],
        summary=(
            "Chưa phân tích được khoảng cách kỹ năng, lộ trình xếp trực tiếp "
            f"theo mục tiêu: {request.goal}."
        ),
    )


def run(request: LearningPathRequest, profile: LearnerProfile) -> tuple[SkillGapReport, str]:
    """Chạy agent 2 trên đầu ra của agent 1."""
    data = invoke_json(
        PROMPT,
        {
            "goal": request.goal,
            "level": profile.level,
            "strengths": format_skills(profile.strengths),
            "profile_summary": profile.summary or "(không có)",
            "skills": format_skills(request.current_skills),
        },
        agent=AGENT_NAME,
    )

    if data is None:
        report = _fallback(request)
        logger.warning("learning_path_gap_fallback", user_id=request.user_id)
        return report, "Mô hình trả JSON hỏng, bỏ qua bước phân tích thiếu hụt"

    known = {skill.casefold() for skill in request.current_skills}
    gaps = [
        skill
        for skill in as_str_list(
            pick(data, "missing_skills", "missingSkills", "gaps"), limit=MAX_GAPS
        )
        # Mô hình vẫn liệt kê lại kỹ năng đã có dù lời nhắc cấm. Lọc bằng mã
        # cho chắc — bước học để dạy lại cái người ta đã biết là phí thời gian
        # của họ.
        if skill.casefold() not in known
    ]

    report = SkillGapReport(
        missing_skills=gaps,
        summary=str(pick(data, "summary", default="")).strip() or _fallback(request).summary,
    )

    logger.info(
        "learning_path_gaps_found",
        user_id=request.user_id,
        gaps=len(report.missing_skills),
    )
    return report, f"Thiếu {len(report.missing_skills)} kỹ năng để đạt mục tiêu"
