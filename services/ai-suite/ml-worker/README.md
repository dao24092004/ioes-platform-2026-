# 🧠 ML Worker

> **ML Inference Service cho IOES**
> Tech: Python 3.11 + FastAPI + PyTorch + TensorRT + vLLM

## 📋 TỔNG QUAN Nhanh

**ML Worker** chịu trách nhiệm:
- **Agentic RAG** (5 agents) cho personalized learning path
- **Vision Proctoring** (CNN-LSTM + Attention) cho proctoring
- **Auto-grading** (LLM-based) cho essay
- **Embeddings Generation** cho similarity search
- **Inference** cho các models khác

**Port:** 9101
**Database:** PostgreSQL (`ioes_ai`) + Milvus
**Owner:** `ai@ioes.com`

## 🏗️ KIẾN TRÚC

```
ml-worker/
├── src/ml_worker/
│   ├── main.py                          # FastAPI entry
│   ├── api/                             # Routes
│   │   ├── embeddings.py                # /embeddings
│   │   ├── llm.py                       # /llm/*
│   │   ├── vision.py                    # /vision/*
│   │   └── grading.py                   # /grading
│   │
│   ├── models/                          # ML models
│   │   ├── embeddings/
│   │   │   ├── sentence_transformer.py
│   │   │   └── instructor_embeddings.py
│   │   │
│   │   ├── grading/
│   │   │   ├── essay_grader.py
│   │   │   └── rubric_grader.py
│   │   │
│   │   ├── agentic_rag/
│   │   │   ├── agents/
│   │   │   │   ├── router_agent.py
│   │   │   │   ├── planner_agent.py
│   │   │   │   ├── tutor_agent.py
│   │   │   │   ├── assessor_agent.py
│   │   │   │   └── recommender_agent.py
│   │   │   ├── graph.py                 # LangGraph
│   │   │   └── orchestrator.py
│   │   │
│   │   └── vision/
│   │       ├── cnn_lstm_attention.py    # Paper 2
│   │       └── proctoring_model.py
│   │
│   ├── services/                        # Business logic
│   │   ├── inference_service.py
│   │   ├── rag_service.py
│   │   └── proctoring_service.py
│   │
│   ├── schemas/                         # Pydantic models
│   │   ├── embedding.py
│   │   ├── grading.py
│   │   └── learning_path.py
│   │
│   ├── core/                            # Configuration
│   │   ├── config.py                    # Pydantic Settings
│   │   ├── logging.py                   # structlog
│   │   └── security.py
│   │
│   └── db/                              # Database
│       ├── session.py
│       └── milvus_client.py
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── notebooks/                           # Research
│   ├── 01_agentic_rag.ipynb
│   ├── 02_vision_attention.ipynb
│   └── 03_blockchain_records.ipynb
│
├── data/                                # Training data
│   ├── raw/
│   └── processed/
│
├── models/                              # Trained models
│   ├── checkpoints/
│   ├── onnx/
│   └── tensorrt/
│
└── k8s/
```

## 🚀 QUICK START

```bash
# Prerequisites
- Python 3.11
- Docker (for Milvus, PostgreSQL)
- CUDA-capable GPU (recommended)

# 1. Setup Python env
cd services/ai-suite/ml-worker
python3.11 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Setup env
cp .env.example .env

# 4. Start dependencies
docker-compose up -d postgres milvus kafka

# 5. Run migrations
alembic upgrade head

# 6. Start service
uvicorn ml_worker.main:app --reload --port 9101

# 7. Verify
curl http://localhost:9101/health
# → {"status":"ok"}

# 8. API docs
open http://localhost:9101/docs
```

## 📡 API ENDPOINTS

### Embeddings

```bash
POST /embeddings/text
- Generate text embeddings (sentence-transformer)
- Used for: similarity search, content recommendation

POST /embeddings/batch
- Batch embeddings for multiple texts
```

### LLM (Agentic RAG)

```bash
POST /llm/learning-path
- Generate personalized learning path
- Uses 5 agents: Router → Planner → Tutor → Assessor → Recommender

POST /llm/chat
- Chatbot for student Q&A

POST /llm/answer-question
- RAG-based Q&A
```

### Vision (Proctoring)

```bash
POST /vision/proctoring/predict
- Predict exam cheating behavior
- Input: sequence of webcam frames
- Output: class + confidence + attention weights

POST /vision/object-detection
- Detect objects (phone, book, etc.)
```

### Auto-grading

```bash
POST /grading/essay
- Auto-grade essay using LLM
- Input: essay + rubric
- Output: score + feedback

POST /grading/short-answer
- Auto-grade short answer
```

**Swagger:** http://localhost:9101/docs

## 📚 TÀI LIỆU QUAN TRỌNG

| Tài liệu | Mục đích |
|----------|----------|
| [Python Style Guide](../../docs/03-development/coding-standards/python-styleguide.md) | **BẮT BUỘC đọc** |
| [Service Boundaries](../../docs/02-architecture/service-boundaries.md) | Quy tắc microservices |
| [Paper 1: Agentic RAG](../../docs/05-research/paper-1-agentic-rag/) | Kiến trúc 5 agents |
| [Paper 2: Vision Attention](../../docs/05-research/paper-2-vision-attention/) | CNN-LSTM model |
| [PROJECT_RULES.md](../../docs/01-business/PROJECT_RULES.md) | Master rules |

## ⚙️ ENVIRONMENT VARIABLES

```bash
# App
APP_ENV=development
LOG_LEVEL=INFO
DEBUG=false

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ioes_ai
DB_USER=ioes
DB_PASSWORD=secret

# Milvus (Vector DB)
MILVUS_HOST=localhost
MILVUS_PORT=19530

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=ml-worker
KAFKA_GROUP_ID=ml-worker-consumer

# Model cache
MODEL_CACHE_DIR=/models
HF_HOME=/models/huggingface

# GPU
CUDA_VISIBLE_DEVICES=0

# LLM
OPENAI_API_KEY=xxx
ANTHROPIC_API_KEY=xxx
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2048

# Inference
INFERENCE_BATCH_SIZE=32
INFERENCE_TIMEOUT_SECONDS=30
INFERENCE_DEVICE=cuda  # cuda | cpu
```

## 🧪 TESTING

```bash
# Unit tests
pytest tests/unit -v

# Integration tests
pytest tests/integration -v

# Coverage
pytest --cov=ml_worker --cov-report=html
open htmlcov/index.html

# Research notebooks (manual)
jupyter lab notebooks/
```

**Coverage target:** 80%

## 🔗 EVENTS (Kafka)

### Publishes

| Topic | Event | Khi nào |
|-------|-------|---------|
| `ai.events` | `LearningPathGenerated` | Generate xong path |
| `ai.events` | `RecommendationUpdated` | Update recommendation |
| `proctoring.events` | `ProctorAlert` | Phát hiện gian lận |
| `grading.events` | `EssayGraded` | Chấm essay xong |

### Consumes

| Topic | Event | Xử lý |
|-------|-------|--------|
| `user.events` | `UserRegistered` | Tạo user profile embeddings |
| `course.events` | `CoursePublished` | Index course content |
| `exam.events` | `ExamSubmitted` | Auto-grade essay |

## 🐛 TROUBLESHOOTING

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| `CUDA out of memory` | Batch quá lớn | Giảm `INFERENCE_BATCH_SIZE` |
| `Model not found` | Chưa download model | Chạy `python scripts/download_models.py` |
| `Milvus connection failed` | Milvus chưa start | `docker-compose up -d milvus` |
| `LLM API rate limit` | Quá nhiều request | Tăng `LLM_MAX_TOKENS` retry |

## 📊 PERFORMANCE

| Model | Latency | GPU Memory |
|-------|---------|-----------|
| Sentence Embeddings | < 50ms | 2GB |
| CNN-LSTM (proctoring) | < 200ms | 4GB |
| LLM (GPT-4 API) | 1-3s | 0 (API) |
| LLM (local vLLM) | 500ms-2s | 16GB |

**Optimization:**
- TensorRT cho inference (3-5x faster)
- ONNX export cho portability
- Quantization (INT8/FP16)
- Batch processing
- Model caching

## 📞 LIÊN HỆ

- **Owner:** AI/ML Lead
- **Slack:** `#ioes-ai`
- **Email:** `ai@ioes.com`

---

**Version:** 0.1.0
**Last updated:** 12/08/2026
