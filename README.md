# 🎓 IOES — Intelligent Online Examination System

> **Hệ thống thi trực tuyến thông minh tích hợp AI, Computer Vision, và Blockchain**

[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)]()
[![Status](https://img.shields.io/badge/status-MVP%20Development-yellow.svg)]()
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)]()
[![Coverage](https://img.shields.io/badge/coverage-80%25-green.svg)]()

---

## 🚀 BẠN LÀ AI? — ĐỌC PHẦN NÀY TRƯỚC

| Bạn là... | Đọc phần | Thời gian |
|-----------|----------|-----------|
| 🆕 **Developer mới** | [§1 Tổng quan](#1-tổng-quan-dự-án) → [§2 Quick Start](#2-quick-start-5-phút) → [§3 Learning Path](#3-learning-path-theo-vai-trò) | 15 phút |
| 🎨 **Frontend Dev** | [§3.1 Frontend Path](#31-frontend-developer) | 5 phút |
| ☕ **Java Backend** | [§3.2 Java Backend Path](#32-java-backend-developer) | 5 phút |
| 🟢 **Node.js Backend** | [§3.3 Node.js Backend Path](#33-nodejs-backend-developer) | 5 phút |
| 🐍 **AI/ML Engineer** | [§3.4 AI/ML Path](#34-aiml-engineer) | 5 phút |
| 🔧 **DevOps/SRE** | [§3.5 DevOps Path](#35-devopssre) | 5 phút |
| 📊 **PM/PO** | [§1](#1-tổng-quan-dự-án) → [Project Management Plan](./docs/01-business/PROJECT_MANAGEMENT_PLAN.md) | 10 phút |
| 🔬 **Researcher** | [§3.6 Research Path](#36-researcher) | 5 phút |

> ⚠️ **BẮT BUỘC cho mọi người:** Đọc [PROJECT_RULES.md](./docs/01-business/PROJECT_RULES.md) trước khi code.

---

## 📑 MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Quick Start (5 phút)](#2-quick-start-5-phút)
3. [Learning Path theo vai trò](#3-learning-path-theo-vai-trò)
4. [Tài liệu chi tiết](#4-tài-liệu-chi-tiết)
5. [Tech Stack](#5-tech-stack)
6. [Cấu trúc dự án](#6-cấu-trúc-dự-án)
7. [Coding Rules tóm tắt](#7-coding-rules-tóm-tắt)
8. [Commands thường dùng](#8-commands-thường-dùng)
9. [Trạng thái & Roadmap](#9-trạng-thái--roadmap)
10. [Liên hệ](#10-liên-hệ)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1 IOES là gì?

**IOES** (Intelligent Online Examination System) là nền tảng thi trực tuyến hiện đại dành cho các tổ chức giáo dục, tích hợp các công nghệ tiên tiến:

| Tính năng | Mô tả | Công nghệ |
|-----------|-------|-----------|
| 🤖 **AI-Powered Learning** | Cá nhân hoá lộ trình học tập, chatbot hỗ trợ | Agentic RAG (5 agents) |
| 👁️ **Smart Proctoring** | Giám sát thi tự động phát hiện gian lận | CNN + LSTM + Attention |
| ⛓️ **Blockchain Certificates** | Cấp bằng cấp xác thực on-chain | Polygon + IPFS + Smart Contract |
| 📊 **Real-time Analytics** | Dashboard, leaderboard, tracking | ClickHouse + Grafana |
| 🎯 **Auto-grading** | Chấm tự động MCQ, coding, essay | Judge0 + AI grading |
| 🌐 **Multi-tenant** | Hỗ trợ nhiều tổ chức | Tenant isolation |

### 1.2 Mục tiêu kinh doanh

- **Năm 1:** MVP với 3 trường đại học pilot, 10K users
- **Năm 2:** Scale lên 50 trường, 100K users
- **Năm 3:** Mở rộng Đông Nam Á, 500K users

### 1.3 Quy mô dự án

- **10 microservices** backend (Java/Node.js/Python)
- **1 frontend** SPA (React + TypeScript)
- **3 shared libraries** (Java/Node/Python)
- **3 nghiên cứu khoa học** (papers)
- **Timeline:** 16 tuần (4 sprints chính)

### 1.4 Tài liệu nền tảng (BẮT BUỘC đọc)

| Tài liệu | Mục đích | Đối tượng |
|----------|----------|-----------|
| 📋 [BA Document](./docs/01-business/BA_DOCUMENT.md) | Phân tích yêu cầu nghiệp vụ | Tất cả |
| 📅 [Project Management Plan](./docs/01-business/PROJECT_MANAGEMENT_PLAN.md) | Timeline, milestones, RACI | PM, Lead |
| 📁 [Project Structure](./docs/01-business/PROJECT_STRUCTURE.md) | Cấu trúc thư mục | Developers |
| 📜 [Project Rules](./docs/01-business/PROJECT_RULES.md) | **Master rules - BẮT BUỘC** | Tất cả |

---

## 2. QUICK START (5 PHÚT)

### 2.1 Yêu cầu hệ thống

```bash
# Bắt buộc
Node.js ≥ 20.x        # https://nodejs.org
pnpm ≥ 9.x            # npm install -g pnpm
Java = 17.x           # OpenJDK / Temurin
Python = 3.11.x       # https://pyenv.github.io
Docker ≥ 24.x         # + Docker Compose
Maven ≥ 3.9.x
Git ≥ 2.40
```

### 2.2 Setup local (lần đầu)

```bash
# 1. Clone
git clone <repo-url>
cd AiProject

# 2. Đọc quy tắc (BẮT BUỘC)
cat docs/01-business/PROJECT_RULES.md

# 3. Cài dependencies
pnpm install

# 4. Copy env file
cp .env.example .env

# 5. Khởi động Docker services (Postgres, Redis, Kafka, etc.)
make setup-dev
# Hoặc: docker-compose up -d

# 6. Chạy migrations
make migrate

# 7. Seed data
make seed

# 8. Khởi động tất cả services
make dev
```

### 2.3 Truy cập services

| Service | URL | Username/Password |
|---------|-----|-------------------|
| 🌐 **Frontend** | http://localhost:3000 | — |
| 🚪 **API Gateway** | http://localhost:8080 | — |
| 📚 **API Docs (Swagger)** | http://localhost:8080/swagger-ui.html | — |
| 📊 **Grafana** | http://localhost:3001 | admin/admin |
| 📈 **Prometheus** | http://localhost:9090 | — |
| 🔍 **Jaeger** | http://localhost:16686 | — |
| 📨 **Kafka UI** | http://localhost:8081 | — |
| 💾 **MinIO** | http://localhost:9001 | minio/minio123 |
| 🗄️ **PgAdmin** | http://localhost:5050 | admin@ioes.com/admin |

### 2.4 Verify mọi thứ OK

```bash
# Health check
make health-check

# Test API
curl http://localhost:8080/actuator/health
# → {"status":"UP"}

# Run tests
make test
```

---

## 3. LEARNING PATH THEO VAI TRÒ

> 🎯 **Mục đích:** Đi đúng tài liệu cần thiết, không đọc lan man.

### 3.1 Frontend Developer

```
📚 Đọc theo thứ tự:

1. [PROJECT_STRUCTURE.md](./docs/01-business/PROJECT_STRUCTURE.md)             # 5 ph
2. [Frontend Style Guide](./docs/03-development/coding-standards/frontend-styleguide.md)  # 15 ph
3. [apps/web/README.md](./apps/web/README.md)                                  # 5 ph
4. [Git Workflow](./docs/03-development/git-workflow.md)                       # 10 ph
5. [Code Review Checklist](./docs/03-development/code-review-checklist.md)     # 10 ph
6. [Testing Strategy - Frontend section](./docs/03-development/testing-strategy.md)  # 10 ph

Bắt đầu code:    cd apps/web && pnpm dev
```

**Stack riêng:** React 18 + TypeScript + Vite + Tailwind + React Query + Zustand

### 3.2 Java Backend Developer

```
📚 Đọc theo thứ tự:

1. [PROJECT_STRUCTURE.md](./docs/01-business/PROJECT_STRUCTURE.md)             # 5 ph
2. [Service Boundaries](./docs/02-architecture/service-boundaries.md)          # 15 ph
3. [Java Style Guide](./docs/03-development/coding-standards/java-styleguide.md)  # 20 ph
4. [services/README.md](./services/README.md)                                  # 5 ph
5. [Git Workflow](./docs/03-development/git-workflow.md)                       # 10 ph
6. [Testing Strategy](./docs/03-development/testing-strategy.md)               # 10 ph

Bắt đầu code:    cd services/auth-service && mvn spring-boot:run
```

**Services bạn sẽ làm:** auth-service, content-service, analytics-service, notification-service, api-gateway, discovery-service, config-server

**Stack riêng:** Java 17 + Spring Boot 3 + WebFlux + Kafka + Hexagonal Architecture

### 3.3 Node.js Backend Developer

```
📚 Đọc theo thứ tự:

1. [PROJECT_STRUCTURE.md](./docs/01-business/PROJECT_STRUCTURE.md)             # 5 ph
2. [Service Boundaries](./docs/02-architecture/service-boundaries.md)          # 15 ph
3. [Node.js Style Guide](./docs/03-development/coding-standards/node-styleguide.md)  # 20 ph
4. [services/README.md](./services/README.md)                                  # 5 ph
5. [Git Workflow](./docs/03-development/git-workflow.md)                       # 10 ph
6. [Testing Strategy](./docs/03-development/testing-strategy.md)               # 10 ph

Bắt đầu code:    cd services/exam-suite && pnpm dev
```

**Services bạn sẽ làm:** exam-suite, blockchain-suite, ai-suite/api-gateway

**Stack riêng:** Node.js 20 + NestJS 10 + uWebSockets.js + Kafka + TypeORM

### 3.4 AI/ML Engineer

```
📚 Đọc theo thứ tự:

1. [PROJECT_STRUCTURE.md](./docs/01-business/PROJECT_STRUCTURE.md)             # 5 ph
2. [Python Style Guide](./docs/03-development/coding-standards/python-styleguide.md)  # 20 ph
3. [services/ai-suite/README.md](./services/ai-suite/README.md)                  # 5 ph
4. [Paper 1: Agentic RAG](./docs/05-research/paper-1-agentic-rag/)              # 30 ph
5. [Paper 2: Vision Attention](./docs/05-research/paper-2-vision-attention/)    # 30 ph
6. [Testing Strategy - ML section](./docs/03-development/testing-strategy.md)  # 10 ph

Bắt động dev:   cd services/ai-suite && docker-compose up -d
```

**Models bạn sẽ train:**
- **Agentic RAG:** 5 agents (Router, Planner, Tutor, Assessor, Recommender)
- **Vision Proctoring:** CNN-LSTM với Attention mechanism
- **Auto-grading:** LLM-based essay grading

**Stack riêng:** Python 3.11 + FastAPI + PyTorch + TensorRT + vLLM + Milvus

### 3.5 DevOps/SRE

```
📚 Đọc theo thứ tự:

1. [PROJECT_STRUCTURE.md](./docs/01-business/PROJECT_STRUCTURE.md)             # 5 ph
2. [infrastructure/README.md](./infrastructure/README.md)                      # 5 ph
3. [Operations Guide](./docs/04-operations/README.md)                          # 15 ph
4. [Deployment Guide](./docs/04-operations/deployment/)                        # 15 ph
5. [Monitoring Guide](./docs/04-operations/monitoring/)                        # 15 ph
6. [Incident Response](./docs/04-operations/incident-response/)                # 10 ph

Bắt đầu:        cd infrastructure/terraform && terraform init
```

**Tools bạn sẽ dùng:** Terraform, Helm, ArgoCD, Kubernetes, Prometheus, Grafana, Jaeger, Datadog

### 3.6 Researcher

```
📚 Đọc theo thứ tự:

1. [BA Document - Phần nghiên cứu](./docs/01-business/BA_DOCUMENT.md)           # 15 ph
2. [docs/05-research/](./docs/05-research/README.md)                            # 5 ph
3. Paper 1: [Agentic RAG](./docs/05-research/paper-1-agentic-rag/)
4. Paper 2: [Vision Attention](./docs/05-research/paper-2-vision-attention/)
5. Paper 3: [Blockchain Records](./docs/05-research/paper-3-blockchain-records/)

Bắt đầu:        cd services/ai-suite/ml-worker/notebooks && jupyter lab
```

**Papers mục tiêu:**
- 📄 **Paper 1:** Agentic RAG for Personalized Learning Path (Springer Q1)
- 📄 **Paper 2:** Vision Attention for Online Proctoring (IEEE Trans)
- 📄 **Paper 3:** Blockchain Academic Records (IEEE Trans)

---

## 4. TÀI LIỆU CHI TIẾT

### 📚 Tài liệu Business (`docs/01-business/`)

| File | Mô tả |
|------|-------|
| 📋 [BA_DOCUMENT.md](./docs/01-business/BA_DOCUMENT.md) | Phân tích yêu cầu nghiệp vụ (73KB) |
| 📅 [PROJECT_MANAGEMENT_PLAN.md](./docs/01-business/PROJECT_MANAGEMENT_PLAN.md) | Kế hoạch quản lý dự án (47KB) |
| 📁 [PROJECT_STRUCTURE.md](./docs/01-business/PROJECT_STRUCTURE.md) | Cấu trúc thư mục dự án |
| 📜 [PROJECT_RULES.md](./docs/01-business/PROJECT_RULES.md) | **Master rules - BẮT BUỘC** |

### 🏗️ Tài liệu Architecture (`docs/02-architecture/`)

| File | Mô tả |
|------|-------|
| 🏛️ [service-boundaries.md](./docs/02-architecture/service-boundaries.md) | Quy tắc Microservices + Event-driven |
| 📐 [README.md](./docs/02-architecture/README.md) | Architecture overview |
| 📋 [adr/](./docs/02-architecture/adr/) | Architecture Decision Records |
| 🎨 [diagrams/](./docs/02-architecture/diagrams/) | System diagrams |
| 🔐 [security/](./docs/02-architecture/security/) | Threat model, security checklist |

### 🛠️ Tài liệu Development (`docs/03-development/`)

| File | Mục đích |
|------|----------|
| 📖 [README.md](./docs/03-development/README.md) | Development overview |
| 🌿 [git-workflow.md](./docs/03-development/git-workflow.md) | GitFlow + Conventional Commits |
| ✅ [code-review-checklist.md](./docs/03-development/code-review-checklist.md) | PR Review checklist |
| 🧪 [testing-strategy.md](./docs/03-development/testing-strategy.md) | Test pyramid + TDD |
| 🎨 [coding-standards/](./docs/03-development/coding-standards/) | 4 style guides |

#### Coding Standards

| File | Ngôn ngữ |
|------|----------|
| [frontend-styleguide.md](./docs/03-development/coding-standards/frontend-styleguide.md) | React + TypeScript |
| [java-styleguide.md](./docs/03-development/coding-standards/java-styleguide.md) | Java + Spring Boot |
| [node-styleguide.md](./docs/03-development/coding-standards/node-styleguide.md) | Node.js + NestJS |
| [python-styleguide.md](./docs/03-development/coding-standards/python-styleguide.md) | Python + FastAPI |

### 🔧 Tài liệu Operations (`docs/04-operations/`)

| File | Mục đích |
|------|----------|
| 🚀 [deployment/](./docs/04-operations/deployment/) | Deploy guides, CI/CD |
| 📊 [monitoring/](./docs/04-operations/monitoring/) | Grafana, alerts, dashboards |
| 🚨 [incident-response/](./docs/04-operations/incident-response/) | Playbook, post-mortem |
| 💾 [backup-recovery/](./docs/04-operations/backup-recovery/) | Backup strategy, DR |
| 📚 [runbooks/](./docs/04-operations/runbooks/) | Service runbooks |

### 🔬 Tài liệu Research (`docs/05-research/`)

| Paper | Chủ đề | Mục tiêu |
|-------|--------|----------|
| 📄 [Paper 1: Agentic RAG](./docs/05-research/paper-1-agentic-rag/) | Personalized Learning Path (5 agents) | Springer Q1 |
| 📄 [Paper 2: Vision Attention](./docs/05-research/paper-2-vision-attention/) | CNN+LSTM Proctoring | IEEE Trans |
| 📄 [Paper 3: Blockchain Records](./docs/05-research/paper-3-blockchain-records/) | Academic Records On-chain | IEEE Trans |

### 👥 Tài liệu User (`docs/06-user/`)

User manual, admin guide, FAQ.

---

## 5. TECH STACK

### 5.1 Tổng quan

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React + TypeScript + Vite + Tailwind | 18 / 5.x / 5.x / 3.x |
| **Backend Java** | Java + Spring Boot + WebFlux | 17 / 3.3.x / 3.x |
| **Backend Node.js** | Node.js + NestJS + uWebSockets.js | 20 / 10.x / latest |
| **Backend Python/AI** | Python + FastAPI + PyTorch + TensorRT + vLLM | 3.11 / 0.111 / 2.3 / 10.x / 0.4.x |
| **Databases** | PostgreSQL + MongoDB + Redis + ClickHouse + Milvus | 15 / 7 / 7 / 24.x / 2.4 |
| **Message Queue** | Apache Kafka + Redis Streams | 3.7 / 7 |
| **Container** | Docker + Kubernetes + Helm | 24 / 1.30 / 3.14 |
| **GitOps** | ArgoCD | 2.11 |
| **IaC** | Terraform | 1.9 |
| **Observability** | Prometheus + Grafana + Jaeger + Datadog | 2.51 / 11.x / 1.58 / latest |
| **MLOps** | MLflow + Weights & Biases | 2.16 / latest |
| **Testing** | Jest + Vitest + JUnit + pytest + Playwright + k6 | latest |

### 5.2 Microservices Architecture

```
                    ┌─────────────┐
                    │   Frontend  │  React SPA
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ API Gateway │  Java (port 8080)
                    └──────┬──────┘
                           │
       ┌───────────┬───────┼───────┬───────────┬───────────┬───────────┐
       ▼           ▼       ▼       ▼           ▼           ▼           ▼
  ┌─────────┐ ┌────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │  Auth   │ │Content │ │ Exam │ │   AI     │ │Blockchain│ │Analytics │ │Notification│
  │ (Java)  │ │ (Java) │ │(Node)│ │ (Polyglot)│ │  (Node)  │ │  (Java)  │ │   (Java)  │
  │ :9000   │ │ :9001  │ │:9005 │ │:9100-9103│ │  :9200   │ │  :9004   │ │   :9009   │
  └─────────┘ └────────┘ └──────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
       │           │       │           │           │           │           │
       └───────────┴───────┴───────────┴───────────┴───────────┴───────────┘
                                    │
                            ┌───────┴──────┐
                            │ Apache Kafka │ (async events)
                            └──────────────┘
```

### 5.3 Ports Mapping

| Service | Port | Protocol |
|---------|------|----------|
| Frontend (Vite dev) | 3000 | HTTP |
| API Gateway | 8080 | HTTP |
| Auth Service | 9000 | HTTP |
| Content Service | 9001 | HTTP |
| Analytics Service | 9004 | HTTP |
| Exam Suite | 9005 | HTTP + WS |
| Notification Service | 9009 | HTTP |
| AI Suite (API) | 9100 | HTTP |
| AI Suite (ML) | 9101 | HTTP |
| AI Suite (OCR) | 9102 | HTTP |
| AI Suite (Speech) | 9103 | HTTP |
| Blockchain Suite | 9200 | HTTP |
| Discovery Service | 9999 | HTTP |
| Config Server | 8888 | HTTP |
| Grafana | 3001 | HTTP |
| Prometheus | 9090 | HTTP |
| Jaeger UI | 16686 | HTTP |
| Kafka UI | 8081 | HTTP |
| MinIO | 9001 | HTTP |
| PgAdmin | 5050 | HTTP |

---

## 6. CẤU TRÚC DỰ ÁN

> 📁 Chi tiết đầy đủ: [PROJECT_STRUCTURE.md](./docs/01-business/PROJECT_STRUCTURE.md)

```
AiProject/                              # Monorepo với Nx
│
├── 📚 docs/                           # Documentation
│   ├── 01-business/                   # BA, PMP, Rules, Structure
│   ├── 02-architecture/               # Service boundaries, ADR, diagrams
│   ├── 03-development/                # Workflow, coding standards, testing
│   ├── 04-operations/                 # Deployment, monitoring, runbooks
│   ├── 05-research/                   # 3 papers
│   └── 06-user/                       # User manual
│
├── 🎨 apps/
│   └── web/                           # Frontend React SPA
│
├── 🔧 services/                       # 10 Backend microservices
│   ├── api-gateway/                   # Java - Spring Cloud Gateway
│   ├── discovery-service/             # Java - Eureka
│   ├── config-server/                 # Java - Spring Cloud Config
│   ├── auth-service/                  # Java - JWT + OAuth2
│   ├── content-service/               # Java - Courses, lessons
│   ├── analytics-service/             # Java - Tracking, dashboards
│   ├── notification-service/          # Java - Email, SMS, Push
│   ├── exam-suite/                    # Node.js - Real-time exam + Proctoring
│   ├── ai-suite/                      # Polyglot - AI/ML services
│   │   ├── api-gateway/               # Node.js - Chatbot, Recommendation
│   │   ├── ml-worker/                 # Python - ML inference
│   │   ├── ocr-service/               # Python - OCR
│   │   └── speech-service/            # Python - STT
│   └── blockchain-suite/              # Node.js - Smart contracts, IPFS
│
├── 📦 libs/                           # 3 Shared libraries
│   ├── common-library/                # Java common
│   ├── common-node/                   # Node.js common
│   └── common-python/                 # Python common
│
├── 📦 packages/                       # Frontend shared packages
│   ├── ui-kit/                        # UI components
│   ├── api-client/                    # Generated API client
│   ├── shared-types/                  # Shared TS types
│   ├── eslint-config/                 # ESLint config
│   ├── tsconfig/                      # TSConfig
│   └── utils/                         # Utilities
│
├── 🏗️ infrastructure/                 # IaC
│   ├── terraform/                     # Cloud provisioning
│   ├── helm/                          # Helm charts
│   ├── argocd/                        # GitOps
│   ├── k8s-manifests/                 # Raw K8s manifests
│   └── monitoring/                    # Prometheus, Grafana configs
│
├── 💾 database/                       # Database
│   ├── migrations/                    # Migrations (Flyway/TypeORM/Alembic)
│   ├── seeds/                         # Seed data
│   ├── schemas/                       # SQL DDL
│   └── diagrams/                      # ER diagrams
│
├── 🧪 tests/                          # Cross-cutting tests
│   ├── e2e/                           # Playwright
│   ├── performance/                   # k6
│   ├── contract/                      # Pact
│   ├── chaos/                         # Chaos Mesh
│   └── security/                      # OWASP ZAP
│
├── 🔧 scripts/                        # DevOps scripts
│   ├── setup/ build/ deploy/ monitoring/ data/ utils/
│
└── 🛠️ tools/                          # Internal tools
    ├── generators/                    # Code generators
    └── cli/                           # Internal CLI
```

---

## 7. CODING RULES TÓM TẮT

> 🚨 **Đọc chi tiết:** [PROJECT_RULES.md](./docs/01-business/PROJECT_RULES.md)

### 7.1 🚨 Golden Rules (BẮT BUỘC)

1. ❌ **KHÔNG LÀM LAN MAN** - Mọi thứ theo đúng tài liệu đã được phê duyệt
2. ❌ **KHÔNG tự ý thay đổi kiến trúc** - Cần ADR + Tech Lead approve
3. ✅ **LUÔN CÓ TEST** - Coverage ≥ 80% (95% cho critical paths)
4. ✅ **ĐẶT FILE ĐÚNG VỊ TRÍ** - Theo PROJECT_STRUCTURE.md

### 7.2 Git Rules (BẮT BUỘC)

```bash
# Branch: <type>/PROJ-<id>-<desc>
feature/PROJ-123-add-oauth-google        ✅
my-branch                                 ❌

# Commit: <type>(<scope>): <subject>
feat(auth): add Google OAuth2 login       ✅
update                                    ❌

# Reference Jira
Refs: PROJ-123
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

### 7.3 Code Quality Rules

| Quy tắc | Frontend | Java | Node.js | Python |
|---------|----------|------|---------|--------|
| **Type safety** | TS strict, no `any` | Generic types | TS strict, no `any` | Type hints everywhere |
| **DI** | React Context | Constructor | NestJS DI | FastAPI DI |
| **Logging** | Logger | SLF4J | NestJS Logger | structlog |
| **Testing** | Vitest + RTL | JUnit + Mockito | Jest + Supertest | pytest |
| **Coverage** | ≥ 70% | ≥ 85% (95% critical) | ≥ 80% | ≥ 80% |

### 7.4 Architecture Rules (BẮT BUỘC)

- ✅ Database per service (KHÔNG share DB)
- ✅ Service giao tiếp qua API Gateway hoặc Kafka
- ✅ Hexagonal Architecture (Java)
- ✅ Domain layer KHÔNG có framework dependencies
- ❌ KHÔNG gọi REST trực tiếp giữa services
- ❌ KHÔNG shared entities giữa services

### 7.5 CẤM TUYỆT ĐỐI

```typescript
// ❌ CẤM trong mọi ngôn ngữ
console.log("debug")                    // Production log
System.out.println(...)
print(...)
// ❌ Dùng logger thay thế

// ❌ Magic numbers
if (retries > 3) {}                     // Đặt thành MAX_RETRIES = 3

// ❌ Hardcoded URLs, secrets
fetch("http://localhost:8080/api/...")  // Từ env config

// ❌ Any type
const data: any = ...                   // Dùng unknown + type guards

// ❌ Field injection (Java)
@Autowired private UserRepository repo;
```

---

## 8. COMMANDS THƯỜNG DÙNG

> 📁 File Makefile: [`scripts/Makefile`](./scripts/Makefile)

```bash
# ============ DEVELOPMENT ============
make dev                      # Start all services
make dev-frontend             # Chỉ frontend
make dev-backend              # Chỉ backend
make stop                     # Stop all

# ============ DATABASE ============
make setup-dev                # Start Docker services
make migrate                  # Run migrations
make seed                     # Seed data
make db-reset                 # Reset DB

# ============ BUILD ============
make build                    # Build all
make build-images             # Build Docker images

# ============ TEST ============
make test                     # Run all tests
make test-unit                # Unit tests only
make test-integration         # Integration tests
make test-e2e                 # E2E (Playwright)
make test-load                # Load tests (k6)
make coverage                 # Coverage report

# ============ CODE QUALITY ============
make lint                     # Lint all
make format                   # Format code
make type-check               # TypeScript check

# ============ DOCKER ============
make docker-up                # Start containers
make docker-down              # Stop containers
make docker-logs              # Tail logs
make docker-clean             # Clean up

# ============ DEPLOY ============
make deploy-dev               # Deploy dev
make deploy-staging           # Deploy staging
make deploy-prod              # Deploy production
make rollback                 # Rollback

# ============ UTILS ============
make health-check             # Check services
make clean                    # Clean artifacts
```

---

## 9. TRẠNG THÁI & ROADMAP

### 9.1 Tiến độ hiện tại

| Sprint | Thời gian | Status | Mục tiêu |
|--------|-----------|--------|----------|
| Sprint 0 (Week 1-2) | Foundation | ✅ Done | Monorepo, CI/CD, infrastructure |
| Sprint 1 (Week 3-6) | Core Services | 🚧 In Progress | Auth, Content, Exam |
| Sprint 2 (Week 7-10) | AI/ML | 📋 Planned | AI Suite, Proctoring |
| Sprint 3 (Week 11-14) | Advanced | 📋 Planned | Blockchain, Analytics |
| Sprint 4 (Week 15-16) | Polish | 📋 Planned | Load test, launch |

### 9.2 Tiến độ modules

| Module | Status | Progress |
|--------|--------|----------|
| ✅ Foundation (Infra, CI/CD) | Done | 100% |
| 🚧 Auth Service | In Progress | 60% |
| 🚧 Content Service | In Progress | 50% |
| 📋 Exam Suite | Planned | 10% |
| 📋 AI Suite | Planned | 5% |
| 📋 Blockchain Suite | Planned | 0% |
| 📋 Analytics | Planned | 0% |
| 📋 Notification | Planned | 20% |

### 9.3 Roadmap tổng quan

```
Q3/2026: MVP launch (3 pilot universities, 10K users)
Q4/2026: Scale to 50 universities
Q1/2027: Southeast Asia expansion
Q2/2027: 500K users
```

---

## 10. LIÊN HỆ

| Role | Email | Phạm vi |
|------|-------|----------|
| 📋 Project Manager | pm@ioes.com | Timeline, scope |
| 🎯 Product Owner | po@ioes.com | Requirements, priority |
| 🛠️ Tech Lead | tech@ioes.com | Architecture, code |
| 🔧 DevOps Lead | devops@ioes.com | CI/CD, infrastructure |
| 🎨 Frontend Lead | frontend@ioes.com | Web app |
| ☕ Backend Lead (Java) | backend-java@ioes.com | Java services |
| 🟢 Backend Lead (Node) | backend-node@ioes.com | Node.js services |
| 🐍 AI/ML Lead | ai@ioes.com | AI/ML services |
| 🔬 Research Lead | research@ioes.com | Papers, models |

### Slack Channels

- `#ioes-general` - Thảo luận chung
- `#ioes-dev` - Development
- `#ioes-devops` - Infrastructure
- `#ioes-ai` - AI/ML research
- `#ioes-alerts` - Production alerts

---

## 📄 LICENSE

Proprietary © 2026 IOES Team. All rights reserved.

---

## 🙏 ACKNOLEDGMENTS

- Architecture inspired by [Microsoft eShopOnContainers](https://github.com/dotnet-architecture/eShopOnContainers)
- Hexagonal Architecture by [Alistair Cockburn](https://alistair.cockburn.us/)
- Conventional Commits by [Conventional Commits](https://www.conventionalcommits.org/)
- GitFlow by [Vincent Driessen](https://nvie.com/posts/a-successful-git-branching-model/)

---

<div align="center">

**Made with ❤️ by IOES Team**

[⬆ Back to top](#-ioes--intelligent-online-examination-system)

</div>
