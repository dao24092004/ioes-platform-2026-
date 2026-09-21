"""ML Worker entry point.

Phơi FastAPI cho các lời gọi suy luận. Tầng RAG phục vụ US-017: ai-gateway
(NestJS, cổng 9100) gọi sang đây, service này lo nhúng, truy xuất và sinh câu
trả lời.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from ioes_common import (
    add_request_id_middleware,
    configure_logging,
    configure_tracing,
    get_logger,
    instrument_fastapi,
    register_exception_handlers,
)

from ml_worker.api.ingest import router as ingest_router
from ml_worker.api.learning_path import router as learning_path_router
from ml_worker.api.proctor import router as proctor_router
from ml_worker.api.questions import router as questions_router
from ml_worker.api.rag import router as rag_router
from ml_worker.api.recommendations import router as recommendations_router
from ml_worker.core.concurrency import ServiceOverloadedError
from ml_worker.core.config import get_settings

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(service_name="ml-worker", json_output=True)
    configure_tracing(
        service_name="ml-worker",
        otlp_endpoint=settings.otlp_endpoint,
    )
    logger.info(
        "ml_worker_started",
        port=settings.app_port,
        llm_provider=settings.llm_provider,
        embedding_model=settings.embedding_model,
    )
    yield
    logger.info("ml_worker_stopped")


app = FastAPI(
    title="IOES ML Worker",
    version="1.0.0",
    lifespan=lifespan,
)
register_exception_handlers(app)
add_request_id_middleware(app)
instrument_fastapi(app)

app.include_router(rag_router)
app.include_router(questions_router)
# FR-AI-004: nạp bài học thật từ content-service vào Milvus.
app.include_router(ingest_router)
# FR-AI-002 gợi ý khoá học, FR-AI-005 lộ trình cá nhân hoá.
app.include_router(recommendations_router)
app.include_router(learning_path_router)
# FR-AI-006: exam-suite gọi thẳng /internal/ai/proctor/analyze, không qua gateway.
app.include_router(proctor_router)


@app.exception_handler(ServiceOverloadedError)
async def _overloaded(_request: Request, exc: ServiceOverloadedError) -> JSONResponse:
    """Hết chỗ cho việc nặng → 503 kèm ``Retry-After``.

    Đăng ký ở đây chứ không bắt trong từng route: cả bốn route nặng cùng đi qua
    ``run_heavy``, viết một chỗ thì không route nào quên. Handler cụ thể luôn
    thắng handler bắt ``Exception`` của ``register_exception_handlers``.
    """
    return JSONResponse(
        status_code=503,
        content={"detail": str(exc)},
        headers={"Retry-After": "30"},
    )


@app.get("/health")
async def health() -> dict:
    """Luôn trả lời tức thì.

    ``async def`` mà không chạm gì nặng là có chủ ý: không đọc Milvus, không
    chạm mô hình. Đây là thứ duy nhất nói được "tiến trình còn sống", nên nó
    không bao giờ được xếp hàng sau việc của ai. Muốn biết tầng truy xuất ra
    sao thì gọi ``GET /v1/rag/status``.
    """
    return {"status": "ok", "service": "ml-worker"}


@app.post("/v1/embeddings")
def embeddings(payload: dict) -> dict:
    """Nhúng danh sách văn bản thành vector.

    ``def`` trần: ``embed_documents`` là suy luận PyTorch trên CPU, chặn luồng.
    Xem ``core/concurrency.py``.
    """
    from ml_worker.services.embeddings import get_embeddings

    settings = get_settings()
    texts = payload.get("texts") or []
    if isinstance(texts, str):
        texts = [texts]

    vectors = get_embeddings().embed_documents(list(texts))
    return {"vectors": vectors, "model": settings.embedding_model}
