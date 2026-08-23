"""Nạp corpus học liệu vào Milvus.

Đọc file Markdown trong ``data/corpus/``, tách frontmatter lấy ``title`` và
``doc_id``, cắt thành đoạn, nhúng, rồi ghi vào vectorstore.

Nạp lại luôn xoá collection cũ trước. Ghi đè lên collection đang có sẽ nhân đôi
dữ liệu vì mỗi lần chạy sinh khoá mới, khiến kết quả truy xuất bị trùng lặp.
"""

from __future__ import annotations

import re
from pathlib import Path

from ioes_common import get_logger
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ml_worker.core.config import get_settings
from ml_worker.db import milvus

logger = get_logger(__name__)

# Thư mục corpus nằm ở gốc service: src/ml_worker/services/ingest.py -> lên 4 cấp
_DATA_DIR = Path(__file__).resolve().parents[3] / "data"

# Hai thư mục, tách nhau có chủ đích:
#   corpus/     do scripts/crawl_corpus.py quản lý, XOÁ SẠCH trước mỗi lần chạy
#   corpus-vi/  học liệu tiếng Việt viết tay, không ai xoá
# Để chung thì mỗi lần crawl lại là mất hết phần viết tay.
CORPUS_DIRS = [_DATA_DIR / "corpus", _DATA_DIR / "corpus-vi"]

# Giữ tên cũ cho tương thích ngược với test và lời gọi bên ngoài.
CORPUS_DIR = CORPUS_DIRS[0]

_FRONTMATTER = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _parse_frontmatter(raw: str, fallback_id: str) -> tuple[dict[str, str], str]:
    """Tách khối YAML đơn giản ở đầu file khỏi phần nội dung."""
    match = _FRONTMATTER.match(raw)
    if not match:
        return {"title": fallback_id, "doc_id": fallback_id}, raw

    meta: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip()

    meta.setdefault("doc_id", fallback_id)
    meta.setdefault("title", fallback_id)
    return meta, raw[match.end() :]


def load_corpus(corpus_dir: Path | None = None) -> list[Document]:
    """Đọc học liệu.

    Truyền ``corpus_dir`` thì chỉ đọc đúng thư mục đó (dùng trong test). Bỏ
    trống thì đọc mọi thư mục trong ``CORPUS_DIRS``.
    """
    if corpus_dir is not None:
        directories = [corpus_dir]
        if not corpus_dir.is_dir():
            raise FileNotFoundError(f"Không thấy thư mục corpus: {corpus_dir}")
    else:
        directories = [d for d in CORPUS_DIRS if d.is_dir()]
        if not directories:
            raise FileNotFoundError(
                f"Không thấy thư mục corpus nào: {[str(d) for d in CORPUS_DIRS]}"
            )

    documents: list[Document] = []
    for directory in directories:
        found = 0
        for path in sorted(directory.glob("*.md")):
            raw = path.read_text(encoding="utf-8")
            meta, body = _parse_frontmatter(raw, path.stem)
            documents.append(
                Document(
                    page_content=body.strip(),
                    metadata={"doc_id": meta["doc_id"], "title": meta["title"]},
                )
            )
            found += 1
        logger.info("corpus_dir_loaded", directory=str(directory), documents=found)

    logger.info("corpus_loaded", documents=len(documents))
    return documents


def split(documents: list[Document]) -> list[Document]:
    """Cắt tài liệu thành đoạn vừa cỡ cửa sổ ngữ cảnh.

    Cắt theo thứ tự ưu tiên tiêu đề, đoạn văn, câu — giữ được ranh giới ngữ
    nghĩa thay vì cắt giữa chừng một ý. Phần gối đầu bảo đảm ý nằm vắt qua chỗ
    cắt vẫn xuất hiện trọn vẹn ở ít nhất một đoạn.
    """
    settings = get_settings()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.rag_chunk_size,
        chunk_overlap=settings.rag_chunk_overlap,
        separators=["\n## ", "\n### ", "\n\n", "\n", ". ", " "],
    )
    chunks = splitter.split_documents(documents)

    # chunk_id ổn định theo tài liệu và vị trí, để trích dẫn nguồn lần nào cũng
    # trỏ đúng chỗ.
    counters: dict[str, int] = {}
    for chunk in chunks:
        doc_id = str(chunk.metadata.get("doc_id", "unknown"))
        index = counters.get(doc_id, 0)
        counters[doc_id] = index + 1
        chunk.metadata["chunk_id"] = f"{doc_id}#{index}"

    logger.info("corpus_split", chunks=len(chunks))
    return chunks


def ingest(corpus_dir: Path | None = None, *, reset: bool = True) -> dict[str, int | str]:
    """Nạp toàn bộ corpus. Trả về số liệu để kiểm chứng."""
    settings = get_settings()
    documents = load_corpus(corpus_dir)
    chunks = split(documents)

    if reset:
        milvus.drop_collection()

    store = milvus.get_vectorstore()
    store.add_documents(chunks)

    total = milvus.count_rows()
    logger.info(
        "corpus_ingested",
        documents=len(documents),
        chunks=len(chunks),
        total_rows=total,
    )
    return {
        "documents": len(documents),
        "chunks": len(chunks),
        "collection": settings.milvus_collection,
        "total_rows": total,
    }
