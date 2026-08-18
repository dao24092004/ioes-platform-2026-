# ocr-service Dockerfile (Python / FastAPI)
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production

RUN useradd --create-home --shell /bin/bash appuser

# tesseract + lib deps for OCR
RUN apt-get update \
 && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng \
 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir poetry==1.8.2 \
 && poetry config virtualenvs.create false \
 && poetry install --no-root --no-interaction --no-ansi

COPY src ./src
USER appuser

EXPOSE 9102

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:9102/health').read()" || exit 1

CMD ["uvicorn", "src.ocr_service.main:app", "--host", "0.0.0.0", "--port", "9102"]
