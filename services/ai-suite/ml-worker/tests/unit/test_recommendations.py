"""Kiểm thử xếp hạng gợi ý khoá học (FR-AI-002).

Không nạp mô hình nhúng thật: nạp mất vài giây và vài trăm MB, mà thứ cần kiểm
ở đây là công thức chấm điểm và việc chọn ``reasonCode``, không phải chất lượng
vector. Mô hình được thay bằng túi từ khoá — hai văn bản dùng chung từ thì gần
nhau, không dùng chung thì vuông góc.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from ml_worker.api import recommendations as recommendations_api
from ml_worker.schemas.recommendations import (
    CatalogCourse,
    EnrolledCourse,
    ReasonCode,
    RecommendCoursesRequest,
)
from ml_worker.services import recommender


class _BagOfWordsEmbeddings:
    """Mô hình nhúng giả: mỗi từ khoá là một chiều, có mặt thì 1.

    Đủ để cosine phản ánh "cùng chủ đề hay không" một cách tất định, mà không
    chạm mạng hay đĩa.
    """

    VOCAB: tuple[str, ...] = ("python", "django", "javascript", "react", "guitar", "excel")

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [[1.0 if word in text.casefold() else 0.0 for word in self.VOCAB] for text in texts]


@pytest.fixture(autouse=True)
def fake_embeddings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(recommender, "get_embeddings", _BagOfWordsEmbeddings)


@pytest.fixture
def client() -> TestClient:
    """App dựng tại chỗ, chỉ gắn đúng router đang kiểm.

    Không import ``ml_worker.main``: ở đó còn các router khác đang được sửa song
    song, lỗi của họ không được làm đỏ bài test này.
    """
    app = FastAPI()
    app.include_router(recommendations_api.router)
    return TestClient(app)


def _course(
    course_id: str,
    title: str = "Khoá học",
    *,
    category_id: str | None = None,
    level: int = 1,
    enrollments: int = 0,
    short_description: str | None = None,
    created_at: datetime | None = None,
) -> CatalogCourse:
    return CatalogCourse(
        course_id=course_id,
        title=title,
        short_description=short_description,
        category_id=category_id,
        level=level,
        duration_hours=10,
        price=0,
        enrollments=enrollments,
        created_at=created_at,
    )


def _enrolled(
    course_id: str,
    title: str = "Khoá đã học",
    *,
    category_id: str | None = None,
    level: int = 1,
    progress_percent: float = 50.0,
    completed: bool = False,
) -> EnrolledCourse:
    return EnrolledCourse(
        course_id=course_id,
        title=title,
        category_id=category_id,
        level=level,
        progress_percent=progress_percent,
        completed=completed,
    )


def _request(
    catalog: list[CatalogCourse],
    enrolled: list[EnrolledCourse] | None = None,
    limit: int = 6,
) -> RecommendCoursesRequest:
    return RecommendCoursesRequest(
        user_id="user-1",
        limit=limit,
        enrolled=enrolled or [],
        catalog=catalog,
    )


# --- Người dùng mới -------------------------------------------------------


def test_cold_start_returns_most_popular_first() -> None:
    """Chưa ghi danh khoá nào thì xếp theo số người học, lý do là POPULAR."""
    result = recommender.recommend(
        _request(
            [
                _course("c-it", "Excel cho người đi làm", enrollments=10),
                _course("c-hot", "Python cơ bản", enrollments=900),
                _course("c-cold", "Guitar đệm hát", enrollments=1),
            ]
        )
    )

    assert [item.course_id for item in result.items] == ["c-hot", "c-it", "c-cold"]
    assert {item.reason_code for item in result.items} == {ReasonCode.POPULAR}
    assert result.items[0].score == 1.0
    assert result.strategy == "embedding+rules"


def test_cold_start_does_not_load_the_embedding_model(monkeypatch: pytest.MonkeyPatch) -> None:
    """Không có gì để so thì đừng nạp vài trăm MB mô hình.

    Đếm lượt gọi chứ không ném lỗi: ``_similarity_scores`` bắt mọi exception để
    lui về phần luật, nên một hàm nổ ở đây sẽ bị nuốt và bài kiểm thành vô nghĩa.
    """
    calls: list[str] = []

    def spy() -> _BagOfWordsEmbeddings:
        calls.append("loaded")
        return _BagOfWordsEmbeddings()

    monkeypatch.setattr(recommender, "get_embeddings", spy)

    assert recommender.recommend(_request([_course("c-1", enrollments=5)])).items
    assert calls == []


def test_enrolled_without_any_text_falls_back_to_cold_start() -> None:
    """Ghi danh nhưng không có chữ nào để nhúng thì coi như chưa biết gì về họ."""
    result = recommender.recommend(
        _request(
            [_course("c-1", "Python cơ bản", enrollments=50)],
            [_enrolled("c-old", title="")],
        )
    )

    assert [item.reason_code for item in result.items] == [ReasonCode.POPULAR]


# --- Loại khoá đã ghi danh ------------------------------------------------


def test_enrolled_courses_are_excluded() -> None:
    """Gợi ý lại đúng khoá người ta đang học là lỗi người dùng thấy ngay."""
    result = recommender.recommend(
        _request(
            [
                _course("c-python", "Python cơ bản", enrollments=900),
                _course("c-django", "Django thực chiến", enrollments=100),
            ],
            [_enrolled("c-python", "Python cơ bản")],
        )
    )

    assert [item.course_id for item in result.items] == ["c-django"]


def test_returns_empty_when_every_course_is_already_enrolled() -> None:
    result = recommender.recommend(
        _request(
            [_course("c-1", "Python cơ bản")],
            [_enrolled("c-1", "Python cơ bản")],
        )
    )

    assert result.items == []
    assert result.strategy == "embedding+rules"


# --- Danh mục rỗng --------------------------------------------------------


def test_empty_catalog_returns_empty_items_not_an_error() -> None:
    """Danh mục rỗng là kết quả hợp lệ, không phải sự cố."""
    result = recommender.recommend(_request([]))

    assert result.items == []


def test_empty_catalog_returns_200_over_http(client: TestClient) -> None:
    response = client.post(
        "/v1/recommendations/courses",
        json={"userId": "u-1", "limit": 6, "enrolled": [], "catalog": []},
    )

    assert response.status_code == 200
    assert response.json() == {"items": [], "strategy": "embedding+rules"}


# --- Luật cùng chuyên mục -------------------------------------------------


def test_same_category_outranks_an_otherwise_identical_course() -> None:
    """Hai khoá giống hệt nhau, khác mỗi chuyên mục: khoá cùng chủ đề phải lên trước."""
    result = recommender.recommend(
        _request(
            [
                _course("c-other", "Khoá gì đó", category_id="cat-music", enrollments=40),
                _course("c-same", "Khoá gì đó", category_id="cat-code", enrollments=40),
            ],
            [_enrolled("c-old", "Python cơ bản", category_id="cat-code")],
        )
    )

    assert [item.course_id for item in result.items] == ["c-same", "c-other"]
    assert result.items[0].reason_code == ReasonCode.SAME_CATEGORY
    assert result.items[0].score > result.items[1].score


# --- reasonCode phải khớp tín hiệu mạnh nhất ------------------------------


def test_reason_is_similar_content_when_text_drives_the_pick() -> None:
    """Không cùng chuyên mục, không phải bậc kế tiếp — chỉ còn nội dung gần nhau."""
    result = recommender.recommend(
        _request(
            [
                _course("c-django", "Django thực chiến cho lập trình viên Python", enrollments=40),
                _course("c-guitar", "Guitar đệm hát cơ bản", enrollments=40),
            ],
            [_enrolled("c-old", "Python cơ bản")],
        )
    )

    assert result.items[0].course_id == "c-django"
    assert result.items[0].reason_code == ReasonCode.SIMILAR_CONTENT
    assert result.items[0].reason == "Nội dung gần với khoá bạn đã học"


def test_reason_is_next_level_when_the_level_step_drives_the_pick() -> None:
    """Khoá ít người học nhưng đúng bậc kế tiếp vẫn phải thắng khoá đông người."""
    result = recommender.recommend(
        _request(
            [
                _course("c-step", "Khoá gì đó", level=2, enrollments=1),
                _course("c-far", "Khoá gì đó", level=4, enrollments=100),
            ],
            [_enrolled("c-old", "Khoá cũ", level=1, completed=True, progress_percent=100)],
        )
    )

    assert [item.course_id for item in result.items] == ["c-step", "c-far"]
    assert result.items[0].reason_code == ReasonCode.NEXT_LEVEL
    assert result.items[1].reason_code == ReasonCode.POPULAR


def test_reason_is_new_for_a_fresh_course_nobody_has_enrolled_in_yet() -> None:
    """Chưa ai học thì tín hiệu phổ biến bằng 0, độ mới mới có cửa quyết định."""
    result = recommender.recommend(
        _request(
            [
                _course(
                    "c-old",
                    "Khoá gì đó",
                    enrollments=0,
                    created_at=datetime(2024, 1, 1, tzinfo=UTC),
                ),
                _course(
                    "c-new",
                    "Khoá gì đó",
                    enrollments=0,
                    created_at=datetime(2026, 9, 1, tzinfo=UTC),
                ),
            ],
            [_enrolled("c-enrolled", "Python cơ bản", level=5)],
        )
    )

    assert result.items[0].course_id == "c-new"
    assert result.items[0].reason_code == ReasonCode.NEW


def test_reason_falls_back_to_popular_when_no_signal_fires() -> None:
    """Lọt vào danh sách chỉ vì còn chỗ thì nói thật, đừng bịa lý do."""
    assert recommender._pick_reason(dict.fromkeys(ReasonCode, 0.0)) == ReasonCode.POPULAR


# --- Giới hạn số lượng ----------------------------------------------------


def test_limit_is_respected() -> None:
    catalog = [_course(f"c-{index}", "Python cơ bản", enrollments=index) for index in range(10)]

    result = recommender.recommend(_request(catalog, [_enrolled("c-old", "Python cơ bản")], 3))

    assert len(result.items) == 3


def test_limit_larger_than_catalog_returns_what_exists() -> None:
    result = recommender.recommend(_request([_course("c-1", enrollments=5)], limit=50))

    assert len(result.items) == 1


# --- Tính tất định và điểm số ---------------------------------------------


def test_same_input_gives_the_same_output() -> None:
    payload = _request(
        [
            _course("c-a", "Python nâng cao", category_id="cat-code", enrollments=30),
            _course("c-b", "React từ đầu", category_id="cat-code", enrollments=30),
            _course("c-c", "Guitar đệm hát", enrollments=30),
        ],
        [_enrolled("c-old", "Python cơ bản", category_id="cat-code")],
    )

    first = recommender.recommend(payload)
    second = recommender.recommend(payload)

    assert first.model_dump() == second.model_dump()


def test_ties_are_broken_by_course_id() -> None:
    """Hai khoá bằng điểm nhau thì thứ tự vẫn phải cố định giữa các lần gọi."""
    result = recommender.recommend(
        _request(
            [
                _course("c-z", "Khoá gì đó", enrollments=7),
                _course("c-a", "Khoá gì đó", enrollments=7),
            ],
            [_enrolled("c-old", "Python cơ bản")],
        )
    )

    assert [item.course_id for item in result.items] == ["c-a", "c-z"]


def test_scores_stay_inside_zero_and_one() -> None:
    result = recommender.recommend(
        _request(
            [
                _course(
                    "c-perfect",
                    "Python nâng cao",
                    category_id="cat-code",
                    level=2,
                    enrollments=5000,
                    created_at=datetime(2026, 9, 1, tzinfo=UTC),
                ),
                _course("c-meh", "Guitar", enrollments=1),
            ],
            [_enrolled("c-old", "Python cơ bản", category_id="cat-code", level=1, completed=True)],
        )
    )

    assert all(0.0 <= item.score <= 1.0 for item in result.items)
    assert result.items[0].course_id == "c-perfect"


def test_ranking_survives_a_broken_embedding_model(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mô hình nhúng hỏng thì lui về phần luật, không được làm sập endpoint."""

    def explode() -> None:
        raise RuntimeError("không tải được mô hình")

    monkeypatch.setattr(recommender, "get_embeddings", explode)

    result = recommender.recommend(
        _request(
            [
                _course("c-same", "Khoá gì đó", category_id="cat-code", enrollments=10),
                _course("c-other", "Khoá gì đó", category_id="cat-music", enrollments=10),
            ],
            [_enrolled("c-old", "Python cơ bản", category_id="cat-code")],
        )
    )

    assert result.items[0].course_id == "c-same"
    assert result.items[0].reason_code == ReasonCode.SAME_CATEGORY


# --- Hợp đồng HTTP --------------------------------------------------------


def test_route_speaks_camel_case_both_ways(client: TestClient) -> None:
    """Tên trường là hợp đồng đã chốt với ai-gateway và web, không được đổi."""
    response = client.post(
        "/v1/recommendations/courses",
        json={
            "userId": "u-1",
            "limit": 2,
            "enrolled": [
                {
                    "courseId": "c-old",
                    "title": "Python cơ bản",
                    "categoryId": "cat-code",
                    "level": 1,
                    "progressPercent": 40,
                    "completed": False,
                }
            ],
            "catalog": [
                {
                    "courseId": "c-django",
                    "title": "Django thực chiến",
                    "shortDescription": "Dựng web bằng Python và Django",
                    "categoryId": "cat-code",
                    "level": 2,
                    "durationHours": 12,
                    "price": 0,
                    "enrollments": 25,
                }
            ],
        },
    )

    body = response.json()

    assert response.status_code == 200
    assert body["strategy"] == "embedding+rules"
    assert body["items"][0]["courseId"] == "c-django"
    assert body["items"][0]["reasonCode"] in {code.value for code in ReasonCode}
    assert 0.0 <= body["items"][0]["score"] <= 1.0
    assert body["items"][0]["reason"]


def test_route_rejects_a_request_without_user_id(client: TestClient) -> None:
    response = client.post("/v1/recommendations/courses", json={"catalog": []})

    assert response.status_code == 422


def test_route_rejects_an_out_of_range_limit(client: TestClient) -> None:
    response = client.post(
        "/v1/recommendations/courses",
        json={"userId": "u-1", "limit": 999, "catalog": []},
    )

    assert response.status_code == 422
