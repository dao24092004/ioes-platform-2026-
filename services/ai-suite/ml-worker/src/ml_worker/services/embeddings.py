"""Mô hình nhúng văn bản.

Dùng ``multilingual-e5-small``: mô hình huấn luyện riêng cho bài toán truy xuất,
hỗ trợ tiếng Việt, và vẫn 384 chiều nên dùng chung lược đồ Milvus.

Vì sao không dùng ``paraphrase-multilingual-MiniLM-L12-v2``: đó là mô hình đo
tương đồng giữa hai câu ngang hàng. Trong truy xuất, câu hỏi và đoạn văn bất đối
xứng — câu hỏi ngắn, đoạn văn dài và không cùng văn phong. Đo thực tế trên corpus
này cho thấy điểm của câu trong phạm vi (0.483–0.596) và ngoài phạm vi
(0.399–0.644) chồng lấn hoàn toàn: "Cách nấu phở bò Hà Nội" đạt 0.644, cao hơn
mọi câu hỏi hợp lệ. Không ngưỡng nào tách được, tức là mất luôn chốt chặn chống
bịa. E5 huấn luyện theo cặp truy vấn–đoạn văn nên tách được hai nhóm này.
"""

from __future__ import annotations

from functools import lru_cache

from ioes_common import get_logger
from langchain_huggingface import HuggingFaceEmbeddings

from ml_worker.core.config import get_settings

logger = get_logger(__name__)

# E5 được huấn luyện với hai tiền tố này. Bỏ tiền tố thì chất lượng truy xuất
# tụt hẳn, và trộn lẫn (nhúng corpus kiểu này, truy vấn kiểu kia) còn tệ hơn
# là không dùng tiền tố nào.
QUERY_PREFIX = "query: "
PASSAGE_PREFIX = "passage: "


class E5Embeddings(HuggingFaceEmbeddings):
    """HuggingFaceEmbeddings có thêm tiền tố mà E5 yêu cầu.

    LangChain không phơi tham số tiền tố, nên bọc lại hai phương thức. Phải bọc
    cả hai: nhúng corpus dùng ``passage:``, nhúng câu hỏi dùng ``query:``.
    """

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return super().embed_documents([f"{PASSAGE_PREFIX}{text}" for text in texts])

    def embed_query(self, text: str) -> list[float]:
        return super().embed_query(f"{QUERY_PREFIX}{text}")


@lru_cache(maxsize=1)
def get_embeddings() -> HuggingFaceEmbeddings:
    """Nạp mô hình nhúng một lần rồi dùng lại.

    Nạp mất vài giây và tốn vài trăm MB RAM, nên tuyệt đối không nạp lại theo
    từng request. ``lru_cache`` giữ đúng một thực thể cho cả tiến trình.

    Chuẩn hoá L2 bật sẵn: Milvus dùng độ đo IP, mà IP trên vector đã chuẩn hoá
    chính là cosine similarity. Tắt chuẩn hoá thì điểm số mất ý nghĩa và ngưỡng
    lọc trong cấu hình sẽ sai.
    """
    settings = get_settings()
    logger.info(
        "embedding_model_loading",
        model=settings.embedding_model,
        device=settings.model_device,
    )

    kwargs = {
        "model_name": settings.embedding_model,
        "model_kwargs": {"device": settings.model_device},
        "encode_kwargs": {
            "normalize_embeddings": True,
            "batch_size": settings.batch_size,
        },
    }

    # Chỉ họ E5 mới cần tiền tố. Mô hình khác mà thêm tiền tố sẽ tệ hơn.
    is_e5 = "e5" in settings.embedding_model.lower()
    embeddings = E5Embeddings(**kwargs) if is_e5 else HuggingFaceEmbeddings(**kwargs)

    logger.info("embedding_model_loaded", model=settings.embedding_model, e5_prefix=is_e5)
    return embeddings


def embedding_dimension() -> int:
    """Số chiều vector mà mô hình hiện tại sinh ra.

    Hỏi thẳng mô hình thay vì viết cứng 384: đổi sang mô hình khác thì
    collection phải tạo lại với đúng số chiều mới.
    """
    return len(get_embeddings().embed_query("x"))
