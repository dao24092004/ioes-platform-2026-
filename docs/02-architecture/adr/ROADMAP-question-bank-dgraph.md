# 🗺️ KẾ HOẠCH TRIỂN KHAI QUESTION BANK VỚI DGRAPH

> **Đề tài:** Ứng dụng NoSQL Dgraph hỗ trợ GraphQL trong xây dựng hệ thống quản lý ngân hàng câu hỏi ôn tập
> **Dự án:** IOES (Intelligent Online Examination System)
> **Mục đích file:** Roadmap chi tiết, step-by-step để implement đúng hướng, không lạc đề
> **Ngày tạo:** 23/08/2026
> **Liên quan:** [ADR-001](./ADR-001-use-dgraph-for-question-bank.md)

---

## 📋 MỤC LỤC

1. [Mục tiêu & Phạm vi](#1-mục-tiêu--phạm-vi)
2. [Kiến trúc tổng quan](#2-kiến-trúc-tổng-quan)
3. [Tech Stack đã chốt](#3-tech-stack-đã-chốt)
4. [Lộ trình triển khai theo Sprint](#4-lộ-trình-triển-khai-theo-sprint)
5. [Chi tiết từng Phase](#5-chi-tiết-từng-phase)
6. [Checklist từng bước (file-level)](#6-checklist-từng-bước-file-level)
7. [Tiêu chí nghiệm thu](#7-tiêu-chí-nghiệm-thu)
8. [Rủi ro & Kế hoạch dự phòng](#8-rủi-ro--kế-hoạch-dự-phòng)
9. [Tài liệu tham chiếu](#9-tài-liệu-tham-chiếu)

---

## 1. Mục tiêu & Phạm vi

### 1.1. Mục tiêu chính

Xây dựng **Question Bank Service** cho hệ thống IOES, sử dụng **Dgraph (Graph NoSQL native GraphQL)** làm read-side store, đáp ứng:

| # | Mục tiêu | Đo lường |
|---|----------|----------|
| 1 | Quản lý câu hỏi với knowledge graph (Topic - Skill - Prerequisite) | CRUD 5 entities |
| 2 | Tìm kiếm full-text + multi-filter | API < 200ms (P95) |
| 3 | Recommendation câu hỏi tương tự | Top-5 similar questions |
| 4 | Practice path gợi ý lộ trình ôn tập | Trả về ≤ 20 câu theo topic + prereq |
| 5 | Đồng bộ PostgreSQL → Dgraph qua Kafka | Lag < 5 giây |

### 1.2. Trong phạm vi (In-Scope)

- ✅ Module `question-bank` trong `exam-suite` (Node.js + NestJS)
- ✅ Dgraph containers (zero + alpha) trong Docker Compose
- ✅ GraphQL schema cho Question, Topic, Skill, Option, TestCase, AttemptHistory
- ✅ REST API expose qua API Gateway: `/api/v1/question-bank/**`
- ✅ Kafka event sync PostgreSQL → Dgraph
- ✅ Frontend components: `QuestionSearch`, `PracticePath`, `QuestionCard`
- ✅ Unit tests (≥85%) + Integration tests với Testcontainers
- ✅ Helm chart updates cho production

### 1.3. NGOÀI phạm vi (Out-of-Scope)

- ❌ Auto-grading logic (giữ nguyên ở `submission` module)
- ❌ AI auto-generate câu hỏi (phase 2 - thuộc đề tài khác)
- ❌ Multi-tenant isolation (chưa có yêu cầu)
- ❌ Mobile app native (chỉ web responsive)
- ❌ Tách thành microservice riêng (giữ trong `exam-suite`)

---

## 2. Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                            │
│  apps/web/src/components/question-bank/                           │
│  - QuestionSearch.tsx                                            │
│  - PracticePath.tsx                                              │
│  - QuestionCard.tsx                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS + JWT
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Spring Cloud)                     │
│                    Port: 8080                                    │
│                    Route: /api/v1/question-bank/**               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 EXAM-SUITE (NestJS) - Port 9005                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  modules/question-bank/                                  │     │
│  │  - question-bank.controller.ts (REST endpoints)        │     │
│  │  - question-bank.service.ts (business logic)           │     │
│  │  - dgraph.client.ts (HTTP GraphQL client)              │     │
│  │  - sync/question-bank-sync.consumer.ts (Kafka consumer)│     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
          ↓                                        ↓
   ┌──────────────┐                          ┌──────────────────┐
   │ PostgreSQL   │                          │ Dgraph           │
   │ ioes_exam    │                          │ v23.3.0          │
   │ (Write)      │ ──────Kafka event────►   │ (Read)           │
   │ source-of-   │                          │ :8080 GraphQL    │
   │ truth        │                          │ :9080 gRPC       │
   └──────────────┘                          └──────────────────┘
```

### 2.1. Data Flow chính

**Flow 1: Student tìm câu hỏi ôn tập**
```
Student → React (QuestionSearch)
       → POST /api/v1/question-bank/questions/search
       → API Gateway → exam-suite/question-bank.controller
       → question-bank.service.searchQuestions()
       → DgraphClient.query(SEARCH_QUESTIONS_GRAPHQL)
       → Dgraph trả về (full-text + filter + paginate)
       ← JSON response về client
```

**Flow 2: Instructor tạo câu hỏi mới**
```
Instructor → React Form
          → POST /api/v1/question-bank/questions
          → exam-suite → INSERT INTO questions (PostgreSQL)
          → publish QuestionUpdated event → Kafka
          → return 201 Created

[Async] question-bank-sync.consumer
      → consume event → upsert Dgraph (mutation)
      → log success
```

**Flow 3: Lấy practice path cho 1 topic**
```
Student → GET /api/v1/question-bank/topics/{topicId}/practice
       → Dgraph query: get topic + sub-topics + questions + prerequisites
       → Trả về danh sách câu hỏi theo thứ tự: prereq → main → practice
```

---

## 3. Tech Stack đã chốt

| Layer | Technology | Version | Mục đích | Vị trí |
|-------|-----------|---------|----------|--------|
| **NoSQL Graph DB** | Dgraph | v23.3.0 | Read-side Question Bank | `infrastructure/docker-compose.yml` |
| **RDBMS** | PostgreSQL | 15-alpine | Write-side source-of-truth | Đã có (`ioes_exam`) |
| **Service Framework** | NestJS | 10.x | Module question-bank | Đã có (`exam-suite`) |
| **HTTP Client** | @nestjs/axios | 10.x | Gọi DGraph GraphQL | Cần thêm dep |
| **GraphQL Client (Dgraph)** | fetch/axios native | - | Dgraph không cần client riêng | - |
| **Kafka Client** | kafkajs | 2.x | Sync PG → Dgraph | Đã có |
| **Validation** | class-validator | 0.14.x | DTO validation | Đã có |
| **ORM** | TypeORM | 0.3.x | PostgreSQL queries | Đã có |
| **Frontend** | React + TypeScript | 18.x | UI components | `apps/web/` |
| **HTTP Client (FE)** | axios | 1.x | API calls | Đã có |
| **State Management** | TanStack Query | 5.x | Cache + refetch | Đã có |
| **Testing (BE)** | Jest + Testcontainers | 29.x / mới | Unit + Integration | Đã có + cần thêm |
| **Testing (FE)** | Vitest + Playwright | - | Unit + E2E | Đã có |
| **Container** | Docker Compose | v2 | Local dev | Đã có |
| **K8s** | Helm Chart | 3.x | Production deploy | Đã có |

### Dependency cần thêm vào `services/exam-suite/package.json`

```json
{
  "dependencies": {
    "@nestjs/axios": "^3.0.2",
    "axios": "^1.7.4"
  },
  "devDependencies": {
    "testcontainers": "^10.13.2"
  }
}
```

---

## 4. Lộ trình triển khai theo Sprint

| Sprint | Thời gian | Mục tiêu chính | Deliverable |
|--------|-----------|-----------------|-------------|
| **Sprint A** | Ngày 1-2 | Infrastructure & Schema | Dgraph chạy được, schema deployed |
| **Sprint B** | Ngày 3-4 | Module skeleton + Read API | Có thể search questions qua Dgraph |
| **Sprint C** | Ngày 5-6 | Write API + Kafka Sync | CRUD câu hỏi, sync sang Dgraph |
| **Sprint D** | Ngày 7-8 | Frontend + E2E test | UI hoàn chỉnh, E2E pass |
| **Sprint E** | Ngày 9-10 | Hardening + Docs | Coverage ≥85%, docs cập nhật |

**Tổng:** 10 ngày làm việc (2 tuần)

---

## 5. Chi tiết từng Phase

### 📦 PHASE A: Infrastructure & Schema (Ngày 1-2)

#### A1. Thêm Dgraph vào Docker Compose

**File:** `infrastructure/docker-compose.yml`

Thêm 3 services:
- `dgraph-zero`: Coordinator (1 instance)
- `dgraph-alpha`: Storage + GraphQL endpoint (1 instance dev, có thể scale lên 3+)
- `dgraph-ratel`: Admin UI (dev only)

**Ports:**
- `dgraph-alpha`: 8080 (GraphQL), 9080 (gRPC), 8000 (Ratel - chỉ dev)
- `dgraph-zero`: 5080 (internal), 6080 (internal)

**Volumes:**
- `dgraph_data:/var/lib/dgraph` (persistent storage)

**Healthcheck:** `curl -f http://localhost:8080/health`

#### A2. Tạo GraphQL Schema

**File:** `database/schemas/dgraph/question-bank-schema.graphql`

Schema định nghĩa 7 types:
- `Topic` (phân cấp qua `parentTopic`)
- `Skill`
- `Question` (với `@search`, `@embedding`, `@hasInverse`)
- `QuestionOption`
- `TestCase`
- `AttemptHistory`
- Enum: `QuestionType`, `Difficulty`

Deploy schema qua Ratel UI → Admin → Schema → paste → Deploy.

#### A3. Init Script cho schema

**File:** `infrastructure/dgraph-init/01-deploy-schema.sh`

Script tự động deploy schema khi Dgraph khởi động lần đầu.

#### A4. Verify Phase A

- [ ] `docker compose up -d dgraph-zero dgraph-alpha`
- [ ] Truy cập `http://localhost:8000` (Ratel UI) → thấy được
- [ ] GraphQL endpoint `http://localhost:8080/graphql` trả về schema
- [ ] Query `__schema { types { name } }` trả về các type đã định nghĩa

---

### 📦 PHASE B: Module Skeleton & Read API (Ngày 3-4)

#### B1. Tạo module folder

```
services/exam-suite/src/modules/question-bank/
├── question-bank.module.ts
├── question-bank.controller.ts
├── question-bank.service.ts
├── dgraph.client.ts
├── dto/
├── entities/
└── question-bank.service.spec.ts
```

#### B2. Implement DgraphClient

**File:** `dgraph.client.ts`

```typescript
@Injectable()
export class DgraphClient {
  constructor(
    private readonly http: HttpService,
    private readonly cfg: ConfigService,
  ) {}

  async query<T>(query: string, variables?: any): Promise<T> {
    const url = `${this.cfg.get('DGRAPH_URL')}/graphql`;
    const res = await firstValueFrom(
      this.http.post(url, { query, variables }, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.cfg.get('DGRAPH_TOKEN')
            ? { 'X-Dgraph-Token': this.cfg.get('DGRAPH_TOKEN') }
            : {}),
        },
        timeout: 5000,
      }),
    );
    if (res.data.errors) throw new Error(JSON.stringify(res.data.errors));
    return res.data.data;
  }
}
```

#### B3. Implement Read APIs

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/v1/question-bank/questions/search` | GET | Full-text + multi-filter search |
| `/api/v1/question-bank/questions/{id}` | GET | Chi tiết câu hỏi + relations |
| `/api/v1/question-bank/topics` | GET | List topics (tree) |
| `/api/v1/question-bank/topics/{topicId}/practice` | GET | Practice path cho topic |
| `/api/v1/question-bank/questions/{id}/similar` | GET | Top-K similar questions |

#### B4. Unit Tests

- Test `DgraphClient.query()` với mock HttpService
- Test `QuestionBankService.searchQuestions()` với mock DgraphClient
- Coverage mục tiêu: ≥85%

#### B5. Verify Phase B

- [ ] `pnpm test` pass
- [ ] `curl http://localhost:9005/api/v1/question-bank/questions/search?q=java` trả về data
- [ ] Coverage report ≥85%

---

### 📦 PHASE C: Write API & Kafka Sync (Ngày 5-6)

#### C1. Implement Write APIs (PostgreSQL)

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/v1/question-bank/questions` | POST | Tạo câu hỏi mới |
| `/api/v1/question-bank/questions/{id}` | PATCH | Cập nhật |
| `/api/v1/question-bank/questions/{id}` | DELETE | Soft delete |
| `/api/v1/question-bank/topics` | POST | Tạo topic |
| `/api/v1/question-bank/skills` | POST | Tạo skill |

**Quan trọng:** Write vào **PostgreSQL** trước, sau đó publish event.

#### C2. Kafka Event Publisher

**File:** `sync/question-bank-sync.publisher.ts`

Event schema:
```json
{
  "eventId": "uuid-v7",
  "eventType": "QuestionUpdated",
  "occurredAt": "ISO-8601",
  "aggregateId": "question-uuid",
  "aggregateType": "Question",
  "source": "exam-suite",
  "payload": {
    "action": "created|updated|deleted",
    "questionId": "uuid",
    "data": {...}
  }
}
```

Topic: `question.events`

#### C3. Kafka Consumer → Upsert Dgraph

**File:** `sync/question-bank-sync.consumer.ts`

```typescript
@Injectable()
export class QuestionBankSyncConsumer {
  @EventPattern('question.events')
  async handle(@Payload() event: QuestionEvent) {
    if (await this.isProcessed(event.eventId)) return; // idempotency
    if (event.eventType === 'QuestionUpdated') {
      await this.upsertQuestion(event.payload);
    }
    await this.markProcessed(event.eventId);
  }
}
```

#### C4. Idempotency Table

**File:** `database/migrations/exam-service/V2__question_bank_events.sql`

```sql
CREATE TABLE processed_events (
    event_id UUID PRIMARY KEY,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_processed_events_at ON processed_events(processed_at);
```

#### C5. Verify Phase C

- [ ] Tạo câu hỏi qua API → 201
- [ ] PostgreSQL có row mới
- [ ] Kafka UI thấy event `QuestionUpdated`
- [ ] Sau 1-3s, Dgraph Ratel UI → Query → `queryQuestion` thấy node mới
- [ ] Update câu hỏi → Dgraph update tương ứng
- [ ] Soft delete → Dgraph node có `deletedAt` set

---

### 📦 PHASE D: Frontend & E2E (Ngày 7-8)

#### D1. Frontend Components

**File:** `apps/web/src/components/question-bank/QuestionSearch.tsx`

```typescript
export const QuestionSearch = () => {
  const [filters, setFilters] = useState({ q: '', topicId: '', difficulty: '' });
  const { data, isLoading } = useQuery({
    queryKey: ['question-search', filters],
    queryFn: () => questionBankApi.search(filters),
  });
  // ... UI: input tìm kiếm, dropdown filter, list kết quả
};
```

**File:** `apps/web/src/components/question-bank/PracticePath.tsx`

Hiển thị graph traversal: prerequisites → main questions → similar questions.

#### D2. API Client

**File:** `apps/web/src/services/api/question-bank.api.ts`

```typescript
export const questionBankApi = {
  search: (params: SearchParams) =>
    axios.get('/api/v1/question-bank/questions/search', { params }),
  getPractice: (topicId: string) =>
    axios.get(`/api/v1/question-bank/topics/${topicId}/practice`),
  getSimilar: (questionId: string) =>
    axios.get(`/api/v1/question-bank/questions/${questionId}/similar`),
  create: (data: CreateQuestionDto) =>
    axios.post('/api/v1/question-bank/questions', data),
};
```

#### D3. E2E Tests (Playwright)

**File:** `tests/e2e/specs/question-bank.spec.ts`

Scenarios:
1. Instructor tạo câu hỏi → verify hiển thị trong search
2. Student search câu hỏi → verify ranking relevance
3. Student click practice path → verify prerequisites
4. Admin xem dashboard → verify metrics

#### D4. Verify Phase D

- [ ] UI render đúng, responsive
- [ ] E2E tests pass
- [ ] Lighthouse score ≥ 90

---

### 📦 PHASE E: Hardening & Documentation (Ngày 9-10)

#### E1. Performance Test (k6)

**File:** `tests/performance/question-bank-load.js`

Scenarios:
- 1000 RPS search questions (P95 < 200ms)
- 100 RPS practice path (P95 < 500ms)
- Spike: 0 → 5000 RPS trong 10s

#### E2. Security Audit

- [ ] JWT enforcement trên mọi endpoint
- [ ] RBAC check (INSTRUCTOR mới được create/update)
- [ ] Input validation (class-validator)
- [ ] Rate limiting (qua Gateway)
- [ ] OWASP Top 10 check

#### E3. Documentation Update

| File | Cập nhật |
|------|----------|
| `services/exam-suite/README.md` | Thêm section Question Bank |
| `docs/01-business/BA_DOCUMENT.md` | Bổ sung FR-QB-001..010 |
| `docs/02-architecture/service-boundaries.md` | Bổ sung service `exam-suite/question-bank` |
| `README.md` (root) | Bổ sung tech stack Dgraph |
| `.env.example` | Thêm `DGRAPH_URL`, `DGRAPH_TOKEN` |
| `CHANGELOG.md` | Ghi version 1.1.0 |

#### E4. Verify Phase E

- [ ] k6 report: P95 < 200ms (search), < 500ms (practice path)
- [ ] Coverage ≥ 85% cho module
- [ ] Security checklist pass
- [ ] Tất cả docs đã update

---

## 6. Checklist từng bước (file-level)

### Sprint A (Ngày 1-2)

- [ ] `infrastructure/docker-compose.yml` — thêm 3 services dgraph
- [ ] `database/schemas/dgraph/question-bank-schema.graphql` — schema MỚI
- [ ] `infrastructure/dgraph-init/01-deploy-schema.sh` — script MỚI
- [ ] `.env.example` — thêm DGRAPH_URL

### Sprint B (Ngày 3-4)

- [ ] `services/exam-suite/src/modules/question-bank/question-bank.module.ts` — MỚI
- [ ] `services/exam-suite/src/modules/question-bank/dgraph.client.ts` — MỚI
- [ ] `services/exam-suite/src/modules/question-bank/question-bank.service.ts` — MỚI
- [ ] `services/exam-suite/src/modules/question-bank/question-bank.controller.ts` — MỚI
- [ ] `services/exam-suite/src/modules/question-bank/dto/*.ts` — MỚI
- [ ] `services/exam-suite/src/modules/question-bank/graphql/*.ts` — MỚI
- [ ] `services/exam-suite/src/app.module.ts` — import QuestionBankModule
- [ ] `services/exam-suite/package.json` — thêm @nestjs/axios
- [ ] `services/exam-suite/src/modules/question-bank/question-bank.service.spec.ts` — MỚI
- [ ] `infrastructure/helm/charts/exam-suite/values.yaml` — env vars Dgraph

### Sprint C (Ngày 5-6)

- [ ] `services/exam-suite/src/modules/question-bank/sync/question-bank-sync.publisher.ts` — MỚI
- [ ] `services/exam-suite/src/modules/question-bank/sync/question-bank-sync.consumer.ts` — MỚI
- [ ] `services/exam-suite/src/modules/question-bank/sync/question-bank-sync.service.ts` — MỚI
- [ ] `database/migrations/exam-service/V2__processed_events.sql` — MỚI
- [ ] Endpoint POST/PATCH/DELETE cho questions
- [ ] Endpoint POST cho topics, skills

### Sprint D (Ngày 7-8)

- [ ] `apps/web/src/components/question-bank/QuestionSearch.tsx` — MỚI
- [ ] `apps/web/src/components/question-bank/PracticePath.tsx` — MỚI
- [ ] `apps/web/src/components/question-bank/QuestionCard.tsx` — MỚI
- [ ] `apps/web/src/components/question-bank/QuestionForm.tsx` — MỚI (instructor)
- [ ] `apps/web/src/services/api/question-bank.api.ts` — MỚI
- [ ] `apps/web/src/pages/instructor/QuestionBankPage.tsx` — MỚI
- [ ] `apps/web/src/pages/student/PracticePage.tsx` — MỚI
- [ ] `tests/e2e/specs/question-bank.spec.ts` — MỚI

### Sprint E (Ngày 9-10)

- [ ] `tests/performance/question-bank-load.js` — MỚI
- [ ] `services/exam-suite/README.md` — update section Question Bank
- [ ] `docs/01-business/BA_DOCUMENT.md` — bổ sung FR-QB
- [ ] `docs/02-architecture/service-boundaries.md` — update service map
- [ ] `README.md` — bổ sung tech stack
- [ ] `CHANGELOG.md` — version 1.1.0

---

## 7. Tiêu chí nghiệm thu (Definition of Done)

### 7.1. Functional DoD

- [ ] Tất cả 5 endpoints REST hoạt động đúng spec
- [ ] CRUD đầy đủ cho Question, Topic, Skill, Option, TestCase
- [ ] Search trả về kết quả đúng với relevance ranking
- [ ] Practice path hiển thị đúng prerequisites
- [ ] Similar questions (recommendation) hoạt động
- [ ] Kafka sync từ PG → Dgraph < 5s

### 7.2. Technical DoD

- [ ] **Unit test coverage ≥ 85%** (Rule V - PROJECT_RULES)
- [ ] **Integration test coverage ≥ 70%**
- [ ] **API P95 latency:**
  - Search: < 200ms
  - Practice path: < 500ms
- [ ] **Zero linter errors** (eslint pass)
- [ ] **Zero TypeScript errors** (`tsc --noEmit` pass)
- [ ] **Build success** (`pnpm build` exit 0)

### 7.3. Quality DoD

- [ ] Code review bởi ít nhất 1 Backend Lead
- [ ] PR title theo Conventional Commits: `feat(question-bank): ...`
- [ ] Commit messages theo format dự án
- [ ] Không có `console.log`, `any` type, hardcoded secrets

### 7.4. Documentation DoD

- [ ] API docs (Swagger) auto-generated cho tất cả endpoints
- [ ] README section "Question Bank" đầy đủ
- [ ] ADR-001 được approve
- [ ] Roadmap file (file này) updated với ngày hoàn thành thực tế

---

## 8. Rủi ro & Kế hoạch dự phòng

| # | Rủi ro | Xác suất | Tác động | Kế hoạch dự phòng |
|---|--------|----------|----------|-------------------|
| 1 | Dgraph performance chưa đạt target | TB | TB | Tăng replicas alpha, thêm indexes, cache Redis layer |
| 2 | Eventual consistency gây UX khó chịu (search không thấy câu vừa tạo) | Cao | TB | Thêm cache write-through ở app, TTL 5s |
| 3 | Schema Dgraph phải thay đổi sau khi đã có data | TB | Cao | Backup Dgraph trước khi deploy schema mới |
| 4 | Team chưa biết Dgraph/GraphQL | Cao | TB | Pair programming + workshop 1 buổi |
| 5 | Kafka down → sync bị stuck | Thấp | Cao | Dùng outbox pattern + retry job |
| 6 | Vector embedding chưa chính xác | TB | TB | Phase 1 chỉ dùng graph traversal, vector sau |

### Rollback Plan

Nếu Phase B thất bại (Dgraph không ổn định):
1. Tắt Dgraph containers
2. Chuyển sang dùng PostgreSQL + JSONB cho read-side
3. Vẫn giữ Knowledge Graph structure (qua recursive CTE)
4. ADR-001 update status → Deprecated

---

## 9. Tài liệu tham chiếu

### Bắt buộc đọc

| # | File | Mục đích |
|---|------|----------|
| 1 | [PROJECT_RULES.md](../01-business/PROJECT_RULES.md) | Master rules |
| 2 | [ADR-001](./ADR-001-use-dgraph-for-question-bank.md) | Lý do chọn Dgraph |
| 3 | [service-boundaries.md](../service-boundaries/service-boundaries.md) | Service boundaries |
| 4 | [BA_DOCUMENT.md](../01-business/BA_DOCUMENT.md) | Business requirements |
| 5 | [PROJECT_STRUCTURE.md](../01-business/PROJECT_STRUCTURE.md) | Folder structure |

### Tài liệu kỹ thuật

| # | Link | Mục đích |
|---|------|----------|
| 1 | https://dgraph.io/docs/graphql/quick-start/ | Dgraph GraphQL tutorial |
| 2 | https://dgraph.io/docs/graphql/schema/types | Type system |
| 3 | https://dgraph.io/docs/graphql/schema/directives/search/ | Search directive |
| 4 | https://docs.nestjs.com/techniques/http-module | NestJS HTTP client |
| 5 | https://kafka.js.org/docs/consuming | Kafka consumer |

### Coding Standards

- [Node.js Style Guide](../03-development/coding-standards/node-styleguide.md)
- [Testing Strategy](../03-development/testing-strategy.md)
- [Git Workflow](../03-development/git-workflow.md)

---

## 📝 CHANGE LOG

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 23/08/2026 | Backend Lead | Initial roadmap |

---

> **Lưu ý cho team:** Mọi PR mở phải reference ít nhất 1 mục trong checklist của file này. Nếu phát hiện sai hướng, update file này NGAY và thông báo Tech Lead.