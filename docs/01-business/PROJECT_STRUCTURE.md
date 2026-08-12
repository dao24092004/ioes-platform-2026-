# 📁 CẤU TRÚC DỰ ÁN ĐỀ XUẤT
# Intelligent Online Examination System (IOES)

> **Phiên bản:** 1.0
> **Ngày:** 11/08/2026
> **Căn cứ:** BA Document v1.1 + Project Management Plan v1.0

---

## 🎯 TỔNG QUAN

**Monorepo** sử dụng **Nx** quản lý:
- 1 Frontend (React + TS + Vite + Tailwind)
- 10 Backend Microservices (Java / Node.js / Python)
- 3 Common Libraries (chia sẻ giữa các services)
- Infrastructure as Code (Terraform + Helm + ArgoCD)
- Documentation, Testing, Scripts

---

## 🌳 CÂY THƯ MỤC

```
AiProject/
│
├── README.md                          # Tổng quan dự án
├── PROJECT_MANAGEMENT_PLAN.md         # Kế hoạch quản lý dự án
├── BA_DOCUMENT.md                     # Tài liệu BA (đã có)
├── PROJECT_STRUCTURE.md               # File này
├── LICENSE
│
├── package.json                       # Nx workspace root
├── pnpm-workspace.yaml                # PNPM workspace config
├── nx.json                            # Nx configuration
├── Makefile                           # Common commands
├── docker-compose.yml                 # Dev environment
├── .env.example                       # Environment template
├── .gitignore
├── .editorconfig
│
├── .github/
│   ├── workflows/                     # CI/CD pipelines
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── ISSUE_TEMPLATE/
│   ├── CODEOWNERS
│   └── dependabot.yml
│
├── docs/                              # 📚 Tài liệu
│   ├── 01-business/                   # BA, PMP, Roadmap, Stakeholder
│   ├── 02-architecture/               # ADRs, diagrams, API contracts
│   ├── 03-development/                # Coding standards, Git workflow
│   ├── 04-operations/                 # Deployment, monitoring, runbook
│   ├── 05-research/                   # 3 papers (Agentic RAG, Vision, Blockchain)
│   └── 06-user/                       # User manual, admin guide
│
├── apps/                              # 🚀 Applications
│   └── web/                           # Frontend React (SPA)
│       ├── public/                    # Static assets
│       ├── src/
│       │   ├── app/                   # Providers, router, store
│       │   ├── pages/                 # Pages (auth, student, instructor, admin)
│       │   ├── components/            # Reusable components (UI, layout, domain)
│       │   ├── hooks/                 # Custom React hooks
│       │   ├── services/              # API client, WebSocket client
│       │   ├── utils/                 # Helpers, constants, validators
│       │   ├── types/                 # TypeScript types
│       │   ├── styles/                # Global CSS, Tailwind
│       │   ├── assets/                # Images, icons, fonts
│       │   └── config/                # Env config, constants
│       ├── tests/                     # unit, integration, e2e (Playwright)
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── Dockerfile
│       └── nginx.conf
│
├── services/                          # 🔧 Backend Microservices (10)
│   ├── api-gateway/                   # Java - Spring Cloud Gateway WebFlux
│   ├── discovery-service/             # Java - Eureka
│   ├── config-server/                 # Java - Spring Cloud Config
│   ├── auth-service/                  # Java - JWT + OAuth2
│   ├── content-service/               # Java - Courses, lessons, upload
│   ├── analytics-service/             # Java - Tracking, dashboards
│   ├── notification-service/          # Java - Email/SMS/Push
│   ├── exam-suite/                    # Node.js - NestJS + WebSocket + Proctoring
│   ├── ai-suite/                      # Polyglot - Node.js API + Python ML
│   │   ├── api-gateway/               # Node.js chatbot, recommendation
│   │   ├── ml-worker/                 # Python FastAPI + TensorRT + vLLM
│   │   ├── ocr-service/               # Python OCR
│   │   └── speech-service/            # Python STT
│   └── blockchain-suite/              # Node.js - Smart contracts + IPFS
│
│   # Mỗi service có cấu trúc chuẩn:
│   #   ├── src/ (hoặc src/main/... cho Java)
│   #   │   ├── domain/        # Entities, value objects
│   #   │   ├── application/   # Use cases, business logic
│   #   │   ├── infrastructure/# DB, cache, external APIs
│   #   │   ├── interfaces/    # Controllers, gateways (REST/WS)
│   #   │   └── common/        # Shared utils (filters, guards, DTOs)
│   #   ├── test/             # unit, integration, e2e
│   #   ├── Dockerfile
│   #   ├── package.json (Node) hoặc pom.xml (Java)
│   #   └── k8s/              # Manifests riêng (backup)
│
├── libs/                              # 📦 Shared Libraries
│   ├── common-library/                # Java common - DTOs, exceptions, JWT, Kafka
│   ├── common-node/                   # Node.js common - filters, guards, decorators
│   └── common-python/                 # Python common - Pydantic schemas, OpenTelemetry
│
├── packages/                          # 📦 Frontend Shared Packages
│   ├── ui-kit/                        # Shared UI components (Button, Modal, Table)
│   ├── api-client/                    # Generated API client (OpenAPI)
│   ├── shared-types/                  # Shared TypeScript types
│   ├── eslint-config/                 # Shared ESLint config
│   ├── tsconfig/                      # Shared TSConfig
│   └── utils/                         # Shared utilities
│
├── infrastructure/                    # 🏗️ Infrastructure as Code
│   ├── terraform/                     # Cloud provisioning
│   │   ├── modules/                   # networking, k8s, db, cache, kafka, ml, security
│   │   └── environments/              # dev, staging, production
│   ├── helm/                          # Helm charts (K8s deployment)
│   │   ├── charts/                    # Sub-charts cho từng service
│   │   ├── values-dev.yaml
│   │   ├── values-staging.yaml
│   │   └── values-prod.yaml
│   ├── argocd/                        # GitOps applications
│   ├── k8s-manifests/                 # Raw K8s manifests (RBAC, network policies)
│   └── monitoring/                    # Prometheus + Grafana + Jaeger configs
│
├── database/                          # 💾 Database
│   ├── migrations/                    # Flyway/TypeORM/Alembic migrations
│   ├── seeds/                         # Initial seed data
│   ├── schemas/                       # SQL DDL
│   └── diagrams/                      # ER diagrams
│
├── tests/                             # 🧪 Cross-cutting Tests
│   ├── e2e/                           # Playwright
│   ├── performance/                   # k6 load tests
│   ├── contract/                      # Pact contract tests
│   ├── chaos/                         # Chaos engineering
│   └── security/                      # OWASP ZAP, pen-test
│
├── scripts/                           # 🔧 DevOps Scripts
│   ├── setup/                         # install-deps, setup-env
│   ├── build/                         # build-all, build-images
│   ├── deploy/                        # deploy-dev, deploy-prod, rollback
│   ├── monitoring/                    # health-check, tail-logs
│   └── data/                          # backup-db, restore-db, seed
│
├── .vscode/                           # VSCode workspace config
├── .husky/                            # Git hooks
└── tools/                             # 🛠️ Internal tools
    ├── generators/                    # module/service/component generators
    └── cli/                           # Internal CLI
```

---

## 📋 TECH STACK TỔNG HỢP

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Nx 17 + pnpm 9 |
| **Frontend** | React 18 + TypeScript + Vite + Tailwind + React Query + Zustand |
| **Backend Java** | Java 17 + Spring Boot 3 + WebFlux + Kafka |
| **Backend Node** | Node.js 20 + NestJS 10 + uWebSockets.js |
| **Backend Python/AI** | Python 3.11 + FastAPI + PyTorch + TensorRT + vLLM |
| **Database** | PostgreSQL 15 + MongoDB + Redis Cluster + Milvus |
| **Message Queue** | Apache Kafka + Redis Streams |
| **Blockchain** | Solidity 0.8.20 + Polygon + IPFS + The Graph |
| **Container** | Docker + Kubernetes + Helm |
| **GitOps** | ArgoCD |
| **IaC** | Terraform |
| **CI/CD** | GitHub Actions |
| **Observability** | Prometheus + Grafana + Jaeger + Datadog |
| **Testing** | Jest + Vitest + JUnit + pytest + Playwright + k6 |

---

## 🔧 CÁC LỆNH NHANH

```bash
# Setup
make setup-dev           # Khởi động Docker services
make migrate             # Chạy migrations
make seed                # Seed data

# Development
make dev                 # Chạy tất cả services
make dev-frontend        # Chỉ frontend
make dev-backend         # Chỉ backend

# Build & Test
make build               # Build all
make test                # Run all tests
make test-e2e            # E2E tests
make test-load           # Load tests
make lint                # Lint all
make coverage            # Coverage report

# Docker
make docker-up           # Start containers
make docker-down         # Stop containers
make docker-logs         # Tail logs

# Deploy
make deploy-dev          # Deploy dev
make deploy-staging      # Deploy staging
make deploy-prod         # Deploy production
make rollback            # Rollback

# Utils
make health-check        # Check all services
make db-reset            # Reset DB
make clean               # Clean artifacts
```

---

## 📐 QUY TẮC ĐẶT TÊN

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| **Thư mục** | kebab-case | `auth-service`, `learning-path` |
| **React component** | PascalCase | `LoginForm.tsx`, `CourseCard.tsx` |
| **TypeScript file** | camelCase | `authService.ts`, `useWebcam.ts` |
| **Java class** | PascalCase | `AuthController.java` |
| **Python file** | snake_case | `auth_service.py` |
| **SQL migration** | V{n}__{name}.sql | `V1__init.sql`, `V2__add_users.sql` |
| **Branch** | type/PROJ-{id}-{desc} | `feature/PROJ-123-add-login` |
| **Commit** | Conventional Commits | `feat(auth): add OAuth2 Google login` |

---

## 📚 TÀI LIỆU LIÊN QUAN

- [BA Document](./BA_DOCUMENT.md)
- [Project Management Plan](./PROJECT_MANAGEMENT_PLAN.md)
- [Architecture Overview](../02-architecture/README.md) _(khi triển khai)_
- [Development Guide](../03-development/README.md) _(khi triển khai)_

---

**END OF DOCUMENT**
