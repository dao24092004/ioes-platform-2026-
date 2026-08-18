"""ML Worker entry point.

Exposes a FastAPI app for inference calls and consumes Kafka topics for
async jobs (e.g. {@code exam.submission.submitted} -> trigger grading).
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from ioes_common import (
    configure_logging,
    configure_tracing,
    get_logger,
    instrument_fastapi,
    register_exception_handlers,
    add_request_id_middleware,
)

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(service_name="ml-worker", json_output=True)
    configure_tracing(
        service_name="ml-worker",
        otlp_endpoint=app.state.settings.otlp_endpoint,
    )
    logger.info("ml_worker_started")
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


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "ml-worker"}


@app.post("/v1/embeddings")
async def embeddings(payload: dict) -> dict:
    """Generate embeddings for a list of texts."""
    # TODO: call sentence-transformer model
    return {"vectors": [], "model": "text-embedding-3-small"}


@app.post("/v1/grade")
async def grade(submission: dict) -> dict:
    """Auto-grade an exam submission."""
    # TODO: load model, score
    return {"score": 0.0, "feedback": ""}
