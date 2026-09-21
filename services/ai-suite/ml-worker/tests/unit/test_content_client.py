"""Kiểm thử client đọc học liệu từ content-service.

Không có mạng: mọi lời gọi đi qua ``httpx.MockTransport`` nên vẫn là httpx
thật (đúng cách dựng URL, đúng cách ghép query, đúng cách ném lỗi truyền tải)
nhưng không có socket nào được mở.

JSON trong file này chép đúng hình dạng ``CourseResponses`` của content-service:
``PageView<CourseView>`` cho danh sách và ``CourseDetailView`` cho chi tiết.
"""

from __future__ import annotations

from typing import Any

import httpx
import pytest

from ml_worker.services import content_client
from ml_worker.services.content_client import ContentServiceError

COURSE_ID = "11111111-1111-1111-1111-111111111111"
CHAPTER_ID = "22222222-2222-2222-2222-222222222222"
LESSON_ID = "33333333-3333-3333-3333-333333333333"


def _course_row(course_id: str = COURSE_ID, status: str = "published") -> dict[str, Any]:
    return {
        "id": course_id,
        "title": "Lập trình web cơ bản",
        "language": "vi",
        "status": status,
    }


def _page(rows: list[dict[str, Any]], page: int = 1, total_pages: int = 1) -> dict[str, Any]:
    return {
        "data": rows,
        "meta": {"total": len(rows), "page": page, "perPage": 50, "totalPages": total_pages},
    }


def _detail(course_id: str = COURSE_ID) -> dict[str, Any]:
    return {
        "course": _course_row(course_id),
        "chapters": [
            {
                "id": CHAPTER_ID,
                "courseId": course_id,
                "title": "Chương 1 — HTML",
                "description": "Giới thiệu HTML",
                "sortOrder": 1,
                "isFree": True,
                "lessons": [
                    {
                        "id": LESSON_ID,
                        "chapterId": CHAPTER_ID,
                        "title": "Thẻ và thuộc tính",
                        "description": "Thẻ HTML gồm thẻ mở, nội dung và thẻ đóng.",
                        "lessonType": "text",
                        "contentUrl": None,
                        "durationMinutes": 10,
                        "sortOrder": 1,
                        "isFree": True,
                        "isPreview": False,
                    }
                ],
            }
        ],
    }


def _client(handler: Any) -> httpx.AsyncClient:
    """Client httpx thật, nhưng tầng truyền tải do test quyết định."""
    return httpx.AsyncClient(
        base_url=content_client.base_url(),
        transport=httpx.MockTransport(handler),
    )


# --- Ánh xạ JSON -> đối tượng --------------------------------------------------


async def test_fetches_published_courses_with_chapters_and_lessons() -> None:
    seen: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.url.path)
        if request.url.path == content_client.COURSES_PATH:
            assert request.url.params["status"] == "published"
            return httpx.Response(200, json=_page([_course_row()]))
        return httpx.Response(200, json=_detail())

    async with _client(handler) as client:
        courses = await content_client.fetch_published_courses(client=client)

    assert seen == [
        "/api/v1/courses",
        f"/api/v1/courses/{COURSE_ID}/detail",
    ]
    assert len(courses) == 1
    course = courses[0]
    assert course.course_id == COURSE_ID
    assert course.title == "Lập trình web cơ bản"
    assert course.language == "vi"

    chapter, lesson = course.lessons[0]
    assert chapter.chapter_id == CHAPTER_ID
    assert lesson.lesson_id == LESSON_ID
    assert lesson.chapter_id == CHAPTER_ID
    assert lesson.title == "Thẻ và thuộc tính"
    assert "thẻ mở" in lesson.description


async def test_walks_every_page_of_the_catalog(monkeypatch: pytest.MonkeyPatch) -> None:
    """Danh mục dài hơn một trang thì phải đi hết, không dừng ở trang đầu."""
    monkeypatch.setattr(content_client, "CONTENT_SERVICE_PAGE_SIZE", 1)
    second = "44444444-4444-4444-4444-444444444444"

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == content_client.COURSES_PATH:
            page = int(request.url.params["page"])
            row = _course_row() if page == 1 else _course_row(second)
            return httpx.Response(200, json=_page([row], page=page, total_pages=2))
        course_id = request.url.path.split("/")[-2]
        return httpx.Response(200, json=_detail(course_id))

    async with _client(handler) as client:
        courses = await content_client.fetch_published_courses(client=client)

    assert [c.course_id for c in courses] == [COURSE_ID, second]


async def test_narrowing_to_one_course_skips_the_catalog() -> None:
    seen: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.url.path)
        if request.url.path.endswith("/detail"):
            return httpx.Response(200, json=_detail())
        return httpx.Response(200, json=_course_row())

    async with _client(handler) as client:
        courses = await content_client.fetch_published_courses(COURSE_ID, client=client)

    assert [c.course_id for c in courses] == [COURSE_ID]
    # Không gọi danh sách khi đã biết đích danh khoá cần lấy.
    assert f"/api/v1/courses/{COURSE_ID}" in seen
    assert seen[-1].endswith("/detail")


async def test_refuses_a_course_that_is_not_published() -> None:
    """Khoá nháp chưa được duyệt; ra đề từ nó là phát đề từ nội dung chưa duyệt."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_course_row(status="draft"))

    async with _client(handler) as client:
        assert await content_client.fetch_published_courses(COURSE_ID, client=client) == []


async def test_lesson_without_description_still_comes_back_empty_not_missing() -> None:
    """Client không tự ý bỏ bài rỗng — tầng nạp mới là chỗ quyết định."""
    detail = _detail()
    detail["chapters"][0]["lessons"][0]["description"] = None

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == content_client.COURSES_PATH:
            return httpx.Response(200, json=_page([_course_row()]))
        return httpx.Response(200, json=detail)

    async with _client(handler) as client:
        courses = await content_client.fetch_published_courses(client=client)

    assert courses[0].lessons[0][1].description == ""


async def test_language_falls_back_to_english() -> None:
    """Nhãn ngôn ngữ chỉ được là vi hoặc en — ingest.split dựa vào đó."""
    detail = _detail()
    detail["course"]["language"] = "fr-FR"

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == content_client.COURSES_PATH:
            return httpx.Response(200, json=_page([_course_row()]))
        return httpx.Response(200, json=detail)

    async with _client(handler) as client:
        assert (await content_client.fetch_published_courses(client=client))[0].language == "en"


# --- content-service hỏng thì phải nổ, không được im lặng ----------------------


async def test_connection_failure_raises_instead_of_returning_nothing() -> None:
    """Trả [] khi service chết sẽ thành "đã nạp 0 tài liệu" — nghe như thành công."""

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    async with _client(handler) as client:
        with pytest.raises(ContentServiceError) as exc:
            await content_client.fetch_published_courses(client=client)

    assert "content-service" in str(exc.value)


async def test_unauthorised_says_the_token_is_missing() -> None:
    """Hai endpoint đều nằm sau authenticated(), nên 401 là lỗi cấu hình hay gặp nhất."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"message": "Unauthorized"})

    async with _client(handler) as client:
        with pytest.raises(ContentServiceError) as exc:
            await content_client.fetch_published_courses(client=client)

    assert "401" in str(exc.value)
    assert "CONTENT_SERVICE_TOKEN" in str(exc.value)


async def test_server_error_on_detail_raises() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == content_client.COURSES_PATH:
            return httpx.Response(200, json=_page([_course_row()]))
        return httpx.Response(500, json={"message": "boom"})

    async with _client(handler) as client:
        with pytest.raises(ContentServiceError):
            await content_client.fetch_published_courses(client=client)


async def test_unexpected_shape_raises() -> None:
    """Thiếu mảng data là hợp đồng đã đổi — dừng lại thay vì nạp nửa vời."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"items": []})

    async with _client(handler) as client:
        with pytest.raises(ContentServiceError):
            await content_client.fetch_published_courses(client=client)


async def test_non_json_body_raises() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>gateway</html>")

    async with _client(handler) as client:
        with pytest.raises(ContentServiceError):
            await content_client.fetch_published_courses(client=client)


# --- Cấu hình ------------------------------------------------------------------


def test_token_goes_into_the_authorization_header(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(content_client, "CONTENT_SERVICE_TOKEN", "abc.def.ghi")

    client = content_client.build_client()

    assert client.headers["authorization"] == "Bearer abc.def.ghi"


def test_no_token_means_no_authorization_header(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(content_client, "CONTENT_SERVICE_TOKEN", "")

    assert "authorization" not in content_client.build_client().headers
