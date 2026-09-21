# ============================================
# ml-worker Dockerfile (Python / FastAPI)
#
# Build TU THU MUC GOC monorepo, khong phai tu thu muc service:
#   docker build -f services/ai-suite/ml-worker/Dockerfile -t ioes/ml-worker:dev .
# Ly do: pyproject khai ioes-common la path dependency ../../../libs/common-python,
# nen context phai chua ca libs/.
# ============================================

# --------------------------------------------------------------------------- #
# Builder
# --------------------------------------------------------------------------- #
FROM python:3.11-slim AS builder

# Duong dan trong builder PHAI trung duong dan trong runtime (/app/...). Poetry
# cai ioes-common o che do editable (develop = true trong pyproject), tuc la no
# ghi mot file .pth tro TUYET DOI vao thu muc src. Build o /build roi chay o
# /app thi file .pth tro vao cho khong ton tai va `import ioes_common` chet.
WORKDIR /app

RUN pip install --no-cache-dir poetry==1.8.2

# Copy truoc phan khai bao phu thuoc de layer cai dat duoc cache lai khi chi
# doi ma nguon.
COPY libs/common-python/pyproject.toml /app/libs/common-python/pyproject.toml
COPY libs/common-python/README.md /app/libs/common-python/README.md
COPY libs/common-python/src /app/libs/common-python/src
COPY services/ai-suite/ml-worker/pyproject.toml /app/services/ai-suite/ml-worker/pyproject.toml
COPY services/ai-suite/ml-worker/README.md /app/services/ai-suite/ml-worker/README.md

WORKDIR /app/services/ai-suite/ml-worker

# --only main,ml chu khong phai `poetry install` tran:
#   - nhom `ml` (torch, transformers, sentence-transformers, scikit-learn) la
#     BAT BUOC luc chay — services/embeddings.py nap sentence-transformers;
#   - nhom `dev` (pytest, mypy, ruff, black) chi dung o CI, nhet vao image
#     runtime la them vai tram MB va them be mat tan cong khong can thiet.
# Poetry mac dinh cai MOI nhom khong-optional, nen thieu co nay la image co ca
# dev toolchain.
RUN poetry config virtualenvs.create false \
 && poetry install --only main,ml --no-root --no-interaction --no-ansi --no-cache

COPY services/ai-suite/ml-worker/src /app/services/ai-suite/ml-worker/src
COPY services/ai-suite/ml-worker/data /app/services/ai-suite/ml-worker/data

# --------------------------------------------------------------------------- #
# Goi mo hinh MediaPipe Face Mesh (FR-AI-006), ~3,8MB.
#
# Vi sao tai luc BUILD chu khong de runtime tu tai: services/proctor.py goi
# _ensure_model_file() o lan /internal/ai/proctor/analyze dau tien va tai tu
# storage.googleapis.com. Container production thuong khong duoc ra internet,
# nen lan giam sat dau tien se that bai — dung luc dang thi. File chi 3,8MB
# nen nhet han vao image re hon nhieu so voi phai gan volume va dan mot buoc
# thu cong vao quy trinh trien khai.
#
# Van co the ghi de: mount file vao roi dat PROCTOR_MODEL_PATH, hoac build
# trong mang kin bang --build-arg PROCTOR_MODEL_URL=<guong noi bo>.
# --------------------------------------------------------------------------- #
ARG PROCTOR_MODEL_URL=https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
RUN python -c "\
import pathlib, urllib.request;\
dst = pathlib.Path('/app/.cache/mediapipe/face_landmarker.task');\
dst.parent.mkdir(parents=True, exist_ok=True);\
urllib.request.urlretrieve('${PROCTOR_MODEL_URL}', dst);\
print('face_landmarker.task', dst.stat().st_size, 'bytes')"

# --------------------------------------------------------------------------- #
# Runtime
# --------------------------------------------------------------------------- #
FROM python:3.11-slim
WORKDIR /app

# mediapipe keo theo opencv-contrib-python. Ban wheel do link dong toi libGL.so.1
# va libglib-2.0.so.0, ma python:3.11-slim khong co — thieu chung thi
# `import mediapipe` chet ngay luc nap voi "libGL.so.1: cannot open shared object
# file", va loi chi hien ra o lan goi proctor dau tien chu khong phai luc build.
# libgomp1: OpenMP runtime cho torch/scikit-learn.
#
# Giu ten libglib2.0-0 chu dung doi thanh libglib2.0-0t64: python:3.11-slim hien
# la Debian 13 (trixie), o do goi that mang ten ...t64 (chuyen doi time_t 64-bit)
# nhung no khai `Provides: libglib2.0-0`, nen apt van phan giai duoc ten cu. Ten
# cu chay dung tren ca bookworm lan trixie; ten t64 chi chay tren trixie tro len.
# Da kiem chung bang build that: apt chon libglib2.0-0t64 khi duoc xin
# libglib2.0-0.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libgl1 \
      libglib2.0-0 \
      libgomp1 \
 && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production

# src/ khong phai package (khong co __init__.py) va ma nguon import tuyet doi
# `from ml_worker...`, nen phai dua src/ vao sys.path chu khong goi
# `uvicorn src.ml_worker.main:app`.
ENV PYTHONPATH=/app/services/ai-suite/ml-worker/src

# Goi mo hinh MediaPipe da nam san trong image (xem stage builder).
ENV PROCTOR_MODEL_PATH=/app/.cache/mediapipe/face_landmarker.task

# Mo hinh nhung (intfloat/multilingual-e5-small, ~470MB) KHONG nam trong image:
# no tai tu HuggingFace o lan nhung dau tien. Gan volume vao duong dan nay de
# khong phai tai lai moi lan tao container, hoac tai san roi mount vao neu moi
# truong khong ra duoc internet.
ENV HF_HOME=/app/.cache/huggingface

# Moi worker nap mot ban sentence-transformers + mot ban MediaPipe rieng,
# khoang 1,5GB RAM moi ban. Mac dinh 1; tang bang -e UVICORN_WORKERS=N khi may
# co du bo nho.
ENV UVICORN_WORKERS=1

RUN useradd --create-home --shell /bin/bash appuser

# Thu vien VA cac script console (uvicorn nam o /usr/local/bin, khong nam trong
# site-packages) — thieu ve thu hai thi CMD bao "uvicorn: not found".
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY --from=builder --chown=appuser:appuser /app/libs/common-python /app/libs/common-python
COPY --from=builder --chown=appuser:appuser /app/services/ai-suite/ml-worker/src /app/services/ai-suite/ml-worker/src
COPY --from=builder --chown=appuser:appuser /app/services/ai-suite/ml-worker/data /app/services/ai-suite/ml-worker/data
COPY --from=builder --chown=appuser:appuser /app/.cache /app/.cache

USER appuser

EXPOSE 9101

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:9101/health').read()" || exit 1

# Dang shell de doc duoc UVICORN_WORKERS; `exec` de uvicorn thanh PID 1 va nhan
# duoc SIGTERM khi docker stop.
CMD ["sh", "-c", "exec uvicorn ml_worker.main:app --host 0.0.0.0 --port 9101 --workers ${UVICORN_WORKERS}"]
