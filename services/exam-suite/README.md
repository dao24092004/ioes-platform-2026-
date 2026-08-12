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
