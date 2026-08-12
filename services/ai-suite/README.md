# 🤖 AI Suite

Polyglot AI/ML services.

## Sub-services

| Service | Tech Stack | Port | Mô tả |
|---------|-----------|------|-------|
| [api-gateway/](./api-gateway/) | Node.js + NestJS | 9100 | Chatbot, Recommendation, Learning Path API |
| [ml-worker/](./ml-worker/) | Python 3.11 + FastAPI + PyTorch + TensorRT + vLLM | 9101 | ML inference (embeddings, vision, LLM) |
| [ocr-service/](./ocr-service/) | Python + FastAPI | 9102 | OCR service |
| [speech-service/](./speech-service/) | Python + FastAPI + Whisper | 9103 | Speech-to-text |

## Models (Papers)

| Paper | Model | Sub-service |
|-------|-------|-------------|
| **Paper 1** | Agentic RAG (5 agents) | ml-worker |
| **Paper 2** | CNN+LSTM Vision Attention | ml-worker |
| **Paper 3** | Blockchain Records (smart contract) | ml-worker (helper) |

## Status

⚠️ _Sẽ được triển khai trong Sprint 2-5._
