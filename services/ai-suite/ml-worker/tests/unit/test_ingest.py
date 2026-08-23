"""Kiểm thử tầng nạp corpus.

Không chạm Milvus và không gọi mạng — chỉ kiểm phần đọc file và cắt đoạn.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from langchain_core.documents import Document

from ml_worker.services import ingest


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
