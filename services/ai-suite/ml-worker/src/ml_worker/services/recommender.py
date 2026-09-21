"""Xếp hạng khoá học gợi ý: embedding + luật, KHÔNG gọi LLM (FR-AI-002).

Điểm cuối = tổng có trọng số của năm tín hiệu, mỗi tín hiệu đã ép về 0..1:

    score = 0.40*similarity + 0.25*same_category + 0.15*next_level
          + 0.15*popularity + 0.05*newness

Tổng trọng số đúng bằng 1 nên điểm tự nằm trong 0..1, không cần co giãn lại.
``reasonCode`` là tín hiệu có **đóng góp** (trọng số × điểm) lớn nhất, chứ không
phải tín hiệu có điểm thô lớn nhất — người dùng phải được nghe đúng lý do đã
đẩy khoá đó lên.

Vì sao chuẩn hoá min-max phần tương đồng
----------------------------------------
Mô hình nhúng đang dùng là ``multilingual-e5-small``; đo trên corpus thật
(xem docstring ``services/rag.py``) mọi cặp văn bản đều rơi vào dải hẹp
0,82–0,87. Lấy thẳng cosine làm điểm thì khoá nào cũng ~0,85 và tín hiệu tương
đồng mất hết sức phân biệt, lại còn luôn thắng các luật khác khi chọn
``reasonCode``. Min-max trong đúng lô ứng viên của lượt gọi này trả lại độ trải:
khoá gần nhất được 1, khoá xa nhất được 0, thứ tự giữ nguyên.

Tính tất định
-------------
Cùng đầu vào phải cho cùng đầu ra: không dùng đồng hồ (tín hiệu NEW xếp hạng
tương đối trong chính lô ứng viên, không tính theo ``now()``), không random,
và mọi chỗ sắp xếp đều chốt hoà bằng ``courseId``.

Người dùng mới (chưa ghi danh khoá nào) đi nhánh riêng: xếp theo độ phổ biến,
``reasonCode = POPULAR``. Nhánh này còn KHÔNG nạp mô hình nhúng — không có gì để
so thì nạp vài trăm MB làm gì.
"""

from __future__ import annotations

import math
import os

from ioes_common import get_logger

from ml_worker.schemas.recommendations import (
    CatalogCourse,
    EnrolledCourse,
    ReasonCode,
    RecommendationItem,
    RecommendCoursesRequest,
    RecommendCoursesResponse,
)
from ml_worker.services.embeddings import get_embeddings

logger = get_logger(__name__)

STRATEGY = "embedding+rules"


def _env_float(name: str, default: float) -> float:
    """Đọc số thực từ biến môi trường, sai định dạng thì dùng mặc định.

    Không nhét vào ``core/config.py`` vì đây là hệ số điều chỉnh xếp hạng, đổi
    theo từng đợt đánh giá chứ không phải cấu hình hạ tầng.
    """
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        logger.warning("reco_env_invalid", name=name, value=raw, fallback=default)
        return default


def _env_int(name: str, default: int) -> int:
    return int(_env_float(name, float(default)))


# Trọng số: tương đồng nội dung nặng nhất vì nó là thứ duy nhất "hiểu" khoá học;
# chuyên mục đứng sau vì đó là tín hiệu rõ ràng nhất mà người học tự nhận ra;
# độ phổ biến và độ mới chỉ để phá thế hoà, không được lái cả danh sách.
W_SIMILARITY = _env_float("RECO_WEIGHT_SIMILARITY", 0.40)
W_SAME_CATEGORY = _env_float("RECO_WEIGHT_SAME_CATEGORY", 0.25)
W_NEXT_LEVEL = _env_float("RECO_WEIGHT_NEXT_LEVEL", 0.15)
W_POPULARITY = _env_float("RECO_WEIGHT_POPULARITY", 0.15)
W_NEWNESS = _env_float("RECO_WEIGHT_NEWNESS", 0.05)

# Chỉ nhúng chừng này khoá đã học. Người học lâu năm có thể có hàng chục khoá,
# mà mỗi lần nhúng là một lượt suy luận — chặn trên để độ trễ không trôi.
MAX_PROFILE_COURSES = _env_int("RECO_MAX_PROFILE_COURSES", 12)

REASON_TEXT: dict[ReasonCode, str] = {
    ReasonCode.SAME_CATEGORY: "Cùng chủ đề với khoá bạn đang học",
    ReasonCode.SIMILAR_CONTENT: "Nội dung gần với khoá bạn đã học",
    ReasonCode.NEXT_LEVEL: "Bước tiếp theo sau trình độ hiện tại của bạn",
    ReasonCode.POPULAR: "Được nhiều học viên lựa chọn",
    ReasonCode.NEW: "Khoá học mới trên hệ thống",
}

# Thứ tự chốt hoà khi hai tín hiệu đóng góp bằng nhau. Xếp theo mức dễ hiểu với
# người học: "cùng chủ đề" thuyết phục hơn "nội dung gần", và cả hai đều hơn
# "nhiều người học". Cố định danh sách này chính là thứ giữ kết quả tất định.
_TIE_BREAK_ORDER: tuple[ReasonCode, ...] = (
    ReasonCode.SAME_CATEGORY,
    ReasonCode.SIMILAR_CONTENT,
    ReasonCode.NEXT_LEVEL,
    ReasonCode.POPULAR,
    ReasonCode.NEW,
)


def _course_text(title: str, short_description: str | None) -> str:
    """Ghép phần chữ của một khoá thành đoạn để nhúng."""
    parts = [title.strip(), (short_description or "").strip()]
    return ". ".join(part for part in parts if part)


def _min_max(values: list[float]) -> list[float]:
    """Kéo dãn về 0..1 trong đúng lô này.

    Mọi giá trị bằng nhau thì trả về toàn 0: khi ấy tín hiệu không phân biệt
    được ứng viên nào với ứng viên nào, cho 1 hết chỉ làm nó cướp ``reasonCode``
    của tín hiệu thực sự có ý kiến.
    """
    if not values:
        return []
    low, high = min(values), max(values)
    if high - low < 1e-9:
        return [0.0 for _ in values]
    span = high - low
    return [(value - low) / span for value in values]


def _popularity_scores(candidates: list[CatalogCourse]) -> list[float]:
    """Độ phổ biến theo thang log, chia cho khoá đông nhất.

    Log vì số ghi danh lệch rất mạnh: một khoá 5000 người không "hợp gấp 100
    lần" khoá 50 người. Chia cho max (không phải min-max) để giữ nghĩa tuyệt
    đối — khoá 0 người học luôn được 0, kể cả khi nó là khoá ít nhất trong lô.
    """
    raw = [math.log1p(max(course.enrollments, 0)) for course in candidates]
    ceiling = max(raw, default=0.0)
    if ceiling < 1e-9:
        return [0.0 for _ in candidates]
    return [value / ceiling for value in raw]


def _newness_scores(candidates: list[CatalogCourse]) -> list[float]:
    """Độ mới, xếp tương đối trong lô ứng viên.

    Dùng mốc của chính lô chứ không so với ``now()``: một hàm xếp hạng phụ thuộc
    đồng hồ thì không kiểm thử được và cùng đầu vào cho hai đầu ra khác nhau.
    Khoá thiếu ``createdAt`` nhận 0 — không đoán tuổi khoá từ số ghi danh.
    """
    stamps = [c.created_at.timestamp() for c in candidates if c.created_at is not None]
    if len(stamps) < 2:
        return [0.0 for _ in candidates]
    low, high = min(stamps), max(stamps)
    span = high - low
    if span < 1e-9:
        return [0.0 for _ in candidates]
    return [
        0.0 if c.created_at is None else (c.created_at.timestamp() - low) / span for c in candidates
    ]


def _cosine(left: list[float], right: list[float]) -> float:
    """Cosine tự tính, không tin vào việc vector đã được chuẩn hoá sẵn.

    ``get_embeddings()`` bật ``normalize_embeddings`` nên tích vô hướng là đủ,
    nhưng hàm này còn chạy với vector giả trong test; chia chuẩn cho chắc.
    """
    dot = sum(a * b for a, b in zip(left, right, strict=False))
    norm_left = math.sqrt(sum(a * a for a in left))
    norm_right = math.sqrt(sum(b * b for b in right))
    if norm_left < 1e-12 or norm_right < 1e-12:
        return 0.0
    return dot / (norm_left * norm_right)


def _similarity_scores(profile_texts: list[str], candidates: list[CatalogCourse]) -> list[float]:
    """Độ gần nội dung giữa khoá đã học và từng ứng viên.

    Lấy **max** trên các khoá đã học chứ không lấy trung bình: người học một khoá
    tiếng Anh và một khoá Python thì gợi ý Python nâng cao phải ăn điểm cao, chứ
    không bị khoá tiếng Anh kéo xuống mức trung bình.

    Nhúng cả hai phía bằng ``embed_documents``: đây là so đoạn với đoạn (mô tả
    khoá với mô tả khoá), không phải câu hỏi với đoạn, nên cùng tiền tố
    ``passage:`` mới đúng cách E5 được huấn luyện.

    Mô hình nhúng hỏng hoặc chưa tải được thì trả 0 hết và ghi log: phần luật
    vẫn gợi ý được, thà kém tinh hơn là cả endpoint chết.
    """
    candidate_texts = [_course_text(c.title, c.short_description) for c in candidates]
    if not profile_texts or not any(candidate_texts):
        return [0.0 for _ in candidates]

    try:
        model = get_embeddings()
        profile_vectors = model.embed_documents(profile_texts)
        candidate_vectors = model.embed_documents(candidate_texts)
    except Exception as exc:  # noqa: BLE001 - thiếu mô hình thì lui về luật
        logger.warning("reco_embedding_failed", error=str(exc), candidates=len(candidates))
        return [0.0 for _ in candidates]

    raw = [
        max((_cosine(vector, profile) for profile in profile_vectors), default=0.0)
        for vector in candidate_vectors
    ]
    # Chuẩn hoá vì cosine của E5 bị nén vào dải rất hẹp — xem docstring đầu file.
    return _min_max(raw)


def _profile_texts(enrolled: list[EnrolledCourse], catalog: list[CatalogCourse]) -> list[str]:
    """Đoạn văn mô tả những gì người học đang học.

    Ưu tiên khoá đang học dở (progress cao) khi phải cắt bớt: đó là mối quan tâm
    hiện tại, sát với thứ người ta muốn học tiếp hơn là khoá bỏ dở từ lâu.
    ``courseId`` chốt hoà để thứ tự không đổi giữa hai lần gọi.

    Mô tả ngắn lấy từ catalog nếu khoá đã học vẫn còn trong danh mục: bản thân
    ``enrolled`` theo hợp đồng chỉ có ``title``, mà một dòng tiêu đề thì quá
    mỏng để nhúng cho ra hồn.
    """
    descriptions = {c.course_id: c.short_description for c in catalog}
    ordered = sorted(enrolled, key=lambda c: (-c.progress_percent, c.course_id))
    texts = [
        _course_text(course.title, descriptions.get(course.course_id))
        for course in ordered[:MAX_PROFILE_COURSES]
    ]
    return [text for text in texts if text]


def _target_level(enrolled: list[EnrolledCourse]) -> int | None:
    """Trình độ người học đang ở.

    Lấy trình độ cao nhất trong các khoá **đã hoàn thành**; chưa hoàn thành khoá
    nào thì lấy trình độ cao nhất đang học — đang học dở nghĩa là chưa chắc qua
    được, nhưng vẫn là mốc tốt hơn con số rỗng.
    """
    completed = [c.level for c in enrolled if c.completed]
    if completed:
        return max(completed)
    levels = [c.level for c in enrolled]
    return max(levels) if levels else None


def _next_level_score(level: int, target: int | None) -> float:
    """1.0 cho đúng bậc kế tiếp, 0.5 cho cùng bậc, 0 cho bậc thấp hơn.

    Bậc thấp hơn không phải là "gợi ý dở" mà là "đã qua rồi", nên không cộng gì;
    bậc nhảy cóc (target + 2 trở lên) cũng 0 vì học viên sẽ đuối.
    """
    if target is None:
        return 0.0
    if level == target + 1:
        return 1.0
    if level == target:
        return 0.5
    return 0.0


def _pick_reason(contributions: dict[ReasonCode, float]) -> ReasonCode:
    """Tín hiệu đóng góp nhiều nhất vào điểm cuối.

    ``max`` duyệt theo ``_TIE_BREAK_ORDER`` nên khi hoà, phần tử đứng trước
    thắng — cố định, không phụ thuộc thứ tự dict. Mọi tín hiệu đều 0 (khoá lọt
    vào chỉ vì danh sách còn chỗ) thì nói thật là POPULAR, đừng bịa lý do.
    """
    best = max(_TIE_BREAK_ORDER, key=lambda code: contributions[code])
    return best if contributions[best] > 0.0 else ReasonCode.POPULAR


def _cold_start(candidates: list[CatalogCourse], limit: int) -> list[RecommendationItem]:
    """Người dùng mới: chưa có gì để so, xếp theo độ phổ biến.

    Hợp đồng chốt ``reasonCode = POPULAR`` cho nhánh này. Điểm lấy thẳng thang
    phổ biến (0..1) chứ không nhân trọng số, nếu không khoá đứng đầu chỉ được
    0,15 và giao diện trông như hệ thống chẳng tin vào gợi ý của chính nó.
    """
    popularity = _popularity_scores(candidates)
    ranked = sorted(
        zip(candidates, popularity, strict=True),
        key=lambda pair: (-pair[1], pair[0].course_id),
    )
    return [
        RecommendationItem(
            course_id=course.course_id,
            score=round(score, 4),
            reason=REASON_TEXT[ReasonCode.POPULAR],
            reason_code=ReasonCode.POPULAR,
        )
        for course, score in ranked[:limit]
    ]


def recommend(payload: RecommendCoursesRequest) -> RecommendCoursesResponse:
    """Xếp hạng danh mục cho một người học.

    Khoá đã ghi danh bị loại khỏi ứng viên trước khi tính bất cứ thứ gì — gợi ý
    lại thứ người ta đang học là lỗi rõ nhất mà người dùng nhìn thấy ngay.

    Danh mục rỗng, hoặc người học đã ghi danh hết, thì trả ``items`` rỗng với
    HTTP 200: đó là câu trả lời đúng, không phải sự cố.
    """
    enrolled_ids = {course.course_id for course in payload.enrolled}
    candidates = [course for course in payload.catalog if course.course_id not in enrolled_ids]

    if not candidates:
        logger.info(
            "reco_empty",
            user_id=payload.user_id,
            catalog=len(payload.catalog),
            enrolled=len(enrolled_ids),
        )
        return RecommendCoursesResponse(items=[], strategy=STRATEGY)

    profile_texts = _profile_texts(payload.enrolled, payload.catalog)
    if not profile_texts:
        items = _cold_start(candidates, payload.limit)
        logger.info(
            "reco_ranked",
            user_id=payload.user_id,
            cold_start=True,
            candidates=len(candidates),
            returned=len(items),
        )
        return RecommendCoursesResponse(items=items, strategy=STRATEGY)

    similarity = _similarity_scores(profile_texts, candidates)
    popularity = _popularity_scores(candidates)
    newness = _newness_scores(candidates)
    categories = {c.category_id for c in payload.enrolled if c.category_id}
    target = _target_level(payload.enrolled)

    scored: list[tuple[CatalogCourse, float, ReasonCode]] = []
    for index, course in enumerate(candidates):
        contributions: dict[ReasonCode, float] = {
            ReasonCode.SIMILAR_CONTENT: W_SIMILARITY * similarity[index],
            ReasonCode.SAME_CATEGORY: W_SAME_CATEGORY
            * (1.0 if course.category_id and course.category_id in categories else 0.0),
            ReasonCode.NEXT_LEVEL: W_NEXT_LEVEL * _next_level_score(course.level, target),
            ReasonCode.POPULAR: W_POPULARITY * popularity[index],
            ReasonCode.NEW: W_NEWNESS * newness[index],
        }
        # Kẹp lại phòng khi ai đó chỉnh trọng số qua env cho tổng vượt 1 —
        # schema giới hạn score trong 0..1, vượt là 500 chứ không phải điểm xấu.
        score = min(1.0, max(0.0, sum(contributions.values())))
        scored.append((course, score, _pick_reason(contributions)))

    scored.sort(key=lambda row: (-row[1], row[0].course_id))
    items = [
        RecommendationItem(
            course_id=course.course_id,
            score=round(score, 4),
            reason=REASON_TEXT[reason_code],
            reason_code=reason_code,
        )
        for course, score, reason_code in scored[: payload.limit]
    ]

    logger.info(
        "reco_ranked",
        user_id=payload.user_id,
        cold_start=False,
        candidates=len(candidates),
        profile=len(profile_texts),
        returned=len(items),
        top_score=items[0].score if items else None,
    )
    return RecommendCoursesResponse(items=items, strategy=STRATEGY)
