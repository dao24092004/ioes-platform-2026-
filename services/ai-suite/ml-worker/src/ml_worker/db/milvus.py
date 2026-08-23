"""Vectorstore Milvus cho tầng RAG.

Để LangChain quản lý lược đồ collection thay vì tự khai bằng pymilvus. Tự khai
rồi lại để LangChain ghi vào sẽ đụng nhau: nó mong đúng bộ trường của nó
(``pk``, ``text``, ``vector``, cùng các trường metadata) và tự tạo chỉ mục.

Chỉ dựng ``course_embeddings``. Hai collection còn lại khai trong
``configrepo/ai-suite.yml`` (``user_embeddings``, ``learning_path_embeddings``)
thuộc US-016, tạo khi tới lượt — dựng sẵn cái chưa dùng thì sau này lại phải
sửa lược đồ.
"""

from __future__ import annotations

from ioes_common import get_logger
from langchain_milvus import Milvus
from pymilvus import MilvusException, connections, utility

from ml_worker.core.config import get_settings
from ml_worker.services.embeddings import get_embeddings

logger = get_logger(__name__)

_CONNECTION_ALIAS = "default"

# Vector đã chuẩn hoá L2 nên tích vô hướng bằng đúng cosine similarity mà tính
# nhanh hơn. Đổi độ đo là phải nạp lại toàn bộ corpus.
METRIC_TYPE = "IP"

# HNSW đổi bộ nhớ lấy tốc độ. Corpus vài nghìn đoạn thì dư sức, và độ trễ ổn
# định hơn IVF khi số bản ghi còn nhỏ.
INDEX_PARAMS = {
    "index_type": "HNSW",
    "metric_type": METRIC_TYPE,
    "params": {"M": 16, "efConstruction": 200},
}


def connection_args() -> dict[str, str]:
    settings = get_settings()
    return {"uri": f"http://{settings.milvus_host}:{settings.milvus_port}"}


def get_vectorstore(*, auto_id: bool = True) -> Milvus:
    """Trả về vectorstore, tạo collection nếu chưa có.

    Gọi nhiều lần cho cùng kết quả — LangChain chỉ tạo khi collection chưa tồn tại.
    """
    settings = get_settings()
    return Milvus(
        embedding_function=get_embeddings(),
        collection_name=settings.milvus_collection,
        connection_args=connection_args(),
        index_params=INDEX_PARAMS,
        search_params={"metric_type": METRIC_TYPE, "params": {"ef": 64}},
        auto_id=auto_id,
        drop_old=False,
    )


def _connect() -> None:
    settings = get_settings()
    if not connections.has_connection(_CONNECTION_ALIAS):
        connections.connect(
            alias=_CONNECTION_ALIAS,
            host=settings.milvus_host,
            port=str(settings.milvus_port),
        )


def collection_exists() -> bool:
    _connect()
    return utility.has_collection(get_settings().milvus_collection)


def count_rows() -> int:
    """Số đoạn văn đang có trong collection. Chưa có collection thì trả 0."""
    if not collection_exists():
        return 0
    from pymilvus import Collection

    collection = Collection(get_settings().milvus_collection)
    collection.flush()
    return int(collection.num_entities)


def drop_collection() -> None:
    """Xoá collection. Dùng khi nạp lại corpus từ đầu và trong test."""
    _connect()
    name = get_settings().milvus_collection
    try:
        if utility.has_collection(name):
            utility.drop_collection(name)
            logger.warning("milvus_collection_dropped", name=name)
    except MilvusException as exc:
        logger.error("milvus_drop_failed", name=name, error=str(exc))
        raise
