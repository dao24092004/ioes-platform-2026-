"""Đọc học liệu thật từ content-service (Spring, cổng 9001).

FR-AI-004 đòi sinh câu hỏi từ **nội dung bài học có thật**, không phải corpus
tĩnh trong ``data/``. Module này là đường duy nhất để ml-worker lấy nội dung đó.

Hai lời gọi, đúng như ``CourseController`` đang phơi ra:

    GET /api/v1/courses?status=published&page=N&per_page=M
        -> PageView<CourseView>: {"data": [...], "meta": {"total", "page",
           "perPage", "totalPages"}}
    GET /api/v1/courses/{id}/detail
        -> CourseDetailView: {"course": CourseView, "chapters": [ChapterView
           {..., "lessons": [LessonView]}]}

Cả hai đều nằm sau ``anyRequest().authenticated()`` trong ``SecurityConfig`` của
content-service, nên **phải có bearer token** — đặt ``CONTENT_SERVICE_TOKEN``.
Thiếu token thì content-service trả 401 và ở đây thành ``ContentServiceError``
kèm nguyên văn mã lỗi, chứ không âm thầm coi như catalog rỗng.

Nguyên tắc: hỏng thì ném lỗi. Trả danh sách rỗng khi content-service chết sẽ
làm tầng nạp báo "đã nạp 0 tài liệu" — nghe như thành công, mà thực ra là mất
toàn bộ học liệu.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

import httpx
from ioes_common import get_logger

from ml_worker.core.config import get_settings

logger = get_logger(__name__)

#: Đường dẫn gốc của luồng khoá học. Controller đã mang sẵn ``/api/v1`` và
#: gateway không cắt tiền tố, nên gọi thẳng cổng 9001 hay qua gateway 8080 đều
#: dùng đúng đường dẫn này.
COURSES_PATH = "/api/v1/courses"

#: Chỉ lấy khoá đã xuất bản. ``CourseController.parseEnum`` nhận đúng tên enum
#: viết thường của ``CourseStatus``.
PUBLISHED_STATUS = "published"

#: Nhãn ghi vào metadata Milvus cho mọi đoạn đến từ đây. Chính nó phân biệt học
#: liệu thật với corpus tĩnh khi truy xuất và khi xoá để nạp lại.
SOURCE_NAME = "content-service"

# Tunable qua biến môi trường. Không đưa vào core/config.py vì đó là phần chung
# nhiều agent cùng sửa; ở đây chỉ cần hằng số mức module.
CONTENT_SERVICE_TOKEN = os.getenv("CONTENT_SERVICE_TOKEN", "")
CONTENT_SERVICE_TIMEOUT_SECONDS = float(os.getenv("CONTENT_SERVICE_TIMEOUT_SECONDS", "20"))
CONTENT_SERVICE_PAGE_SIZE = int(os.getenv("CONTENT_SERVICE_PAGE_SIZE", "50"))
# Chốt chặn vòng lặp phân trang: meta.totalPages hỏng thì vẫn phải dừng.
CONTENT_SERVICE_MAX_PAGES = int(os.getenv("CONTENT_SERVICE_MAX_PAGES", "50"))


class ContentServiceError(RuntimeError):
    """content-service không gọi được, từ chối, hoặc trả về thứ không đọc nổi."""


@dataclass(frozen=True)
class Lesson:
    """Một bài học. ``description`` là phần văn bản duy nhất đem đi nhúng.

    ``LessonView`` không có trường nội dung đầy đủ — chỉ ``description`` và
    ``contentUrl`` (trỏ tới video hoặc file). Bài không có description thì không
    có chữ nào để ra đề, nên tầng nạp bỏ qua nó thay vì nạp bản rỗng.
    """

    lesson_id: str
    chapter_id: str
    title: str
    description: str


@dataclass(frozen=True)
class Chapter:
    chapter_id: str
    title: str
    description: str
    lessons: list[Lesson] = field(default_factory=list)


@dataclass(frozen=True)
class Course:
    course_id: str
    title: str
    language: str
    chapters: list[Chapter] = field(default_factory=list)

    @property
    def lessons(self) -> list[tuple[Chapter, Lesson]]:
        """Mọi bài học của khoá, kèm chương chứa nó."""
        return [(chapter, lesson) for chapter in self.chapters for lesson in chapter.lessons]


def base_url() -> str:
    """Gốc URL của content-service, lấy từ cấu hình chung."""
    return get_settings().content_service_url.rstrip("/")


def _headers() -> dict[str, str]:
    headers = {"Accept": "application/json"}
    if CONTENT_SERVICE_TOKEN:
        headers["Authorization"] = f"Bearer {CONTENT_SERVICE_TOKEN}"
    return headers


def build_client() -> httpx.AsyncClient:
    """Client trỏ sẵn vào content-service. Người gọi chịu trách nhiệm đóng."""
    return httpx.AsyncClient(
        base_url=base_url(),
        timeout=CONTENT_SERVICE_TIMEOUT_SECONDS,
        headers=_headers(),
    )


def _text(value: object) -> str:
    """Chuỗi đã bỏ khoảng trắng thừa. ``null`` của JSON thành chuỗi rỗng."""
    return "" if value is None else str(value).strip()


def _language(raw: object) -> str:
    """Nhãn ngôn ngữ cho tầng nhúng: chỉ ``vi`` hoặc ``en``.

    ``ingest.split`` dùng nhãn này để quyết định có nhân thêm bản không dấu hay
    không, nên nó phải nằm trong đúng hai giá trị đó.
    """
    return "vi" if _text(raw).lower().startswith("vi") else "en"


async def _get_json(
    client: httpx.AsyncClient,
    path: str,
    params: dict[str, str | int] | None = None,
    *,
    missing_is_none: bool = False,
) -> object:
    """GET một đường dẫn, mọi trục trặc quy về ``ContentServiceError``.

    ``missing_is_none`` biến HTTP 404 thành ``None`` thay vì lỗi: khoá không tồn
    tại là **câu trả lời**, không phải sự cố hạ tầng. Tầng gọi phân biệt được
    "không có khoá này" (422 cho người dùng) với "content-service hỏng" (502).
    """
    try:
        response = await client.get(path, params=params)
    except httpx.HTTPError as exc:
        raise ContentServiceError(
            f"Không gọi được content-service tại {base_url()}{path}: {exc}"
        ) from exc

    if missing_is_none and response.status_code == 404:
        return None

    if response.status_code >= 400:
        raise ContentServiceError(
            f"content-service trả HTTP {response.status_code} cho {path}"
            + (
                " — thiếu hoặc sai CONTENT_SERVICE_TOKEN"
                if response.status_code in (401, 403)
                else ""
            )
        )

    try:
        return response.json()
    except ValueError as exc:
        raise ContentServiceError(f"content-service trả nội dung không phải JSON ở {path}") from exc


async def list_published_course_ids(client: httpx.AsyncClient) -> list[str]:
    """Id của mọi khoá đã xuất bản, đi hết các trang."""
    ids: list[str] = []
    page = 1
    while page <= CONTENT_SERVICE_MAX_PAGES:
        payload = await _get_json(
            client,
            COURSES_PATH,
            {
                "status": PUBLISHED_STATUS,
                "page": page,
                "per_page": CONTENT_SERVICE_PAGE_SIZE,
            },
        )
        if not isinstance(payload, dict):
            raise ContentServiceError(f"{COURSES_PATH} trả về {type(payload).__name__}, cần object")

        rows = payload.get("data")
        if not isinstance(rows, list):
            raise ContentServiceError(f"{COURSES_PATH} thiếu mảng 'data'")

        for row in rows:
            if isinstance(row, dict) and _text(row.get("id")):
                ids.append(_text(row["id"]))

        meta = payload.get("meta")
        total_pages = meta.get("totalPages") if isinstance(meta, dict) else None
        if not isinstance(total_pages, int) or page >= total_pages or not rows:
            break
        page += 1

    logger.info("content_courses_listed", courses=len(ids))
    return ids


async def fetch_course(client: httpx.AsyncClient, course_id: str) -> Course:
    """Một khoá kèm cây chương và bài học."""
    payload = await _get_json(client, f"{COURSES_PATH}/{course_id}/detail")
    if not isinstance(payload, dict):
        raise ContentServiceError(f"detail của khoá {course_id} không phải object")

    raw_course = payload.get("course")
    if not isinstance(raw_course, dict):
        raise ContentServiceError(f"detail của khoá {course_id} thiếu 'course'")

    chapters: list[Chapter] = []
    for raw_chapter in payload.get("chapters") or []:
        if not isinstance(raw_chapter, dict):
            continue
        chapter_id = _text(raw_chapter.get("id"))
        lessons = [
            Lesson(
                lesson_id=_text(raw_lesson.get("id")),
                chapter_id=_text(raw_lesson.get("chapterId")) or chapter_id,
                title=_text(raw_lesson.get("title")),
                description=_text(raw_lesson.get("description")),
            )
            for raw_lesson in raw_chapter.get("lessons") or []
            if isinstance(raw_lesson, dict) and _text(raw_lesson.get("id"))
        ]
        chapters.append(
            Chapter(
                chapter_id=chapter_id,
                title=_text(raw_chapter.get("title")),
                description=_text(raw_chapter.get("description")),
                lessons=lessons,
            )
        )

    return Course(
        course_id=_text(raw_course.get("id")) or _text(course_id),
        title=_text(raw_course.get("title")),
        language=_language(raw_course.get("language")),
        chapters=chapters,
    )


def is_published(raw_course: object) -> bool:
    """``CourseView.status`` đúng bằng ``published``."""
    return isinstance(raw_course, dict) and _text(raw_course.get("status")) == PUBLISHED_STATUS


async def fetch_published_courses(
    course_id: str | None = None,
    *,
    client: httpx.AsyncClient | None = None,
) -> list[Course]:
    """Học liệu của mọi khoá đã xuất bản, hoặc của đúng một khoá.

    Truyền ``course_id`` thì chỉ lấy khoá đó, và khoá phải đang ở trạng thái
    ``published`` — lấy bản nháp về ra đề là phát đề từ nội dung chưa duyệt.
    Khoá không tồn tại hoặc chưa xuất bản thì trả danh sách rỗng, để tầng gọi
    quyết định báo lỗi gì.

    Truyền ``client`` để dùng lại kết nối (và để test tiêm ``MockTransport``).
    """
    if client is not None:
        return await _fetch(client, course_id)
    async with build_client() as owned:
        return await _fetch(owned, course_id)


async def _fetch(client: httpx.AsyncClient, course_id: str | None) -> list[Course]:
    if course_id:
        payload = await _get_json(client, f"{COURSES_PATH}/{course_id}", missing_is_none=True)
        if not is_published(payload):
            logger.warning("content_course_not_published", course_id=course_id)
            return []
        course_ids = [course_id]
    else:
        course_ids = await list_published_course_ids(client)

    courses = [await fetch_course(client, cid) for cid in course_ids]
    logger.info(
        "content_material_fetched",
        courses=len(courses),
        lessons=sum(len(c.lessons) for c in courses),
    )
    return courses
