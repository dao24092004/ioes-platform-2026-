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


_EXPAND_INSTRUCTION = chr(10).join(
    [
        "Bạn chuẩn hoá câu hỏi của học viên để tìm kiếm tài liệu.",
        "Trả về đúng hai dòng, không thêm gì khác:",
        "VI: câu hỏi viết lại bằng tiếng Việt CÓ DẤU đầy đủ",
        (
            "EN: câu hỏi dịch sang tiếng Anh, giữ nguyên và bổ sung thuật ngữ "
            "kỹ thuật (ví dụ hỏi về rebase thì viết rõ là git rebase)"
        ),
    ]
)

_EXPAND_PROMPT = ChatPromptTemplate.from_messages(
    [("system", _EXPAND_INSTRUCTION), ("human", "{question}")]
)


def _parse_expansion(text: str) -> list[str]:
    out = []
    for line in text.splitlines():
        line = line.strip()
        for tag in ("VI:", "EN:"):
            if line.upper().startswith(tag):
                value = line[len(tag) :].strip()
                if value:
                    out.append(value)
    return out


def expand_query(question: str) -> list[str]:
    """Các cách viết lại câu hỏi, dùng để truy xuất thêm.

    Hai việc, gộp trong một lượt gọi mô hình:

    1. Thêm dấu tiếng Việt. Học viên hay gõ không dấu, mà corpus tiếng Việt thì
       có dấu đầy đủ. Đo trên bộ 20 câu hỏi chuẩn: bỏ dấu làm tỉ lệ có tài liệu
       đúng trong ngữ cảnh tụt từ 0,900 xuống 0,650 — mất hẳn 7 câu, trong đó
       có "Rebase khac merge the nao?".

    2. Dịch sang tiếng Anh. Corpus 99,5% là tiếng Anh (1,21 triệu ký tự MDN so
       với 6 nghìn ký tự viết tay tiếng Việt), mà mô hình nhúng đa ngữ ưu tiên
       trùng ngôn ngữ hơn trùng chủ đề: hỏi "Hàm trả về giá trị như thế nào?"
       thì vi-react (0,8281) và vi-rest-api (0,8166) đứng trên chính bài
       return-values (0,7895).

    Prompt yêu cầu bổ sung thuật ngữ vì bản dịch trần làm hỏng chính câu hỏi
    git: mô hình dịch "Rebase khac merge the nao?" thành "What is the difference
    between rebase and merge?" — mất chữ "git", và đó là chữ duy nhất bắc cầu
    sang bài "Git và GitHub".

    Trả danh sách rỗng khi mô hình lỗi: truy xuất một truy vấn vẫn chạy được.
    """
    try:
        message = (_EXPAND_PROMPT | get_chat_model()).invoke({"question": question})
    except Exception as exc:  # noqa: BLE001 - hỏng thì lui về một truy vấn
        logger.warning("query_expansion_failed", error=str(exc))
        return []

    variants = _parse_expansion(str(getattr(message, "content", "")))
    variants = [v for v in variants if v.casefold() != question.casefold()]
    logger.info("query_expanded", original=question, variants=variants)
    return variants


# Trộn kết quả của nhiều truy vấn bằng Reciprocal Rank Fusion. Không cộng điểm
# vì điểm của hai truy vấn không cùng thang: câu tiếng Việt luôn được cộng thêm
# nhờ trùng ngôn ngữ với nhóm tài liệu tiếng Việt.
RRF_K = 60


def _fuse(pools: list[list[tuple[Document, float]]], limit: int) -> list[tuple[Document, float]]:
    """Gộp nhiều danh sách kết quả, xếp lại theo tổng nghịch đảo thứ hạng."""
    if len(pools) == 1:
        return pools[0][:limit]

    ranking: dict[str, float] = {}
    best: dict[str, tuple[Document, float]] = {}
    for pool in pools:
        for rank, (doc, score) in enumerate(pool):
            key = str(doc.metadata.get("chunk_id") or id(doc))
            ranking[key] = ranking.get(key, 0.0) + 1.0 / (RRF_K + rank + 1)
            # Giữ điểm tương đồng cao nhất để ngưỡng lọc và phần trích dẫn vẫn
            # đọc được số có ý nghĩa, thay vì điểm RRF vốn chỉ dùng để xếp hạng.
            if key not in best or score > best[key][1]:
                best[key] = (doc, score)

    order = sorted(ranking, key=lambda k: -ranking[k])
    return [best[key] for key in order[:limit]]


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
    queries = [question, *expand_query(question)]

    pools = [store.similarity_search_with_score(q, k=k) for q in queries]
    # HỢP hai bể chứ không cắt xuống k. Cắt là để hai bể tranh nhau chỗ, mà bể
    # dịch luôn giành được nửa số chỗ kể cả khi nó không có gì liên quan: hỏi
    # "Rebase khac merge the nao?" thì không tài liệu tiếng Anh nào nói về git,
    # nhưng 4 đoạn rác vẫn chiếm chỗ và đẩy bài Git và GitHub ra ngoài — câu này
    # trước đó trả lời được, sau khi cắt thì bị từ chối.
    # Hợp lại thì thêm bản dịch chỉ có thể thêm tài liệu, không lấy đi cái nào.
    hits = _fuse(pools, limit=k * len(pools))

    kept = [(doc, score) for doc, score in hits if score >= settings.rag_score_threshold]
    logger.info(
        "rag_retrieved",
        asked=k,
        queries=len(queries),
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
