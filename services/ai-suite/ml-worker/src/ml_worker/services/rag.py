"""Chuỗi RAG: truy xuất rồi mới sinh câu trả lời.

Luồng: nhúng câu hỏi → tìm đoạn gần nhất trong Milvus → lọc theo ngưỡng điểm →
ghép vào lời nhắc → gọi mô hình → trả câu trả lời kèm nguồn.

Ai quyết định "có căn cứ hay không"
-----------------------------------
Không phải điểm tương đồng, mà là chính mô hình ngôn ngữ.

Đã đo trên corpus thật với hai mô hình nhúng:

    paraphrase-multilingual-MiniLM-L12-v2
        trong phạm vi 0.483-0.596   ngoài phạm vi 0.399-0.644
    multilingual-e5-small
        trong phạm vi 0.824-0.873   ngoài phạm vi 0.819-0.844

Cả hai đều chồng lấn. Với mô hình đầu, "Cách nấu phở bò Hà Nội" đạt 0.644 — cao
hơn mọi câu hỏi hợp lệ. Với E5, mọi điểm bị nén vào dải 0.82-0.87. KHÔNG ngưỡng
tuyệt đối nào tách được hai nhóm, nên dùng điểm số làm chốt chặn chống bịa là tự
lừa mình.

Ngưỡng vì vậy chỉ còn là sàn lọc rác thô. Việc phán đoán giao cho mô hình: lời
nhắc buộc nó trả về đúng một dấu hiệu khi ngữ cảnh không đủ, và mã ở đây đọc dấu
hiệu đó. Cách này kiểm thử được, khác với chỉnh ngưỡng theo cảm tính.

Muốn tách bằng điểm số thì phải thêm cross-encoder reranker — tốn thêm một mô
hình và một lượt suy luận mỗi câu hỏi. Chưa cần cho US-017.
"""

from __future__ import annotations

import time

from ioes_common import get_logger
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate

from ml_worker.core.config import get_settings
from ml_worker.db import milvus
from ml_worker.schemas.rag import (
    RagQueryResponse,
    RetrievedSource,
    TokenUsage,
)
from ml_worker.services.llm import active_model_name, get_chat_model

logger = get_logger(__name__)

NO_CONTEXT_ANSWER = (
    "Xin lỗi, tài liệu học tập hiện có không chứa thông tin để trả lời câu hỏi "
    "này. Bạn thử hỏi lại theo cách khác, hoặc liên hệ giảng viên phụ trách."
)

INSUFFICIENT_MARKER = "KHONG_DU_DU_LIEU"

_SYSTEM_PROMPT = f"""Bạn là trợ giảng của hệ thống học trực tuyến IOES.

Quy tắc bắt buộc:
- Chỉ trả lời dựa trên phần TÀI LIỆU được cung cấp bên dưới.
- Nếu tài liệu không chứa thông tin cần thiết, trả lời DUY NHẤT chuỗi
  {INSUFFICIENT_MARKER} và không viết thêm gì khác. Tuyệt đối không suy
  đoán, không dùng kiến thức ngoài tài liệu.
- Trả lời bằng tiếng Việt, ngắn gọn, đi thẳng vào ý chính.
- Khi dẫn một ý từ tài liệu, ghi kèm tiêu đề tài liệu đó."""

_USER_PROMPT = """TÀI LIỆU:
{context}

CÂU HỎI: {question}"""

PROMPT = ChatPromptTemplate.from_messages([("system", _SYSTEM_PROMPT), ("human", _USER_PROMPT)])


def _format_context(documents: list[tuple[Document, float]]) -> str:
    blocks = []
    for index, (doc, score) in enumerate(documents, start=1):
        title = doc.metadata.get("title", "Không rõ tiêu đề")
        blocks.append(f"[{index}] {title} (độ liên quan {score:.2f})\n{doc.page_content}")
    return "\n\n".join(blocks)


def _to_sources(documents: list[tuple[Document, float]]) -> list[RetrievedSource]:
    sources = []
    for doc, score in documents:
        excerpt = doc.page_content.strip().replace("\n", " ")
        sources.append(
            RetrievedSource(
                doc_id=str(doc.metadata.get("doc_id", "")),
                chunk_id=str(doc.metadata.get("chunk_id", "")),
                title=str(doc.metadata.get("title", "")),
                score=round(float(score), 4),
                excerpt=excerpt[:280],
            )
        )
    return sources


def _extract_usage(message: object) -> TokenUsage:
    """Đọc số token từ AIMessage.

    LangChain chuẩn hoá vào ``usage_metadata``, nhưng không phải nhà cung cấp
    nào cũng trả đủ, nên mọi trường đều để None được.
    """
    usage = getattr(message, "usage_metadata", None)
    if not usage:
        return TokenUsage()
    return TokenUsage(
        prompt_tokens=usage.get("input_tokens"),
        completion_tokens=usage.get("output_tokens"),
        total_tokens=usage.get("total_tokens"),
    )


def retrieve(question: str, top_k: int | None = None) -> list[tuple[Document, float]]:
    """Lấy các đoạn vượt ngưỡng liên quan.

    Trả về danh sách rỗng nếu không đoạn nào đủ gần — chính là tín hiệu để
    tầng trên từ chối trả lời thay vì bịa.
    """
    settings = get_settings()
    k = top_k or settings.rag_top_k

    if not milvus.collection_exists():
        logger.warning("rag_collection_missing", collection=settings.milvus_collection)
        return []

    store = milvus.get_vectorstore()
    hits = store.similarity_search_with_score(question, k=k)

    kept = [(doc, score) for doc, score in hits if score >= settings.rag_score_threshold]
    logger.info(
        "rag_retrieved",
        asked=k,
        returned=len(hits),
        kept=len(kept),
        threshold=settings.rag_score_threshold,
        best=round(hits[0][1], 4) if hits else None,
    )
    return kept


def answer(question: str, top_k: int | None = None) -> RagQueryResponse:
    """Trả lời câu hỏi dựa trên corpus."""
    started = time.perf_counter()
    documents = retrieve(question, top_k)

    if not documents:
        return RagQueryResponse(
            answer=NO_CONTEXT_ANSWER,
            sources=[],
            model=active_model_name(),
            usage=TokenUsage(),
            latency_ms=int((time.perf_counter() - started) * 1000),
            grounded=False,
        )

    chain = PROMPT | get_chat_model()
    message = chain.invoke({"context": _format_context(documents), "question": question})

    latency_ms = int((time.perf_counter() - started) * 1000)
    usage = _extract_usage(message)
    raw_answer = str(message.content).strip()

    # Mô hình báo ngữ cảnh không đủ. Truy xuất có trả về đoạn, nhưng chúng không
    # chứa câu trả lời, nên không được coi là có căn cứ và không được đem trích
    # dẫn — trích dẫn nguồn không liên quan còn tệ hơn không trích dẫn gì.
    insufficient = INSUFFICIENT_MARKER in raw_answer

    logger.info(
        "rag_answered",
        latency_ms=latency_ms,
        sources=len(documents),
        total_tokens=usage.total_tokens,
        grounded=not insufficient,
    )

    return RagQueryResponse(
        answer=NO_CONTEXT_ANSWER if insufficient else raw_answer,
        sources=[] if insufficient else _to_sources(documents),
        model=active_model_name(),
        usage=usage,
        latency_ms=latency_ms,
        grounded=not insufficient,
    )
