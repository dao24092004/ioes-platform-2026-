# ADR-001: Use Dgraph (Native GraphQL Graph DB) for Question Bank

> **Status:** Proposed
> **Date:** 23/08/2026
> **Decision Makers:** Tech Lead, Backend-Node Lead, Solution Architect
> **Related Documents:**
> - [PROJECT_RULES.md](../../01-business/PROJECT_RULES.md) - Rule 2 (architectural changes require ADR)
> - [service-boundaries.md](../service-boundaries.md) - microservice boundaries
> - [BA_DOCUMENT.md](../../01-business/BA_DOCUMENT.md) - Module Exam (FR-EXAM-001..008)
> - [PROJECT_STRUCTURE.md](../../01-business/PROJECT_STRUCTURE.md) - folder structure

---

## 1. Context (Bối cảnh)

Hiện tại **Question Bank** được lưu trong **PostgreSQL** (`ioes_exam` database), xem file `database/migrations/exam-service/V1__init_schema.sql`:

```sql
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID REFERENCES exam_sections(id) ON DELETE CASCADE,
    course_id UUID,
    instructor_id UUID NOT NULL,
    question_type question_type NOT NULL,
    question_text TEXT NOT NULL,
    explanation TEXT,
    points DECIMAL(10, 2) NOT NULL DEFAULT 1,
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    ...
);
```

### 1.1. Hạn chế của giải pháp hiện tại

Với use case **"Ngân hàng câu hỏi ôn tập"** (Practice / Revision Question Bank), PostgreSQL gặp các vấn đề:

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | Không có quan hệ `prerequisites` giữa câu hỏi → phải tự join qua tags (mơ hồ) | 🔴 Cao |
| 2 | Không có đồ thị `Topic → SubTopic → Skill → Question` (knowledge graph) | 🔴 Cao |
| 3 | Full-text search chỉ dùng `ILIKE`/PG trigram → không ranking relevance | 🟠 TB |
| 4 | Recommendation câu hỏi tương tự → phải tự code similarity ở app layer | 🟠 TB |
| 5 | Tìm "câu hỏi cần ôn trước khi thi" → recursive CTE phức tạp, kém hiệu năng | 🟠 TB |
| 6 | Schema thiếu khái niệm `Skill` (kiến thức cần để trả lời) | 🟡 Thấp |

### 1.2. Yêu cầu nghiệp vụ mới

Đề tài: **"Ứng dụng NoSQL Dgraph hỗ trợ GraphQL trong xây dựng hệ thống quản lý ngân hàng câu hỏi ôn tập"**.

Các tính năng cần có:
- ✅ CRUD câu hỏi với metadata đầy đủ (type, difficulty, tags, points, language)
- ✅ Quản lý **Topic** (chủ đề) có cấu trúc **phân cấp** (cha → con)
- ✅ Quản lý **Skill** (kỹ năng / kiến thức cần thiết)
- ✅ Quan hệ **prerequisites** (câu nào cần ôn trước câu nào)
- ✅ Tìm kiếm **full-text** câu hỏi theo nội dung, đáp án, giải thích
- ✅ Tìm kiếm **theo nhiều chiều** (tag, topic, difficulty, type, language)
- ✅ **Recommendation** câu hỏi tương tự (similar questions)
- ✅ **Practice path** gợi ý lộ trình ôn tập cho học viên
- ✅ Tracking lịch sử trả lời (Attempt History) cho adaptive learning

---

## 2. Decision (Quyết định)

**Chọn Dgraph v23.3.0** (Native GraphQL Graph Database) làm **read-side store** cho Question Bank, theo pattern **CQRS**:

- **Write path:** Giữ nguyên PostgreSQL (`ioes_exam.questions`) làm source-of-truth (transactional, ACID)
- **Read path:** Dgraph phục vụ các query traversal/full-text/recommendation (eventually consistent)
- **Sync:** PostgreSQL → Dgraph qua **Kafka event** `question.updated.v1`

### 2.1. Lý do chọn Dgraph (không phải NoSQL khác)

| Tiêu chí | Dgraph | Neo4j | ArangoDB | MongoDB | PostgreSQL (giữ nguyên) |
|----------|--------|-------|----------|---------|-------------------------|
| **Phân loại** | Graph NoSQL | Graph NoSQL | Multi-model | Document NoSQL | RDBMS |
| **Native GraphQL API** | ✅ Built-in, tự sinh API | ❌ Phải code resolver | ❌ Phải code resolver | ❌ Phải code resolver | ❌ |
| **Full-text search** | ✅ `@search(by: [fulltext])` | ⚠️ Qua Lucene plugin | ⚠️ Qua View | ✅ Text index | ⚠️ tsvector |
| **Vector embedding** | ✅ HNSW native | ⚠️ Plugin | ⚠️ Extension | ⚠️ Atlas Vector Search | ❌ Qua Milvus riêng |
| **Phân tán native** | ✅ Built-in sharding | ⚠️ Enterprise only | ✅ | ✅ | ⚠️ Qua Citus |
| **Open source license** | Apache 2.0 | GPL v3 | Apache 2.0 | SSPL (hạn chế) | PostgreSQL License |
| **Phù hợp Knowledge Graph** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |

**Lý do Dgraph thắng:**
1. **Native GraphQL** → khớp với tech-stack frontend GraphQL, đỡ code resolver
2. **Auto-generated CRUD API** → giảm boilerplate (CRUD question/topic/skill)
3. **Vector + Graph trong 1** → recommendation mà không cần thêm Milvus cho phase đầu
4. **Apache 2.0** → không vướng license như SSPL/MongoDB hay GPL/Neo4j

### 2.2. Phương án đã loại

| Phương án | Lý do loại |
|----------|-----------|
| Chỉ dùng PostgreSQL + JSONB + tsvector | Recursive CTE phức tạp, không có knowledge graph |
| Dùng Neo4j | Không native GraphQL, phải code resolver Cypher → GraphQL |
| Dùng ArangoDB | Multi-model tốt nhưng AQL không phải GraphQL |
| Dùng MongoDB | Không native graph, `$lookup` chậm |
| Dùng Elasticsearch + Postgres | Full-text mạnh nhưng không có relationship |

---

## 3. Architecture (Kiến trúc)

### 3.1. CQRS Pattern

```
┌──────────────────────────────────────────────────────────────────┐
│                       WRITE PATH (PostgreSQL)                     │
│                                                                   │
│  Instructor → REST API (Gateway)                                 │
│       ↓                                                           │
│  exam-suite/question-bank module                                 │
│       ↓ 1. INSERT INTO questions (PostgreSQL - source of truth)  │
│       ↓ 2. Publish QuestionUpdated event → Kafka                 │
└──────────────────────────────────────────────────────────────────┘
                              ↓ Kafka: question.events
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                       SYNC CONSUMER (NestJS)                      │
│                                                                   │
│  question-bank-sync.consumer.ts                                   │
│       ↓ 1. Consume QuestionUpdated event                         │
│       ↓ 2. Upsert node + edges vào Dgraph (via GraphQL mutation) │
│       ↓ 3. Idempotent: dùng eventId để chống xử lý trùng        │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                       READ PATH (Dgraph)                          │
│                                                                   │
│  Student/Instructor → REST API (Gateway)                         │
│       ↓                                                           │
│  exam-suite/question-bank.controller                            │
│       ↓ query GraphQL → Dgraph                                   │
│       ↓ trả về: question + topic + skills + prerequisites +     │
│              similar + recommendation                            │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2. Service Topology

| Service | Port | Vai trò | Tech |
|---------|------|---------|------|
| `exam-suite` (giữ nguyên) | 9005 | Module `question-bank` gọi Dgraph + sync consumer | Node.js + NestJS |
| `dgraph-alpha` (MỚI) | 8080 (GraphQL), 9080 (gRPC) | Read-side Question Bank store | Dgraph v23.3.0 |
| `dgraph-zero` (MỚI) | 5080 | Dgraph coordinator (cho standalone dev) | Dgraph v23.3.0 |
| `kafka` (đã có) | 9092 | Event bus sync PostgreSQL → Dgraph | Confluent Kafka |
| `api-gateway` (đã có) | 8080 | Route `/api/v1/question-bank/**` | Spring Cloud Gateway |

**Không tạo service mới** → module `question-bank` nằm trong `exam-suite` (giữ nguyên 10 services, không phá vỡ service boundaries).

### 3.3. Folder Structure

```
services/exam-suite/src/modules/question-bank/          ← MỚI
├── question-bank.module.ts
├── question-bank.controller.ts
├── question-bank.service.ts
├── dgraph.client.ts
├── sync/
│   ├── question-bank-sync.consumer.ts                 ← Kafka consumer
│   └── question-bank-sync.service.ts                  ← Upsert logic
├── dto/
│   ├── search-question.dto.ts
│   ├── create-question.dto.ts
│   └── update-question.dto.ts
├── entities/
│   └── question.entity.ts (TypeORM - PostgreSQL)
├── ports/
│   ├── question-bank-read.port.ts                     ← Interface Dgraph
│   └── question-bank-write.port.ts                    ← Interface PG
├── adapters/
│   ├── dgraph-question.adapter.ts
│   └── postgres-question.adapter.ts
├── graphql/
│   ├── search-questions.query.ts
│   ├── get-practice-path.query.ts
│   ├── create-question.mutation.ts
│   └── update-question.mutation.ts
└── question-bank.service.spec.ts

database/schemas/dgraph/                                ← MỚI
└── question-bank-schema.graphql                        ← Deploy lên Dgraph

infrastructure/
├── docker-compose.yml                                  ← UPDATE: thêm Dgraph
└── helm/charts/exam-suite/values.yaml                  ← UPDATE: env vars Dgraph

docs/02-architecture/adr/
└── ADR-001-use-dgraph-for-question-bank.md            ← File này
```

---

## 4. Consequences (Hệ quả)

### 4.1. Positive ✅

| # | Lợi ích |
|---|---------|
| 1 | Knowledge graph `Topic → SubTopic → Skill → Question → Prerequisite` traversal native, hiệu năng cao |
| 2 | Full-text search câu hỏi + ranking relevance có sẵn (`@search(by: [fulltext])`) |
| 3 | Vector embedding cho recommendation (`@embedding` directive + HNSW index) |
| 4 | Auto-generated GraphQL API từ schema → giảm ~60% boilerplate CRUD |
| 5 | Mở rộng quan hệ linh hoạt (thêm node/edge mới không cần migration SQL) |
| 6 | Phục vụ đề tài tốt nghiệp (knowledge graph, GraphQL, NoSQL) |

### 4.2. Negative ⚠️

| # | Hạn chế | Giảm thiểu |
|---|---------|-----------|
| 1 | Thêm 2 infrastructure components (Dgraph Alpha + Zero) | Helm chart + healthcheck chuẩn |
| 2 | Eventual consistency giữa PostgreSQL ↔ Dgraph (~1-3s lag) | Acceptable cho read-side; vẫn có source-of-truth ở PG |
| 3 | Phải maintain 2 schema (PG + Dgraph GraphQL) | Auto-gen Dgraph schema từ entity definitions (nếu cần) |
| 4 | Dgraph chưa quen với team | ADR + tutorial + sample data cho onboarding |

### 4.3. Trade-offs

- **Write overhead:** +1 Kafka event cho mỗi lần update (chấp nhận được, async)
- **Disk:** +Dgraph data volume (estimate ~10-50MB cho 10K questions, OK)
- **Memory:** +512MB cho Dgraph Alpha container

---

## 5. Implementation Plan (Rollout)

### Phase 0: Foundation (1 ngày)
- [ ] Thêm Dgraph containers vào `infrastructure/docker-compose.yml`
- [ ] Deploy schema `database/schemas/dgraph/question-bank-schema.graphql` qua Ratel UI
- [ ] Setup Helm chart values cho Dgraph + env vars

### Phase 1: Module Skeleton (2 ngày)
- [ ] Tạo module `question-bank` trong `exam-suite`
- [ ] Implement `DgraphClient` với HttpService
- [ ] Implement GraphQL queries/mutations cơ bản

### Phase 2: Read API (2 ngày)
- [ ] Endpoint `GET /api/v1/question-bank/questions/search`
- [ ] Endpoint `GET /api/v1/question-bank/topics/{topicId}/practice`
- [ ] Endpoint `GET /api/v1/question-bank/questions/{id}/similar`
- [ ] Tests (unit + integration)

### Phase 3: Write + Sync (2 ngày)
- [ ] Endpoint `POST /api/v1/question-bank/questions` (ghi vào PG)
- [ ] Publish event `QuestionUpdated` → Kafka
- [ ] Consumer `question-bank-sync.consumer.ts` upsert vào Dgraph
- [ ] Idempotency check (eventId → processed table)

### Phase 4: Frontend (2 ngày)
- [ ] Component `QuestionSearch` với full-text
- [ ] Component `PracticePath` hiển thị graph traversal
- [ ] API client `question-bank.api.ts`

### Phase 5: Testing & Hardening (2 ngày)
- [ ] E2E test Playwright
- [ ] Load test với k6 (10K questions, 100 concurrent users)
- [ ] Coverage ≥ 85% cho module `question-bank`

---

## 6. References

- [Dgraph Documentation](https://dgraph.io/docs)
- [Dgraph GraphQL Schema](https://dgraph.io/docs/graphql/schema/)
- [CQRS Pattern (Martin Fowler)](https://martinfowler.com/bliki/CQRS.html)
- [IOES Service Boundaries](../service-boundaries.md)
- [PROJECT_RULES.md - Rule 2 (ADR required)](../../01-business/PROJECT_RULES.md)

---

## 7. Decision Log

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 23/08/2026 | Backend Lead | Initial proposal |