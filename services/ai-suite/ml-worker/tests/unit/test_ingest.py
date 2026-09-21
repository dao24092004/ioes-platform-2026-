"""Kiểm thử tầng nạp học liệu.

Không chạm Milvus và không gọi mạng: phần corpus chỉ kiểm việc đọc file và cắt
đoạn; phần content-service thay client và vectorstore bằng đối tượng giả.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from langchain_core.documents import Document

from ml_worker.api import ingest as ingest_api
from ml_worker.services import content_client, ingest


@pytest.fixture
def corpus(tmp_path: Path) -> Path:
    (tmp_path / "bai-1.md").write_text(
        "---\n"
        "title: Bài mẫu\n"
        "doc_id: bai-mau\n"
        "---\n"
        "\n"
        "# Bài mẫu\n"
        "\n"
        "Nội dung phần một.\n",
        encoding="utf-8",
    )
    (tmp_path / "bai-2.md").write_text(
        "# Không có frontmatter\n\nNội dung khác.\n", encoding="utf-8"
    )
    return tmp_path


def test_load_corpus_reads_frontmatter(corpus: Path) -> None:
    documents = ingest.load_corpus(corpus)

    assert len(documents) == 2
    first = documents[0]
    assert first.metadata["title"] == "Bài mẫu"
    assert first.metadata["doc_id"] == "bai-mau"
    assert "Nội dung phần một." in first.page_content


def test_load_corpus_strips_frontmatter_from_content(corpus: Path) -> None:
    documents = ingest.load_corpus(corpus)

    # Khối metadata không được lọt vào phần đem đi nhúng, nếu không thì
    # "title:" và "doc_id:" sẽ tham gia vào vector và làm nhiễu điểm tương đồng.
    assert "doc_id:" not in documents[0].page_content
    assert "---" not in documents[0].page_content


def test_load_corpus_falls_back_to_filename_when_no_frontmatter(corpus: Path) -> None:
    documents = ingest.load_corpus(corpus)
    second = documents[1]

    assert second.metadata["doc_id"] == "bai-2"
    assert second.metadata["title"] == "bai-2"


def test_load_corpus_raises_when_directory_missing(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        ingest.load_corpus(tmp_path / "khong-ton-tai")


def test_split_assigns_stable_chunk_ids() -> None:
    document = Document(
        page_content="\n\n".join(f"Đoạn văn số {i}." * 40 for i in range(6)),
        metadata={"doc_id": "abc", "title": "ABC"},
    )

    first_run = ingest.split([document])
    second_run = ingest.split([document])

    assert len(first_run) > 1
    ids = [chunk.metadata["chunk_id"] for chunk in first_run]
    assert ids == [f"abc#{i}" for i in range(len(first_run))]

    # Chạy lại phải ra đúng khoá cũ, nếu không thì trích dẫn nguồn của các câu
    # trả lời đã lưu sẽ trỏ sai chỗ sau mỗi lần nạp lại corpus.
    assert ids == [chunk.metadata["chunk_id"] for chunk in second_run]


def test_split_keeps_document_metadata() -> None:
    document = Document(
        page_content="Ngắn thôi.",
        metadata={"doc_id": "xyz", "title": "Tiêu đề XYZ"},
    )

    chunks = ingest.split([document])

    assert all(chunk.metadata["title"] == "Tiêu đề XYZ" for chunk in chunks)
    assert all(chunk.metadata["doc_id"] == "xyz" for chunk in chunks)


def test_split_numbers_each_document_separately() -> None:
    documents = [
        Document(page_content="A" * 50, metadata={"doc_id": "a", "title": "A"}),
        Document(page_content="B" * 50, metadata={"doc_id": "b", "title": "B"}),
    ]

    chunks = ingest.split(documents)
    ids = {chunk.metadata["chunk_id"] for chunk in chunks}

    assert "a#0" in ids
    assert "b#0" in ids


class _FakeStore:
    """Vectorstore giả, chỉ ghi lại thứ được nạp vào."""

    def __init__(self) -> None:
        self.added: list = []

    def add_documents(self, documents: list) -> None:
        self.added.extend(documents)


def test_ingest_drops_collection_before_reloading(
    corpus: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Không xoá trước thì mỗi lần nạp lại là nhân đôi dữ liệu.

    Mỗi lần chạy sinh khoá mới nên bản ghi cũ không bị ghi đè, và kết quả truy
    xuất sẽ trả về cùng một đoạn nhiều lần.
    """
    order: list[str] = []
    store = _FakeStore()
    monkeypatch.setattr(ingest.milvus, "drop_collection", lambda: order.append("drop"))
    monkeypatch.setattr(ingest.milvus, "get_vectorstore", lambda: (order.append("store"), store)[1])
    monkeypatch.setattr(ingest.milvus, "count_rows", lambda: len(store.added))

    result = ingest.ingest(corpus)

    assert order[0] == "drop"
    assert result["documents"] == 2
    assert result["total_rows"] == len(store.added)


def test_ingest_can_skip_the_reset(corpus: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    dropped = []
    monkeypatch.setattr(ingest.milvus, "drop_collection", lambda: dropped.append(1))
    monkeypatch.setattr(ingest.milvus, "get_vectorstore", lambda: _FakeStore())
    monkeypatch.setattr(ingest.milvus, "count_rows", lambda: 0)

    ingest.ingest(corpus, reset=False)

    assert dropped == []


def test_ingest_reports_the_collection_name(corpus: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ingest.milvus, "drop_collection", lambda: None)
    monkeypatch.setattr(ingest.milvus, "get_vectorstore", lambda: _FakeStore())
    monkeypatch.setattr(ingest.milvus, "count_rows", lambda: 7)

    result = ingest.ingest(corpus)

    assert result["collection"] == "course_embeddings"


def test_load_corpus_reads_every_configured_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Corpus crawl và corpus viết tay nằm ở hai thư mục khác nhau.

    Thư mục crawl bị xoá sạch trước mỗi lần chạy script, nên phần viết tay phải
    để riêng — nhưng cả hai đều phải được nạp.
    """
    crawled = tmp_path / "corpus"
    handwritten = tmp_path / "corpus-vi"
    crawled.mkdir()
    handwritten.mkdir()
    (crawled / "en.md").write_text(
        "---\ntitle: English\ndoc_id: en\n---\n\nContent.\n", encoding="utf-8"
    )
    (handwritten / "vi.md").write_text(
        "---\ntitle: Tiếng Việt\ndoc_id: vi\n---\n\nNội dung.\n", encoding="utf-8"
    )
    monkeypatch.setattr(ingest, "CORPUS_DIRS", [crawled, handwritten])

    documents = ingest.load_corpus()

    assert {d.metadata["doc_id"] for d in documents} == {"en", "vi"}


def test_load_corpus_skips_a_missing_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    present = tmp_path / "corpus"
    present.mkdir()
    (present / "a.md").write_text("---\ntitle: A\ndoc_id: a\n---\n\nNội dung.\n", encoding="utf-8")
    monkeypatch.setattr(ingest, "CORPUS_DIRS", [present, tmp_path / "khong-ton-tai"])

    assert len(ingest.load_corpus()) == 1


def test_load_corpus_raises_when_no_directory_exists(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(ingest, "CORPUS_DIRS", [tmp_path / "a", tmp_path / "b"])

    with pytest.raises(FileNotFoundError):
        ingest.load_corpus()


def test_vietnamese_chunks_get_a_diacritic_free_copy() -> None:
    """Tài liệu tiếng Việt được đánh chỉ mục thêm một bản không dấu.

    Học viên gõ không dấu rất nhiều. Nhờ mô hình viết lại câu hỏi cũng xử lý
    được, nhưng bản sao này tất định nên đường lui vẫn chạy khi hết hạn mức.
    """
    document = Document(
        page_content="Rebase viết lại lịch sử để thành đường thẳng.",
        metadata={"doc_id": "vi-git", "title": "Git và GitHub", "lang": "vi"},
    )

    chunks = ingest.split([document])

    stripped = [c for c in chunks if c.metadata["chunk_id"].endswith("~nodau")]
    assert len(stripped) == 1
    assert "viet lai lich su" in stripped[0].page_content
    # Trích dẫn vẫn phải hiện đúng tên bài, không phải bản đã bỏ dấu.
    assert stripped[0].metadata["title"] == "Git và GitHub"


def test_english_chunks_get_no_extra_copy() -> None:
    """Chỉ nhân bản phần tiếng Việt. Nhân cả 88 bài MDN là gấp đôi chỉ mục vô ích."""
    document = Document(
        page_content="The box model has four layers.",
        metadata={"doc_id": "box-model", "title": "The box model", "lang": "en"},
    )

    chunks = ingest.split([document])

    assert not [c for c in chunks if c.metadata["chunk_id"].endswith("~nodau")]


def test_chunks_carry_the_document_title() -> None:
    """Đoạn cắt từ giữa bài mất ngữ cảnh, nên gắn tiêu đề vào đầu trước khi nhúng."""
    document = Document(
        page_content="push và pop thêm hoặc bớt phần tử cuối mảng.",
        metadata={"doc_id": "arrays", "title": "Arrays", "lang": "en"},
    )

    chunk = ingest.split([document])[0]

    assert chunk.page_content.startswith("Arrays")
    # Phần thân gốc giữ lại để trích dẫn không lặp tiêu đề.
    assert not chunk.metadata["body"].startswith("Arrays")


def test_strip_diacritics_handles_d_with_stroke() -> None:
    """Chữ đ không phải là d cộng dấu phụ nên NFD không tách được, phải xử riêng."""
    assert ingest.strip_diacritics("Đường dẫn tuyệt đối") == "Duong dan tuyet doi"


# ===== Học liệu thật của content-service (FR-AI-004) =========================


def _course(
    *,
    course_id: str = "course-1",
    language: str = "vi",
    description: str = "Thẻ HTML gồm thẻ mở, nội dung và thẻ đóng.",
) -> content_client.Course:
    lesson = content_client.Lesson(
        lesson_id="lesson-1",
        chapter_id="chapter-1",
        title="Thẻ và thuộc tính",
        description=description,
    )
    chapter = content_client.Chapter(
        chapter_id="chapter-1",
        title="Chương 1 — HTML",
        description="Giới thiệu HTML",
        lessons=[lesson],
    )
    return content_client.Course(
        course_id=course_id,
        title="Lập trình web cơ bản",
        language=language,
        chapters=[chapter],
    )


def test_lesson_document_carries_the_contract_metadata() -> None:
    """Năm khoá bắt buộc của FR-AI-004, tên viết đúng như hợp đồng."""
    course = _course()
    chapter, lesson = course.lessons[0]

    document = ingest.lesson_document(course, chapter, lesson)

    assert document is not None
    assert document.metadata["courseId"] == "course-1"
    assert document.metadata["lessonId"] == "lesson-1"
    assert document.metadata["chapterId"] == "chapter-1"
    assert document.metadata["title"] == "Thẻ và thuộc tính"
    assert document.metadata["source"] == "content-service"


def test_lesson_document_keeps_the_lesson_text_and_its_context() -> None:
    course = _course()
    chapter, lesson = course.lessons[0]

    document = ingest.lesson_document(course, chapter, lesson)

    assert document is not None
    assert "thẻ mở" in document.page_content
    # Đoạn cắt từ giữa bài phải biết mình thuộc khoá nào, chương nào.
    assert "Lập trình web cơ bản" in document.page_content
    assert "Chương 1 — HTML" in document.page_content


def test_lesson_without_text_is_skipped() -> None:
    """Bài chỉ có video, không có description — không có chữ nào để ra đề."""
    course = _course(description="   ")
    chapter, lesson = course.lessons[0]

    assert ingest.lesson_document(course, chapter, lesson) is None
    assert ingest.lesson_documents([course]) == []


def test_lesson_language_drives_the_diacritic_free_copy() -> None:
    """Khoá tiếng Việt được nhân thêm bản không dấu, khoá tiếng Anh thì không."""
    vietnamese = ingest.split(ingest.lesson_documents([_course(language="vi")]))
    english = ingest.split(ingest.lesson_documents([_course(language="en")]))

    assert [c for c in vietnamese if c.metadata["chunk_id"].endswith("~nodau")]
    assert not [c for c in english if c.metadata["chunk_id"].endswith("~nodau")]


def test_content_metadata_survives_splitting() -> None:
    """Cắt đoạn xong mà mất courseId thì bộ lọc của /v1/questions/generate vô dụng."""
    chunks = ingest.split(ingest.lesson_documents([_course()]))

    assert chunks
    assert all(c.metadata["courseId"] == "course-1" for c in chunks)
    assert all(c.metadata["lessonId"] == "lesson-1" for c in chunks)
    assert all(c.metadata["source"] == "content-service" for c in chunks)


def test_corpus_chunks_carry_the_same_metadata_keys(corpus: Path) -> None:
    """Milvus khoá lược đồ theo lô ghi đầu tiên.

    Đoạn corpus thiếu courseId còn đoạn content-service thì có, nghĩa là lô nào
    ghi sau cũng bị từ chối — tuỳ thứ tự chạy mà hỏng. Vì vậy hai nguồn phải
    mang đúng một bộ khoá; phần id của corpus để rỗng.
    """
    corpus_chunk = ingest.split(ingest.load_corpus(corpus))[0]
    content_chunk = ingest.split(ingest.lesson_documents([_course()]))[0]

    assert set(corpus_chunk.metadata) == set(content_chunk.metadata)
    assert corpus_chunk.metadata["courseId"] == ""
    assert corpus_chunk.metadata["lessonId"] == ""
    assert corpus_chunk.metadata["source"] == ingest.SOURCE_CORPUS


def test_content_filter_expr_narrows_by_course() -> None:
    both = 'source == "content-service" and courseId == "course-1"'

    assert ingest.content_filter_expr() == 'source == "content-service"'
    assert ingest.content_filter_expr("course-1") == both


class _FakeContentStore(_FakeStore):
    """Vectorstore giả, ghi lại cả lời gọi xoá."""

    def __init__(self) -> None:
        super().__init__()
        self.deleted: list[str] = []

    def delete(self, expr: str | None = None, **_kwargs: object) -> None:
        self.deleted.append(str(expr))


def _stub_milvus(monkeypatch: pytest.MonkeyPatch, store: _FakeContentStore) -> list[str]:
    calls: list[str] = []
    monkeypatch.setattr(ingest.milvus, "collection_exists", lambda: True)
    monkeypatch.setattr(ingest.milvus, "get_vectorstore", lambda: store)
    monkeypatch.setattr(ingest.milvus, "count_rows", lambda: len(store.added))
    monkeypatch.setattr(ingest.milvus, "drop_collection", lambda: calls.append("drop"))
    return calls


async def _one_course(course_id: str | None = None, **_kwargs: object) -> list:
    return [_course()]


async def test_ingest_content_writes_chunks_and_reports_counts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _FakeContentStore()
    _stub_milvus(monkeypatch, store)
    monkeypatch.setattr(ingest.content_client, "fetch_published_courses", _one_course)

    result = await ingest.ingest_content()

    assert result["courses"] == 1
    assert result["documents"] == 1
    assert result["chunks"] == len(store.added)
    assert result["source"] == "content-service"
    assert store.added[0].metadata["lessonId"] == "lesson-1"


async def test_ingest_content_deletes_only_its_own_rows(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Nạp lại học liệu thật không được làm mất corpus tĩnh."""
    store = _FakeContentStore()
    dropped = _stub_milvus(monkeypatch, store)
    monkeypatch.setattr(ingest.content_client, "fetch_published_courses", _one_course)

    await ingest.ingest_content("course-1")

    assert dropped == [], "không được xoá cả collection"
    assert store.deleted == [ingest.content_filter_expr("course-1")]


async def test_ingest_content_can_skip_the_purge(monkeypatch: pytest.MonkeyPatch) -> None:
    store = _FakeContentStore()
    _stub_milvus(monkeypatch, store)
    monkeypatch.setattr(ingest.content_client, "fetch_published_courses", _one_course)

    await ingest.ingest_content(replace=False)

    assert store.deleted == []


async def test_ingest_content_lets_the_service_failure_through(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """content-service chết thì báo lỗi, không báo đã nạp 0 tài liệu."""
    store = _FakeContentStore()
    _stub_milvus(monkeypatch, store)

    async def explode(course_id: str | None = None, **_kwargs: object) -> list:
        raise content_client.ContentServiceError("connection refused")

    monkeypatch.setattr(ingest.content_client, "fetch_published_courses", explode)

    with pytest.raises(content_client.ContentServiceError):
        await ingest.ingest_content()

    assert store.added == []


# --- Route POST /v1/ingest/content --------------------------------------------


def _result(course_id: str | None, courses: int = 1) -> dict:
    return {
        "source": "content-service",
        "course_id": course_id,
        "courses": courses,
        "documents": 9 if courses else 0,
        "chunks": 31 if courses else 0,
        "collection": "course_embeddings",
        "total_rows": 431 if courses else 0,
    }


@pytest.fixture
def ingest_client() -> TestClient:
    """App tối thiểu chỉ có router nạp học liệu.

    Không dùng ``main.app``: việc đăng ký router nằm ngoài phạm vi module này.
    """
    app = FastAPI()
    app.include_router(ingest_api.router)
    return TestClient(app)


def test_ingest_endpoint_reports_what_it_ingested(
    ingest_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_ingest(course_id: str | None = None, **_kwargs: object) -> dict:
        return _result(course_id)

    monkeypatch.setattr(ingest_api.ingest_service, "ingest_content", fake_ingest)

    body = ingest_client.post("/v1/ingest/content", json={}).json()

    assert body["documents"] == 9
    assert body["chunks"] == 31
    assert body["totalRows"] == 431


def test_ingest_endpoint_passes_the_course_filter(
    ingest_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: list[str | None] = []

    async def fake_ingest(course_id: str | None = None, **_kwargs: object) -> dict:
        seen.append(course_id)
        return _result(course_id)

    monkeypatch.setattr(ingest_api.ingest_service, "ingest_content", fake_ingest)

    response = ingest_client.post("/v1/ingest/content", json={"courseId": "course-1"})

    assert response.status_code == 200
    assert seen == ["course-1"]


def test_ingest_endpoint_rejects_an_unknown_course(
    ingest_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Xin nạp một khoá mà không khớp khoá nào là lỗi, không phải thành công rỗng."""

    async def fake_ingest(course_id: str | None = None, **_kwargs: object) -> dict:
        return _result(course_id, courses=0)

    monkeypatch.setattr(ingest_api.ingest_service, "ingest_content", fake_ingest)

    response = ingest_client.post("/v1/ingest/content", json={"courseId": "khong-co"})

    assert response.status_code == 422
    assert "khong-co" in response.json()["detail"]


def test_ingest_endpoint_turns_a_dead_content_service_into_502(
    ingest_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def explode(course_id: str | None = None, **_kwargs: object) -> dict:
        raise content_client.ContentServiceError("Không gọi được content-service")

    monkeypatch.setattr(ingest_api.ingest_service, "ingest_content", explode)

    response = ingest_client.post("/v1/ingest/content", json={})

    assert response.status_code == 502
    assert "content-service" in response.json()["detail"]


def test_ingest_endpoint_rejects_an_injection_shaped_course_id(
    ingest_client: TestClient,
) -> None:
    """courseId đi thẳng vào biểu thức lọc Milvus, nên chỉ cho ký tự an toàn."""
    hostile = 'x" or source != "'

    response = ingest_client.post("/v1/ingest/content", json={"courseId": hostile})

    assert response.status_code == 422
