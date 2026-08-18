# ioes-common

Shared library for Python AI/ML services in the IOES platform
(`ml-worker`, `content-recommender`, `proctor-detector`, `smart-grader`).

## Purpose

Avoid duplicating low-level infrastructure across services. Each service
imports a consistent set of utilities, schemas, and FastAPI helpers so the
data scientists can focus on model code.

## What's inside

| Module             | What it provides                                                                  |
| ------------------ | --------------------------------------------------------------------------------- |
| `schemas`          | `ApiResponse`, `PaginatedResponse`, `UserPrincipal`, `ErrorResponse`               |
| `exceptions`       | Domain exceptions with HTTP status mapping (`ResourceNotFoundException`, …)        |
| `logging`          | Structured (JSON) logging with OpenTelemetry trace correlation                    |
| `security`         | `create_jwt_token`, `verify_jwt_token`, `hash_password`, `get_current_user`       |
| `telemetry`        | OpenTelemetry setup + `@trace_function` decorator                                 |
| `http_client`      | `ServiceClient` (async, retried, traced inter-service calls)                      |
| `kafka_client`     | `KafkaProducer`, `KafkaConsumer` with JSON serialisation                          |
| `middleware`       | `register_exception_handlers`, `add_request_id_middleware`                        |
| `config`           | `BaseServiceSettings` (pydantic-settings)                                         |
| `ml_utils`         | `cosine_similarity`, `euclidean_distance`, `normalize_vector`, `chunk_text`, …    |
| `constants`        | `KafkaTopics`, `KafkaGroups`, `ErrorCodes`                                        |

## Install (in another service)

```bash
# Inside services/ai-suite/ml-worker/pyproject.toml
ioes-common = { path = "../../../libs/common-python" }
```

## Quick start

```python
# services/ai-suite/ml-worker/src/ml_worker/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends

from ioes_common import (
    configure_logging,
    configure_tracing,
    get_logger,
    get_current_user,
    register_exception_handlers,
    UserPrincipal,
)
from ioes_common.http_client import ServiceClient

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(service_name="ml-worker", json_output=True)
    configure_tracing("ml-worker", otlp_endpoint="http://otel-collector:4317")
    yield


app = FastAPI(title="ML Worker", lifespan=lifespan)
register_exception_handlers(app)


@app.get("/predict/{exam_id}")
async def predict(
    exam_id: str,
    user: UserPrincipal = Depends(get_current_user),
):
    async with ServiceClient(
        base_url="http://content-service:9001",
        service_name="ml-worker",
    ) as client:
        exam = await client.get(f"/exams/{exam_id}")

    logger.info("prediction_started", user=user.user_id, exam_id=exam_id)
    return {"ok": True}
```

## Tests

```bash
poetry install
poetry run pytest
poetry run pytest --cov=ioes_common --cov-report=term-missing
```
