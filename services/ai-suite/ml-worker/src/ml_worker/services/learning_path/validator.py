"""Agent 5 — ``validator``: chốt chặn cuối, chạy hoàn toàn bằng mã.

Đầu vào: yêu cầu gốc + bản nháp (agent 3) + học liệu (agent 4).
Đầu ra: ``LearningPathResponse`` đúng lược đồ hợp đồng.

**Agent này không gọi mô hình ngôn ngữ.** Đó là điều kiện để nó làm được việc
của mình: nó tồn tại để bắt lỗi của mô hình, nên bản thân nó không được phụ
thuộc vào mô hình. Hỏi mô hình "lộ trình này có khoá nào bịa không" thì cũng
chính mô hình vừa bịa ra chúng đi trả lời — vô nghĩa. Ở đây chỉ có phép so
tập hợp và phép cộng, chạy y hệt nhau mọi lần.

Bốn việc, theo đúng thứ tự:

1. Loại bước có ``courseId`` không nằm trong ``catalog`` gửi lên. Đây là chốt
   chặn chống bịa khoá học mà hợp đồng giao cho agent 5.
2. Loại khoá trùng. Mô hình hay xếp cùng một khoá hai lần ở hai tên gọi khác
   nhau khi danh mục ít khoá mà kỹ năng thiếu thì nhiều.
3. Đánh số lại ``order`` từ 1, liên tục — sau khi loại bước thì số cũ thủng lỗ
   chỗ, mà web hiển thị thẳng con số này.
4. Cộng lại tổng giờ và quy ra số tuần theo ``hoursPerWeek``. Không tin số
   ``totalEstimatedHours`` mô hình tự cộng: đo thực tế thấy nó cộng sai, và số
   này là thứ người học dùng để sắp lịch.
"""

from __future__ import annotations

import math
from datetime import UTC, datetime

from ioes_common import get_logger

from ml_worker.schemas.learning_path import (
    DraftPlan,
    LearningPathRequest,
    LearningPathResponse,
    LearningResource,
    LearningStep,
)
from ml_worker.services.llm import active_model_name

logger = get_logger(__name__)

AGENT_NAME = "validator"

# Bước tự học không gắn khoá và mô hình quên ước lượng giờ. Một tuần học của
# người bận rộn, đủ để bước không bị tính thành 0 giờ trong tổng.
DEFAULT_SELF_STUDY_HOURS = 4.0

# Trần giờ một bước. Mô hình có lúc trả 9999; số đó lọt vào tổng thì lịch học
# thành vài trăm tuần và cả lộ trình trông như hỏng.
MAX_STEP_HOURS = 200.0


def _resolve_hours(
    raw_hours: float,
    duration_hours: float | None,
) -> float:
    """Số giờ đáng tin của một bước.

    Ưu tiên số mô hình đưa ra khi nó nằm trong khoảng hợp lý; ngoài khoảng thì
    lấy số giờ thật của khoá trong danh mục; không có khoá thì lấy mặc định.
    """
    if 0 < raw_hours <= MAX_STEP_HOURS:
        return round(raw_hours, 1)
    if duration_hours and duration_hours > 0:
        return round(min(duration_hours, MAX_STEP_HOURS), 1)
    return DEFAULT_SELF_STUDY_HOURS


def run(
    request: LearningPathRequest,
    plan: DraftPlan,
    resources: dict[int, list[LearningResource]],
) -> tuple[LearningPathResponse, str]:
    """Chạy agent 5. Trả về lộ trình đã sạch, ``agentTrace`` do orchestrator gắn."""
    catalog = {course.course_id: course for course in request.catalog}

    steps: list[LearningStep] = []
    used_courses: set[str] = set()
    dropped_hallucinated: list[str] = []
    dropped_duplicate = 0

    for index, planned in enumerate(plan.steps):
        course_id = planned.course_id

        if course_id is not None:
            if course_id not in catalog:
                # Khoá mô hình bịa ra. Không sửa, không đoán khoá gần đúng —
                # loại thẳng. Gắn nhầm người học vào một khoá khác còn tệ hơn
                # là thiếu một bước.
                dropped_hallucinated.append(course_id)
                continue
            if course_id in used_courses:
                dropped_duplicate += 1
                continue
            used_courses.add(course_id)

        course = catalog.get(course_id) if course_id else None
        title = planned.title.strip() or (course.title if course else "")
        if not title:
            continue

        steps.append(
            LearningStep(
                order=len(steps) + 1,
                title=title,
                objective=planned.objective.strip() or f"Hoàn thành nội dung: {title}",
                course_id=course_id,
                estimated_hours=_resolve_hours(
                    planned.estimated_hours,
                    course.duration_hours if course else None,
                ),
                skills=planned.skills,
                resources=resources.get(index, []),
            )
        )

    total_hours = round(sum(step.estimated_hours for step in steps), 1)
    # Làm tròn LÊN: 96 giờ với 7 giờ/tuần là 13,71 tuần, mà 13 tuần thì không
    # học hết. Số tuần dùng để hứa với người học nên phải là số an toàn.
    weeks = math.ceil(total_hours / request.hours_per_week) if steps else 0

    summary = plan.summary.strip() or (
        f"Lộ trình {len(steps)} bước hướng tới mục tiêu '{request.goal}', "
        f"tổng {total_hours:g} giờ học, hoàn thành trong khoảng {weeks} tuần "
        f"với nhịp {request.hours_per_week:g} giờ mỗi tuần."
    )

    if dropped_hallucinated:
        logger.warning(
            "learning_path_dropped_unknown_courses",
            user_id=request.user_id,
            course_ids=dropped_hallucinated,
            catalog_size=len(catalog),
        )

    logger.info(
        "learning_path_validated",
        user_id=request.user_id,
        steps=len(steps),
        dropped_hallucinated=len(dropped_hallucinated),
        dropped_duplicate=dropped_duplicate,
        total_hours=total_hours,
        weeks=weeks,
    )

    response = LearningPathResponse(
        goal=request.goal,
        summary=summary,
        total_estimated_hours=total_hours,
        weeks=weeks,
        steps=steps,
        agent_trace=[],
        model=active_model_name(),
        generated_at=datetime.now(UTC),
    )

    trace = (
        f"Giữ {len(steps)}/{len(plan.steps)} bước"
        f" (loại {len(dropped_hallucinated)} khoá không có trong danh mục,"
        f" {dropped_duplicate} khoá trùng), {total_hours:g} giờ / {weeks} tuần"
    )
    return response, trace
