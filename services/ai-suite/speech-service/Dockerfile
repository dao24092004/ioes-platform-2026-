# speech-service Dockerfile (Python / FastAPI + Whisper)
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production \
    WHISPER_MODEL=base

RUN useradd --create-home --shell /bin/bash appuser

# ffmpeg for audio decoding
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir poetry==1.8.2 \
 && poetry config virtualenvs.create false \
 && poetry install --no-root --no-interaction --no-ansi

COPY src ./src
USER appuser

EXPOSE 9103

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:9103/health').read()" || exit 1

CMD ["uvicorn", "src.speech_service.main:app", "--host", "0.0.0.0", "--port", "9103"]
