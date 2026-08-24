# 📝 Exam Suite

> **Real-time exam service + Proctoring**
> Tech: Node.js 20 + NestJS 10 + uWebSockets.js

## 📋 TỔNG QUAN Nhanh

**Exam Suite** chịu trách nhiệm:
- Tạo / quản lý bài thi (MCQ, coding, essay)
- Real-time exam session (WebSocket)
- Auto-grading (MCQ, coding via Judge0, essay via AI)
- Proctoring (webcam, screen, tab switch)
- Timer & auto-save
- Submission & audit trail

**Port:** 9005 (HTTP + WebSocket)
**Database:** PostgreSQL (`ioes_exam`)
**Owner:** `backend-node@ioes.com`

## 🏗️ KIẾN TRÚC (NestJS Modules)

```
exam-suite/
├── src/
│   ├── main.ts                          # Entry point
│   ├── app.module.ts                    # Root module
│   │
│   ├── modules/
│   │   ├── exam/                        # Exam CRUD
│   │   │   ├── exam.module.ts
│   │   │   ├── exam.controller.ts
│   │   │   ├── exam.service.ts
│   │   │   ├── exam.repository.ts
│   │   │   ├── entities/
│   │   │   ├── dto/
│   │   │   └── exam.service.spec.ts
│   │   │
│   │   ├── question/                    # Question management
│   │   │   ├── question.module.ts
│   │   │   ├── question.service.ts
│   │   │   └── entities/
│   │   │
│   │   ├── attempt/                     # Exam attempts
│   │   │   ├── attempt.module.ts
│   │   │   ├── attempt.service.ts
│   │   │   └── attempt.gateway.ts       # WebSocket
│   │   │
│   │   ├── submission/                  # Submissions
│   │   │   ├── submission.module.ts
│   │   │   ├── submission.service.ts
│   │   │   └── auto-grader.service.ts
│   │   │
│   │   ├── proctoring/                  # Proctoring
│   │   │   ├── proctoring.module.ts
│   │   │   ├── proctoring.gateway.ts    # WebSocket
│   │   │   ├── webcam.service.ts
│   │   │   └── screen-capture.service.ts
│   │   │
│   │   └── grading/                     # Grading
│   │       ├── grading.module.ts
│   │       ├── grading.service.ts
│   │       └── kafka-grade.consumer.ts
│   │
│   ├── common/                          # Shared utilities
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── decorators/
│   │   └── interceptors/
│   │
│   ├── database/                        # TypeORM
│   │   ├── migrations/
│   │   └── data-source.ts
│   │
│   └── config/                          # Configuration
│
├── test/
│   ├── unit/
│   └── e2e/
│
└── k8s/
```

## 🚀 QUICK START

```bash
# Prerequisites
- Node.js 20
- Docker (for PostgreSQL, Redis, Kafka)

# 1. Install dependencies
cd services/exam-suite
pnpm install

# 2. Setup env
cp .env.example .env

# 3. Start dependencies
docker-compose up -d postgres redis kafka

# 4. Run migrations
pnpm migration:run

# 5. Start service (dev mode)
pnpm start:dev

# 6. Verify
curl http://localhost:9005/health
# → {"status":"ok"}

# 7. API docs
open http://localhost:9005/api/docs
```

## 📡 API ENDPOINTS

### REST APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/v1/exams` | INSTRUCTOR | Tạo bài thi |
| `GET` | `/api/v1/exams` | ❌ | List bài thi (public) |
| `GET` | `/api/v1/exams/:id` | ❌ | Chi tiết bài thi |
| `PATCH` | `/api/v1/exams/:id` | INSTRUCTOR | Cập nhật bài thi |
| `DELETE` | `/api/v1/exams/:id` | INSTRUCTOR | Xóa bài thi |
| `POST` | `/api/v1/exams/:id/publish` | INSTRUCTOR | Publish bài thi |
| `POST` | `/api/v1/attempts` | STUDENT | Bắt đầu làm bài |
| `POST` | `/api/v1/attempts/:id/submit` | STUDENT | Nộp bài |
| `GET` | `/api/v1/attempts/:id` | STUDENT | Xem kết quả |

### WebSocket Events

```javascript
// Namespace: /exam
// Client → Server
'exam:join'        // Join exam room
'exam:answer'      // Submit answer
'exam:heartbeat'   // Keep alive
'proctoring:frame' // Send webcam frame

// Server → Client
'exam:joined'      // Joined successfully
'exam:timer'      // Timer update (every 1s)
'exam:graded'     // Grading complete
'proctoring:alert' // Proctoring alert
```

**Swagger:** http://localhost:9005/api/docs

## 📚 TÀI LIỆU QUAN TRỌNG

| Tài liệu | Mục đích |
|----------|----------|
| [Node.js Style Guide](../../docs/03-development/coding-standards/node-styleguide.md) | **BẮT BUỘC đọc** |
| [Service Boundaries](../../docs/02-architecture/service-boundaries.md) | Quy tắc microservices |
| [PROJECT_RULES.md](../../docs/01-business/PROJECT_RULES.md) | Master rules |
| [WebSocket Guide](./docs/websockets.md) | _(sẽ tạo khi triển khai)_ |
| [ADR-001: Use Dgraph for Question Bank](../../docs/02-architecture/adr/ADR-001-use-dgraph-for-question-bank.md) | Module `question-bank` |
| [Roadmap Question Bank](../../docs/02-architecture/adr/ROADMAP-question-bank-dgraph.md) | Lộ trình triển khai |

## 🆕 Module: Question Bank (Dgraph)

Module `question-bank` cung cấp **ngân hàng câu hỏi ôn tập** sử dụng **Dgraph** (Graph NoSQL native GraphQL) làm read-side store.

### Tech
- **Dgraph v23.3.0** - Graph database với native GraphQL API
- **CQRS pattern** - PostgreSQL (write) ↔ Kafka ↔ Dgraph (read)
- **Knowledge graph**: Topic → SubTopic → Skill → Question → Prerequisite

### Endpoints

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/v1/question-bank/questions/search` | Auth | Full-text search câu hỏi |
| `GET` | `/api/v1/question-bank/questions/{id}` | Auth | Chi tiết câu hỏi + relations |
| `GET` | `/api/v1/question-bank/topics` | Auth | List topics (tree) |
| `GET` | `/api/v1/question-bank/topics/{topicId}/practice` | STUDENT | Practice path cho topic |
| `GET` | `/api/v1/question-bank/questions/{id}/similar` | Auth | Top-K similar questions |
| `POST` | `/api/v1/question-bank/questions` | INSTRUCTOR | Tạo câu hỏi mới |
| `PATCH` | `/api/v1/question-bank/questions/{id}` | INSTRUCTOR | Cập nhật |
| `DELETE` | `/api/v1/question-bank/questions/{id}` | INSTRUCTOR | Soft delete |

### Phase 2: Bulk Import + Image Upload + Resync

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/v1/question-bank/bulk-import` | INSTRUCTOR | Upload CSV/TSV (max 5000 rows) |
| `POST` | `/api/v1/question-bank/questions/{id}/images/upload-url` | INSTRUCTOR | Presigned URL cho image upload |
| `POST` | `/api/v1/question-bank/questions/{id}/images/confirm` | INSTRUCTOR | Confirm image URL attached |
| `DELETE` | `/api/v1/question-bank/images/{bucket}/{key(*)}` | INSTRUCTOR | Delete image từ storage |
| `POST` | `/api/v1/question-bank/admin/resync` | ADMIN | Force re-sync all → Dgraph |
| `POST` | `/api/v1/question-bank/admin/resync/{id}` | ADMIN | Re-sync single question |
| `GET` | `/api/v1/question-bank/admin/storage/health` | ADMIN | Storage health check |

### CSV Bulk Import Format

Upload file UTF-8 CSV/TSV với headers (case-insensitive):

```
question_text,question_type,difficulty,points,topic_id,language,hint,explanation,tags,options,test_cases,status
"What is 2+2?",multiple_choice,easy,5,<uuid>,,,,,4|true;5|false,,
"Sum",coding,medium,20,<uuid>,python,,,,,1|1|true|10||2|4|false|5,
```

- `question_type`: `multiple_choice` | `multiple_select` | `true_false` | `short_answer` | `essay` | `coding`
- `difficulty`: `very_easy` | `easy` | `medium` | `hard` | `very_hard`
- `options`: format `"text|isCorrect,text|isCorrect"`
- `test_cases`: format `"input|expected|isSample|points||input|expected|isSample|points"`

Xem chi tiết: `docs/02-architecture/adr/ADR-001-use-dgraph-for-question-bank.md`, `docs/02-architecture/adr/ADR-007-storage.md`

## ⚙️ ENVIRONMENT VARIABLES

```bash
# Required
NODE_ENV=development
PORT=9005

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ioes_exam
DB_USER=ioes
DB_PASSWORD=secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=exam-suite
KAFKA_GROUP_ID=exam-suite-consumer

# JWT
JWT_SECRET=your-256-bit-secret

# WebSocket
WS_PORT=9005
WS_NAMESPACE=/exam

# Auto-grading
JUDGE0_URL=http://localhost:2358
JUDGE0_API_KEY=xxx

# Proctoring
PROCTORING_ENABLED=true
PROCTORING_VIDEO_QUALITY=720p
PROCTORING_FRAME_RATE=5

# Dgraph (Question Bank read store)
DGRAPH_URL=http://localhost:8080
DGRAPH_GRAPHQL_ENDPOINT=/graphql
DGRAPH_ADMIN_ENDPOINT=/admin
DGRAPH_TIMEOUT_MS=5000

# S3-compatible storage (Phase 2: image upload + bulk import)
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET_QUESTIONS=ioes-questions
STORAGE_BUCKET_TEMP=ioes-temp
STORAGE_FORCE_PATH_STYLE=true
STORAGE_MAX_IMAGE_SIZE=10485760        # 10MB
STORAGE_MAX_BULK_SIZE=52428800         # 50MB
STORAGE_PRESIGNED_TTL=3600             # 1 hour
STORAGE_CDN_BASE_URL=                  # Optional CDN

# Bulk import limits
BULK_IMPORT_MAX_ROWS=5000
BULK_IMPORT_BATCH_SIZE=100
BULK_IMPORT_DEFAULT_STATUS=draft
```

## 🧪 TESTING

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov
open coverage/index.html
```

**Coverage target:** 80%

## 🔗 EVENTS (Kafka)

### Publishes

| Topic | Event | Khi nào |
|-------|-------|---------|
| `exam.events` | `ExamCreated` | Tạo exam |
| `exam.events` | `ExamPublished` | Publish exam |
| `exam.events` | `ExamStarted` | Student bắt đầu |
| `exam.events` | `ExamSubmitted` | Student nộp bài |
| `exam.events` | `ExamGraded` | Chấm xong |
| `proctoring.events` | `ProctorAlert` | Phát hiện gian lận |

### Consumes

| Topic | Event | Xử lý |
|-------|-------|--------|
| `user.events` | `UserRegistered` | Tạo profile cho user |
| `course.events` | `CourseEnrolled` | Cho phép thi |

## 🐛 TROUBLESHOOTING

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| WebSocket disconnect liên tục | JWT expired | Check `JWT_SECRET` |
| `ECONNREFUSED 5432` | Postgres chưa chạy | `docker-compose up -d postgres` |
| Submission failed | Grader timeout | Check Judge0 status |
| Real-time timer không sync | Clock skew | Dùng `Date.now()` server-side |

## 📞 LIÊN HỆ

- **Owner:** Backend Node.js Lead
- **Slack:** `#ioes-dev`
- **Email:** `backend-node@ioes.com`

---

**Version:** 0.1.0
**Last updated:** 12/08/2026
