"""Nạp corpus học liệu vào Milvus.

Đọc Markdown, PDF và DOCX trong ``data/corpus*/``, cắt thành đoạn, nhúng, rồi
ghi vào vectorstore. Markdown lấy ``title``/``doc_id`` từ frontmatter; PDF và
DOCX lấy tiêu đề từ metadata của chính file, ``doc_id`` từ tên file — xem
``services/document_loaders.py`` để biết vì sao DOCX cho kết quả tốt hơn PDF.

Nạp lại luôn xoá collection cũ trước. Ghi đè lên collection đang có sẽ nhân đôi
dữ liệu vì mỗi lần chạy sinh khoá mới, khiến kết quả truy xuất bị trùng lặp.
"""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path

from ioes_common import get_logger
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ml_worker.core.config import get_settings
from ml_worker.db import milvus
from ml_worker.services import document_loaders

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


def strip_diacritics(text: str) -> str:
    """Bỏ dấu tiếng Việt, giữ nguyên phần còn lại."""
    text = text.replace("đ", "d").replace("Đ", "D")
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")


def _lang_of(directory: Path) -> str:
    """Ngôn ngữ của tài liệu, suy ra từ thư mục chứa nó.

    Cần nhãn này vì mô hình nhúng đa ngữ gom cụm theo ngôn ngữ trước, theo chủ
    đề sau. Đo thực tế: hỏi "Hàm trả về giá trị như thế nào?" thì vi-react đạt
    0.8281 và vi-rest-api đạt 0.8166, đứng trên chính bài return-values (0.7895)
    — cả hai chẳng liên quan gì tới câu hỏi, chỉ được lợi vì cùng tiếng Việt.
    Tách hai bể rồi trộn theo thứ hạng thì tài liệu tiếng Anh không còn phải
    cạnh tranh với tiếng Việt bằng ngôn ngữ nữa.
    """
    return "vi" if directory.name.endswith("-vi") else "en"


def _iter_corpus_files(directory: Path) -> list[Path]:
    """Mọi file corpus đọc được trong một thư mục."""
    return [
        path
        for path in directory.iterdir()
        if path.is_file() and path.suffix.lower() in document_loaders.SUPPORTED_SUFFIXES
    ]


def _load_one(path: Path, lang: str) -> Document | None:
    """Đọc một file thành Document, hoặc None nếu không dùng được.

    Markdown mang sẵn frontmatter nên ``title``/``doc_id`` lấy từ đó. PDF và
    DOCX không có chỗ đặt metadata theo quy ước của corpus, nên ``doc_id`` lấy
    tên file — vì thế **tên file quyết định mã trích dẫn**, đổi tên file là đổi
    luôn ``chunk_id`` của mọi đoạn trong đó.
    """
    if path.suffix.lower() == document_loaders.MARKDOWN_SUFFIX:
        raw = path.read_text(encoding="utf-8")
        meta, body = _parse_frontmatter(raw, path.stem)
        title, doc_id = meta["title"], meta["doc_id"]
    else:
        try:
            title, body = document_loaders.extract(path)
        except Exception as exc:  # noqa: BLE001 - một file hỏng không chặn cả lần nạp
            logger.warning("corpus_file_unreadable", file=path.name, error=str(exc))
            return None
        doc_id = path.stem

    body = body.strip()
    if not body:
        # PDF quét ảnh trích ra chuỗi rỗng. Nạp bản rỗng thì nó vẫn chiếm chỗ
        # trong kết quả truy xuất mà chẳng có gì để đọc, nên bỏ hẳn.
        logger.warning("corpus_file_empty", file=path.name)
        return None

    return Document(
        page_content=body,
        metadata={"doc_id": doc_id, "title": title, "lang": lang},
    )


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
        skipped = 0
        for path in sorted(_iter_corpus_files(directory)):
            loaded = _load_one(path, _lang_of(directory))
            if loaded is None:
                skipped += 1
                continue
            documents.append(loaded)
            found += 1
        logger.info(
            "corpus_dir_loaded",
            directory=str(directory),
            documents=found,
            skipped=skipped,
        )

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

    # Gắn tiêu đề tài liệu vào đầu mỗi đoạn trước khi nhúng.
    #
    # Đoạn cắt ra từ giữa bài mất hết ngữ cảnh: đoạn nói về "phương thức push,
    # pop" không hề chứa chữ "Array", nên câu hỏi tiếng Việt "mảng có những
    # phương thức nào" không bám được vào đâu. Tiêu đề là dòng duy nhất nêu chủ
    # đề của cả bài, và mô hình đa ngữ khớp được "Arrays" với "mảng" ở mức tiêu
    # đề dù thân bài toàn tiếng Anh.
    #
    # Giữ nguyên phần thân trong metadata để trích dẫn không lặp tiêu đề.
    for chunk in chunks:
        title = str(chunk.metadata.get("title", "")).strip()
        chunk.metadata["body"] = chunk.page_content
        if title:
            chunk.page_content = f"{title}\n\n{chunk.page_content}"
    # Đánh chỉ mục thêm một bản không dấu cho tài liệu tiếng Việt.
    #
    # Học viên gõ không dấu rất nhiều, mà corpus tiếng Việt thì có dấu đầy đủ.
    # Đo trên bộ 20 câu hỏi chuẩn: chỉ bỏ dấu ở câu hỏi đã làm tỉ lệ có tài liệu
    # đúng trong ngữ cảnh tụt từ 0,900 xuống 0,650 — mất hẳn 7 câu.
    #
    # Nhờ mô hình viết lại câu hỏi cũng giải quyết được, nhưng mô hình hosted
    # không tất định kể cả ở nhiệt độ 0: đo hai lần liên tiếp ra 0,650 và 0,850.
    # Nhân bản ở phía corpus thì tất định, và chỉ tốn thêm 9 đoạn vì phần tiếng
    # Việt vỏn vẹn 8 tài liệu.
    #
    # Bản sao giữ nguyên doc_id và title để trích dẫn vẫn hiện đúng tên bài;
    # chunk_id thêm hậu tố để hai bản không đè nhau khi gộp kết quả.
    stripped = []
    for chunk in chunks:
        if chunk.metadata.get("lang") != "vi":
            continue
        without = strip_diacritics(chunk.page_content)
        if without == chunk.page_content:
            continue
        meta = dict(chunk.metadata)
        meta["chunk_id"] = f"{meta['chunk_id']}~nodau"
        stripped.append(Document(page_content=without, metadata=meta))
    chunks.extend(stripped)

    logger.info("corpus_split", chunks=len(chunks), khong_dau=len(stripped))
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
