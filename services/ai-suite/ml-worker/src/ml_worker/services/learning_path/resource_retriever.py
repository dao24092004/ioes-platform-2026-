"""Agent 4 — ``resource_retriever``: gắn học liệu thật vào từng bước.

Đầu vào: các bước nháp của agent 3.
Đầu ra: bảng tra ``chỉ số bước -> danh sách học liệu``, chuyền cho agent 5.

Đây là phần "RAG" trong Agentic RAG, và là agent duy nhất không gọi mô hình
sinh: nó chỉ truy xuất. Dùng lại đúng ``services.rag.retrieve`` của chuỗi hỏi
đáp thay vì viết bản song song — cùng collection, cùng ngưỡng điểm, cùng cách
mở rộng truy vấn, nên học liệu gắn vào lộ trình và học liệu trợ giảng trích dẫn
luôn là một.

Không tìm được gì thì trả danh sách rỗng, KHÔNG phải lỗi. Corpus chưa nạp,
Milvus chưa chạy, hay bước học nói về thứ corpus không có — cả ba đều là
chuyện bình thường, và lộ trình vẫn dùng được khi thiếu phần đọc thêm.

Một điểm phải biết về chi phí: ``rag.retrieve`` tự gọi mô hình một lượt để mở
rộng truy vấn song ngữ, nên lộ trình 8 bước tốn thêm 8 lượt gọi. Đổi lại là
recall cao hơn hẳn trên corpus gần như toàn tiếng Anh (xem docstring của
``services/rag.py``). Lượt mở rộng nào hỏng thì ``expand_query`` tự lui về một
truy vấn, không làm sập bước nào.
"""

from __future__ import annotations

from ioes_common import get_logger

from ml_worker.schemas.learning_path import LearningResource, PlannedStep
from ml_worker.services import rag as rag_service

logger = get_logger(__name__)

AGENT_NAME = "resource_retriever"

# Ba học liệu một bước. Nhiều hơn thì phần "đọc thêm" dài hơn chính nội dung
# bước, mà đằng nào người học cũng chỉ mở một hai cái đầu.
RESOURCES_PER_STEP = 3

# Cửa sổ truy xuất rộng hơn số giữ lại, vì nhiều đoạn cùng rơi vào một tài liệu
# và sau khi gộp theo doc_id thì còn rất ít.
RETRIEVE_TOP_K = 6


def _query_for(step: PlannedStep) -> str:
    """Câu truy vấn của một bước.

    Ghép tiêu đề, mục tiêu và kỹ năng thay vì chỉ dùng tiêu đề: tiêu đề bước
    thường là tên khoá ("Lập trình Web nâng cao") — quá chung để tìm trúng
    đoạn học liệu cụ thể, trong khi danh sách kỹ năng mới là phần mang thuật
    ngữ tìm kiếm được.
    """
    parts = [step.title, step.objective, " ".join(step.skills)]
    return " ".join(part.strip() for part in parts if part and part.strip())


def _resources_for(step: PlannedStep) -> list[LearningResource]:
    query = _query_for(step)
    if not query:
        return []

    try:
        hits = rag_service.retrieve(query, top_k=RETRIEVE_TOP_K)
    except Exception as exc:  # noqa: BLE001 - Milvus chết không được làm sập lộ trình
        logger.warning("learning_path_retrieval_failed", title=step.title, error=str(exc))
        return []

    resources: list[LearningResource] = []
    seen: set[str] = set()
    for document, _score in hits:
        doc_id = str(document.metadata.get("doc_id", "")).strip()
        title = str(document.metadata.get("title", "")).strip()
        # Gộp theo tài liệu chứ không theo đoạn: ba đoạn của cùng một bài hiện
        # ra thành ba dòng giống hệt nhau thì vô nghĩa với người đọc.
        if not doc_id or doc_id in seen:
            continue
        seen.add(doc_id)
        resources.append(LearningResource(title=title or doc_id, doc_id=doc_id))
        if len(resources) >= RESOURCES_PER_STEP:
            break

    return resources


def run(steps: list[PlannedStep]) -> tuple[dict[int, list[LearningResource]], str]:
    """Chạy agent 4 trên các bước nháp.

    Khoá của bảng trả về là **chỉ số trong ``steps``**, không phải ``order``:
    agent 5 còn loại bước và đánh số lại, nên bám theo ``order`` của bản nháp
    sẽ gắn nhầm học liệu sang bước khác.
    """
    attached: dict[int, list[LearningResource]] = {}
    for index, step in enumerate(steps):
        resources = _resources_for(step)
        if resources:
            attached[index] = resources

    total = sum(len(items) for items in attached.values())
    logger.info(
        "learning_path_resources_attached",
        steps=len(steps),
        steps_with_resources=len(attached),
        resources=total,
    )
    return attached, f"Gắn {total} học liệu cho {len(attached)}/{len(steps)} bước"
