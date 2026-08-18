# ============================================
# ml-worker Dockerfile (Python / FastAPI)
# ============================================
FROM python:3.11-slim AS builder

WORKDIR /build

# Install Poetry
RUN pip install --no-cache-dir poetry==1.8.2

# Copy workspace pyproject files so path-dep resolves
COPY libs/common-python/pyproject.toml /build/libs/common-python/pyproject.toml
COPY libs/common-python/README.md /build/libs/common-python/README.md
COPY libs/common-python/src /build/libs/common-python/src
COPY services/ai-suite/ml-worker/pyproject.toml /build/services/ai-suite/ml-worker/pyproject.toml
COPY services/ai-suite/ml-worker/README.md /build/services/ai-suite/ml-worker/README.md

WORKDIR /build/services/ai-suite/ml-worker
RUN poetry config virtualenvs.create false \
 && poetry install --no-root --no-interaction --no-ansi

COPY services/ai-suite/ml-worker/src ./src

# ---------- Runtime ----------
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production

# Non-root user
RUN useradd --create-home --shell /bin/bash appuser

# Copy installed deps + source
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /build/libs/common-python /app/libs/common-python
COPY --from=builder /build/services/ai-suite/ml-worker/src /app/src

USER appuser

EXPOSE 9101

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:9101/health').read()" || exit 1

CMD ["uvicorn", "src.ml_worker.main:app", "--host", "0.0.0.0", "--port", "9101", "--workers", "2"]
