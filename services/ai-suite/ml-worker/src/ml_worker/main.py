"""ML Worker entry point.

Phơi FastAPI cho các lời gọi suy luận. Tầng RAG phục vụ US-017: ai-gateway
(NestJS, cổng 9100) gọi sang đây, service này lo nhúng, truy xuất và sinh câu
trả lời.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from ioes_common import (
    add_request_id_middleware,
    configure_logging,
    configure_tracing,
    get_logger,
    instrument_fastapi,
    register_exception_handlers,
)

from ml_worker.api.questions import router as questions_router
from ml_worker.api.rag import router as rag_router
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


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "ml-worker"}


@app.post("/v1/embeddings")
async def embeddings(payload: dict) -> dict:
    """Nhúng danh sách văn bản thành vector."""
    from ml_worker.services.embeddings import get_embeddings

    settings = get_settings()
    texts = payload.get("texts") or []
    if isinstance(texts, str):
        texts = [texts]

    vectors = get_embeddings().embed_documents(list(texts))
    return {"vectors": vectors, "model": settings.embedding_model}
