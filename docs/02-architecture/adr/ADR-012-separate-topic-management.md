# ADR-012: Tách Topic Management sang Content-Service

> **Status:** Draft
> **Date:** 27/08/2026
> **Decision Makers:** Tech Lead, Backend-Node Lead, Backend-Java Lead
> **Related Documents:**
> - [ADR-001](./ADR-001-use-dgraph-for-question-bank.md) - Use Dgraph for Question Bank
> - [ADR-006](./ADR-006-service-integration.md) - Service Integration (Eureka, Gateway, Kafka)
> - [ROADMAP-question-bank-dgraph.md](./ROADMAP-question-bank-dgraph.md) - Question Bank Roadmap
> - [PROJECT_RULES.md](../../01-business/PROJECT_RULES.md) - Rule 2 (architectural changes require ADR)
> - [service-boundaries.md](../service-boundaries.md) - microservice boundaries (§1.1, §2.2, §3.1)

---

## 1. Context (Bối cảnh)

### 1.1. Trạng thái hiện tại (theo service-boundaries.md)

**Service Ownership hiện tại:**

```yaml
# service-boundaries.md §1.1 - content-service (KHÔNG có Topic!)
content-service:
  owns: [Course, Lesson, Chapter, Category, Review, Enrollment]  # ❌ Topic NOT listed
  publishes_events: [CourseCreated, CoursePublished, CourseEnrolled, ReviewCreated]
  exposes_apis: [/api/v1/courses/*, /api/v1/lessons/*]

# service-boundaries.md §1.1 - exam-suite (owns Question, read Dgraph)
exam-suite:
  owns: [Exam, Question, Submission, Attempt, ProctoringSession, GradingResult]
  publishes_events: [ExamStarted, ExamSubmitted, ExamGraded, ProctorAlert, QuestionUpdated]
  exposes_apis: [/api/v1/exams/*, /api/v1/attempts/*, /api/v1/submissions/*, /api/v1/question-bank/*]
```

**Kết luận:** Topic hiện **KHÔNG thuộc domain nào** - đây là architectural gap cần fix.

```typescript
// Dgraph Schema (question-bank-schema.graphql)
type Topic {
    id: ID!
    name: String! @search(by: [term, fulltext])
    slug: String! @search(by: [exact])
    description: String @search(by: [fulltext])
    parentTopic: Topic @hasInverse(field: subTopics)
    subTopics: [Topic] @hasInverse(field: parentTopic)
    questions: [Question] @hasInverse(field: topic)
    createdAt: DateTime!
    updatedAt: DateTime!
}
```

**Vấn đề phát hiện:**

| # | Issue | Severity |
|---|-------|----------|
| 1 | **Vi phạm Service Boundaries** - Topic thuộc business domain "Content" không phải "Exam" | 🔴 Cao |
| 2 | **Không có CRUD write cho Topic** - exam-suite chỉ đọc, không tạo/sửa/xóa được | 🔴 Cao |
| 3 | **Source-of-truth không rõ ràng** - Topic trong Dgraph không có event-driven sync từ source | 🟠 TB |
| 4 | **Content-service chưa implement** - đúng theo kiến trúc nhưng chưa có code | 🟡 Thấp |

### 1.2. Phân tích Domain

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONTENT DOMAIN                              │
│  (Content Service - Java 9001)                                  │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│  │  Course  │   │  Chapter │   │  Lesson  │   │   Topic  │  │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘  │
│                                                         ▲      │
│                                               (Knowledge)│      │
└─────────────────────────────────────────────────────────────────┘
                                                                 │
                        │ Kafka events                            │
                        ▼ (topic.created, topic.updated, etc)     │
┌─────────────────────────────────────────────────────────────────┐
│                       EXAM DOMAIN                                │
│  (Exam Suite - Node.js 9005)                                    │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                  │
│  │ Question │   │   Exam   │   │Submission│                  │
│  └────┬─────┘   └──────────┘   └──────────┘                  │
│       │                                                       │
│       │ topicId (foreign key reference)                       │
│       ▼                                                       │
│  Topic (READ-ONLY from Dgraph)                                │
└─────────────────────────────────────────────────────────────────┘
```

**Kết luận Domain Analysis:**
- Topic là part-of Course/Lesson structure (Content domain)
- Question tham chiếu Topic qua `topicId` (Exam domain)
- Content-Service nên là **single source of truth** cho Topic

### 1.3. Current API Endpoints

**exam-suite hiện tại (chỉ READ):**

| Method | Endpoint | Mô tả | Trạng thái |
|--------|----------|--------|------------|
| GET | `/api/v1/question-bank/topics` | List topics tree | ✅ Working |
| GET | `/api/v1/question-bank/topics/:topicId` | Get 1 topic | ✅ Working |
| GET | `/api/v1/question-bank/topics/:topicId/practice` | Practice path | ✅ Working |
| POST | `/api/v1/question-bank/topics` | Create topic | ❌ Không có |
| PATCH | `/api/v1/question-bank/topics/:topicId` | Update topic | ❌ Không có |
| DELETE | `/api/v1/question-bank/topics/:topicId` | Delete topic | ❌ Không có |

---

## 2. Decision (Quyết định)

### 2.1. Quyết định chính

**Tách Topic Management hoàn toàn sang content-service**, exam-suite chỉ reference qua `topicId`:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTENT-SERVICE (Java)                      │
│  Port: 9001                                                     │
│  Tech: Spring Boot 3 + JPA + PostgreSQL                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Topic Module                                             │   │
│  │ ├── TopicController (REST)                              │   │
│  │ ├── TopicService (business logic)                      │   │
│  │ ├── TopicRepository (JPA)                               │   │
│  │ └── TopicEventPublisher (Kafka)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│                  ┌──────────────┐                              │
│                  │ PostgreSQL   │                              │
│                  │ ioes_content │                              │
│                  │ (topics tbl) │                              │
│                  └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                              │
              Kafka: topic.events
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXAM-SUITE (Node.js)                      │
│  Port: 9005                                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Question Module                                          │   │
│  │ ├── QuestionController                                 │   │
│  │ ├── QuestionService                                     │   │
│  │ └── QuestionRepository (JPA)                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Topic Sync Consumer (NEW)                               │   │
│  │ └── Subscribe: topic.created/updated/deleted           │   │
│  │ └── Upsert vào Dgraph (read-side cache)               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │   Dgraph    │
                      │ (read-side) │
                      └──────────────┘
```

### 2.2. Phương án đã loại trừ

| Phương án | Lý do loại |
|-----------|-----------|
| **Giữ nguyên exam-suite quản lý Topic** | Vi phạm service boundaries, Topic thuộc Content domain |
| **Tách thành topic-service riêng** | Over-engineering, chỉ có 1 bounded context |
| **Dùng Dgraph làm source-of-truth cho Topic** | Dgraph không phải transactional DB, khó maintain consistency |

---

## 3. Architecture (Kiến trúc chi tiết)

### 3.1. Data Flow cho Topic CRUD

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CREATE TOPIC                                                 │
│                                                                 │
│ Instructor → POST /api/v1/topics                                │
│          → Content-Service/TopicController                      │
│          → TopicService.create()                                │
│          → TopicRepository.save() → PostgreSQL                  │
│          → TopicEventPublisher.publish(TopicCreated) → Kafka   │
│          ← 201 Created { id, ... }                             │
│                                                                 │
│ [Async] exam-suite/TopicSyncConsumer                           │
│         → Upsert Topic vào Dgraph                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. UPDATE TOPIC                                                 │
│                                                                 │
│ Instructor → PATCH /api/v1/topics/:topicId                     │
│          → Content-Service validate (không có parent cycle)    │
│          → TopicRepository.update() → PostgreSQL                │
│          → TopicEventPublisher.publish(TopicUpdated) → Kafka   │
│          ← 200 OK                                              │
│                                                                 │
│ [Async] exam-suite/TopicSyncConsumer                           │
│         → Update Topic vào Dgraph                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 3. DELETE TOPIC                                                 │
│                                                                 │
│ Instructor → DELETE /api/v1/topics/:topicId                     │
│          → Content-Service check (không có câu hỏi nào?)       │
│          → TopicRepository.softDelete() → PostgreSQL           │
│          → TopicEventPublisher.publish(TopicDeleted) → Kafka   │
│          ← 204 No Content                                      │
│                                                                 │
│ [Async] exam-suite/TopicSyncConsumer                           │
│         → Delete Topic khỏi Dgraph                             │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2. Data Flow cho Question-Topic relationship

```
┌─────────────────────────────────────────────────────────────────┐
│ CREATE QUESTION (exam-suite)                                     │
│                                                                 │
│ Instructor → POST /api/v1/question-bank/questions               │
│ Body: { topicId: "uuid", ... }                                 │
│                                                                 │
│ exam-suite → Validate topicId exists?                          │
│           → Gọi Content-Service /topics/:topicId (hoặc cache) │
│           → INSERT questions (PostgreSQL - ioes_exam)          │
│           → Publish QuestionCreated event → Kafka               │
│           ← 201 Created                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3. Validation Strategy

**Option A: Synchronous Validation (Recommended)**
```typescript
// exam-suite/question.service.ts
async createQuestion(dto: CreateQuestionDto) {
  // Gọi content-service để validate topicId tồn tại
  const topic = await this.contentServiceClient.getTopic(dto.topicId);
  if (!topic) {
    throw new BusinessException('TOPIC_NOT_FOUND', `Topic ${dto.topicId} not found`);
  }
  // Tiếp tục create question
}
```

**Option B: Async Validation (Kafka-based)**
- Chỉ validate format `topicId` (UUID)
- Sau khi create, event-driven check topic existence
- Phù hợp với write-heavy workload

### 3.4. Service-to-Service Communication

| From | To | Method | Purpose |
|------|----|--------|---------|
| exam-suite | content-service | REST (via API Gateway) | Validate topicId |
| content-service | exam-suite | Kafka events | Topic sync to Dgraph |

```yaml
# API Gateway routes (application.yml)
- id: content-service
  uri: http://content-service:9001
  predicates:
    - Path=/api/v1/topics/**
  filters:
    - StripPrefix=2  # /api/v1/topics -> /topics
```

### 3.5. Topic Cache trong exam-suite

```typescript
// exam-suite/topic-cache.service.ts
@Injectable()
export class TopicCacheService {
  private cache = new Map<string, CachedTopic>();

  async getTopic(topicId: string): Promise<Topic | null> {
    const cached = this.cache.get(topicId);
    if (cached && Date.now() - cached.timestamp < 300_000) {
      return cached.topic;
    }
    // Fallback: gọi content-service
    const topic = await this.contentServiceClient.getTopic(topicId);
    this.cache.set(topicId, { topic, timestamp: Date.now() });
    return topic;
  }
}
```

---

## 4. Database Schema

### 4.1. PostgreSQL - content-service (ioes_content)

```sql
-- V1__init_content_schema.sql (có thể update)

CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 0,  -- 0=root, 1=child, 2=grandchild
    path LTREE,  -- Materialized path for efficient tree queries
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_topics_parent ON topics(parent_topic_id);
CREATE INDEX idx_topics_slug ON topics(slug);
CREATE INDEX idx_topics_level ON topics(level);
CREATE INDEX idx_topics_path ON topics USING GIST(path);
```

### 4.2. PostgreSQL - exam-suite (ioes_exam)

```sql
-- Không đổi - questions.topicId vẫn là UUID reference
ALTER TABLE questions ADD CONSTRAINT fk_questions_topic
    FOREIGN KEY (topic_id) REFERENCES content.topics(id) ON DELETE RESTRICT;
```

> **Note:** FK constraint vẫn OK vì content-service và exam-suite dùng 2 database khác nhau. FK chỉ là documentation, không enforce ở database level (cross-database FK không supported).

### 4.3. Dgraph Schema (read-side cache)

```graphql
# Không đổi, chỉ sync từ content-service

type Topic {
    id: ID!
    name: String! @search(by: [term, fulltext])
    slug: String! @search(by: [exact])
    description: String @search(by: [fulltext])
    parentTopic: Topic @hasInverse(field: subTopics)
    subTopics: [Topic] @hasInverse(field: parentTopic)
    questions: [Question] @hasInverse(field: topic)
    level: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
}
```

---

## 5. Kafka Events Schema (theo service-boundaries.md §3.1)

### 5.1. Event Envelope (BẮT BUỘC)

```json
{
  "eventId": "uuid-v7",
  "eventType": "TopicCreated",
  "eventVersion": "1.0",
  "occurredAt": "2026-08-27T14:00:00Z",
  "aggregateId": "topic-uuid",
  "aggregateType": "Topic",
  "correlationId": "trace-id-xxx",
  "causationId": "command-id-xxx",
  "source": "content-service",
  "payload": { ... },
  "metadata": {
    "userId": "user-uuid",
    "ip": "192.168.1.1"
  }
}
```

### 5.2. Topic Events (Past tense, theo §3.2)

```typescript
// TopicCreated Event
{
  eventType: "TopicCreated",       // ✅ Past tense (NOT TopicCreate)
  payload: {
    id: "topic-uuid",
    name: "Java Fundamentals",
    slug: "java-fundamentals",
    description: "Basic Java programming concepts",
    parentTopicId: null,
    level: 0
  }
}

// TopicUpdated Event
{
  eventType: "TopicUpdated",       // ✅ Past tense
  payload: {
    id: "topic-uuid",
    name: "Java Core",
    slug: "java-core",
    parentTopicId: "parent-uuid",
    level: 0
  }
}

// TopicDeleted Event
{
  eventType: "TopicDeleted",       // ✅ Past tense
  payload: {
    id: "topic-uuid",
    reason: "MANUAL"               // hoặc "MERGED"
  }
}
```

### 5.3. Kafka Topic Naming (theo §2.2)

```yaml
topic_naming: {service}.{aggregate}.{action}

content.topics.created   # ❌ SAI
content.topic.created    # ❌ SAI
content-service.topic.created  # ❌ SAI

✅ content.topic.created
✅ content.topic.updated
✅ content.topic.deleted
```

### 5.4. Idempotency (theo §3.4)

```yaml
# Consumers PHẢI be idempotent
# eventId là idempotency key

exam-suite/TopicSyncConsumer:
  1. Check: eventId đã xử lý chưa (Redis/bảng processed_events)?
  2. Nếu đã xử lý → skip
  3. Nếu chưa → process → mark processed
```

### 5.5. Exam-suite Consumer

```typescript
// exam-suite/src/modules/question-bank/topic-sync.consumer.ts
@Injectable()
export class TopicSyncConsumer {
  @EventPattern('content.topic.created')  // ✅ Topic naming convention
  @EventPattern('content.topic.updated')
  @EventPattern('content.topic.deleted')
  async handle(@Payload() event: TopicEvent) {
    if (await this.isProcessed(event.eventId)) return; // §3.4 idempotency

    switch (event.eventType) {
      case 'TopicCreated':
        await this.dgraphClient.upsertTopic(event.payload);
        break;
      case 'TopicUpdated':
        await this.dgraphClient.updateTopic(event.payload);
        break;
      case 'TopicDeleted':
        await this.dgraphClient.deleteTopic(event.aggregateId);
        break;
    }

    await this.markProcessed(event.eventId);
  }
}
```

---

## 6. API Endpoints

### 6.1. Content-Service Topic APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/v1/topics` | STUDENT+ | List all topics (tree) |
| `GET` | `/api/v1/topics/:topicId` | STUDENT+ | Get topic details |
| `GET` | `/api/v1/topics/:topicId/children` | STUDENT+ | Get child topics |
| `GET` | `/api/v1/topics/:topicId/practice` | STUDENT+ | Get practice path |
| `POST` | `/api/v1/topics` | INSTRUCTOR, ADMIN | Create topic |
| `PATCH` | `/api/v1/topics/:topicId` | INSTRUCTOR, ADMIN | Update topic |
| `DELETE` | `/api/v1/topics/:topicId` | ADMIN | Soft delete topic |

### 6.2. exam-suite - Remove Topic CRUD

| Action | Lý do |
|--------|-------|
| ❌ Remove: POST `/api/v1/question-bank/topics` | Không phải domain của exam |
| ❌ Remove: PATCH `/api/v1/question-bank/topics/:id` | Không phải domain của exam |
| ❌ Remove: DELETE `/api/v1/question-bank/topics/:id` | Không phải domain của exam |
| ✅ Keep: GET `/api/v1/question-bank/topics` | Proxy/cache từ Dgraph |
| ✅ Keep: GET `/api/v1/question-bank/topics/:id` | Proxy/cache từ Dgraph |

### 6.3. Validation Endpoint (exam-service → content-service)

Theo ADR-006 §2.2, service-to-service call nên qua Gateway hoặc direct:

```typescript
// content-service/src/interfaces/rest/topic.controller.ts
@Get(':topicId/exists')
@ApiOperation({ summary: 'Check if topic exists' })
async exists(@Param('topicId') topicId: string): Promise<{ exists: boolean }> {
  const exists = await this.topicService.exists(topicId);
  return { exists };
}

// exam-suite/src/modules/question-bank/question-write.service.ts
async createQuestion(dto: CreateQuestionDto) {
  // Validate topicId exists via content-service (service-to-service)
  const topic = await this.contentServiceClient.getTopic(dto.topicId);
  if (!topic) {
    throw new BusinessException('TOPIC_NOT_FOUND');
  }
  // Tiếp tục...
}
```

### 6.4. API Gateway Routes (theo ADR-006 §2.1)

```yaml
# api-gateway/src/main/resources/application.yml
spring:
  cloud:
    gateway:
      routes:
        # Content Service routes
        - id: content-service
          uri: http://content-service:9001
          predicates:
            - Path=/api/v1/topics/**
          filters:
            - StripPrefix=2  # /api/v1/topics -> /topics

        # Exam Service routes
        - id: exam-suite
          uri: lb://exam-suite
          predicates:
            - Path=/api/v1/question-bank/**
          filters:
            - StripPrefix=2
```

---

## 7. Update service-boundaries.md (REQUIRED)

ADR này yêu cầu cập nhật `service-boundaries.md §1.1`:

```yaml
# UPDATE: content-service ownership
content-service:
  owns: [Course, Lesson, Chapter, Category, Review, Enrollment, Topic]  # ✅ ADD Topic
  databases: [ioes_content, ioes_content_mongo]
  publishes_events: [
    CourseCreated, CoursePublished, CourseEnrolled, ReviewCreated,
    TopicCreated, TopicUpdated, TopicDeleted  # ✅ ADD Topic events
  ]
  consumes_events: [UserRegistered, PaymentCompleted]
  exposes_apis: [/api/v1/courses/*, /api/v1/lessons/*, /api/v1/topics/*]  # ✅ ADD topics

# UPDATE: exam-suite consumes Topic events
exam-suite:
  consumes_events: [
    UserRegistered, CourseEnrolled, QuestionUpdated,
    TopicCreated, TopicUpdated, TopicDeleted  # ✅ ADD
  ]
```

---

## 8. Implementation Plan (theo Hexagonal Architecture - service-boundaries.md §5)

### Phase 1: Content-Service Topic Module (3 days) - Hexagonal

```
content-service/
├── domain/
│   ├── model/
│   │   └── Topic.java                    # Entity
│   ├── event/
│   │   └── TopicDomainEvent.java         # Domain event (part of domain)
│   └── exception/
│       └── TopicNotFoundException.java
│
├── application/
│   ├── port/
│   │   └── TopicRepository.java          # Interface (port)
│   ├── usecase/
│   │   ├── CreateTopicUseCase.java
│   │   ├── UpdateTopicUseCase.java
│   │   └── DeleteTopicUseCase.java
│   ├── dto/
│   │   ├── CreateTopicCommand.java
│   │   └── TopicResponse.java
│   └── service/
│       └── TopicApplicationService.java
│
├── infrastructure/
│   ├── persistence/
│   │   └── JpaTopicRepository.java       # Adapter (implement port)
│   └── kafka/
│       └── TopicEventPublisher.java      # Kafka adapter
│
└── interfaces/
    └── rest/
        └── TopicController.java          # Inbound adapter
```

**Files cần tạo (theo git-workflow.md §3.3 - scope là `content`):**

| Task | File | Mô tả |
|------|------|--------|
| [ ] | `domain/model/Topic.java` | Topic entity (id, name, slug, parentTopic, level, timestamps) |
| [ ] | `domain/event/TopicCreatedEvent.java` | Domain event |
| [ ] | `application/port/TopicRepository.java` | Repository interface |
| [ ] | `application/usecase/CreateTopicUseCase.java` | Create use case |
| [ ] | `application/usecase/UpdateTopicUseCase.java` | Update use case |
| [ ] | `application/usecase/DeleteTopicUseCase.java` | Delete use case |
| [ ] | `infrastructure/persistence/JpaTopicRepository.java` | JPA implementation |
| [ ] | `infrastructure/kafka/TopicEventPublisher.java` | Publish TopicCreated/Updated/Deleted |
| [ ] | `interfaces/rest/TopicController.java` | REST endpoints |
| [ ] | `resources/db/migration/V2__topics.sql` | Flyway migration |
| [ ] | Unit tests ≥ 85% | Test use cases (theo testing-strategy.md §2) |

### Phase 2: Exam-Suite Topic Sync Consumer (2 days)

| Task | File | Mô tả |
|------|------|--------|
| [ ] | `exam-suite/src/modules/question-bank/topic-sync.consumer.ts` | Kafka consumer |
| [ ] | `exam-suite/src/modules/question-bank/dgraph-topic.adapter.ts` | Dgraph upsert logic |
| [ ] | `exam-suite/src/modules/question-bank/topic-cache.service.ts` | Local cache |
| [ ] | Update Dgraph queries cho Topic tree | `LIST_TOPICS_QUERY`, etc |
| [ ] | Integration test với Testcontainers | Kafka + Dgraph |
| [ ] | Unit tests ≥ 85% coverage | Test sync consumer |

### Phase 3: API Gateway Routes (1 day)

| Task | File | Mô tả |
|------|------|--------|
| [ ] | `api-gateway/src/main/resources/application.yml` | Add route to content-service |
| [ ] | Test route forwarding | Verify /api/v1/topics → content-service:9001 |

### Phase 4: exam-suite Remove Topic CRUD (1 day)

| Task | File | Mô tả |
|------|------|--------|
| [ ] | Remove POST `/topics` endpoint | exam-suite/question-bank.controller.ts |
| [ ] | Remove PATCH `/topics/:id` endpoint | exam-suite/question-bank.controller.ts |
| [ ] | Remove DELETE `/topics/:id` endpoint | exam-suite/question-bank.controller.ts |
| [ ] | Update unit tests | Remove tests cho Topic CRUD |

### Phase 5: Integration Testing & Documentation (2 days)

| Task | File | Mô tả |
|------|------|--------|
| [ ] | E2E test: Full Topic CRUD flow | Playwright |
| [ ] | E2E test: Question create with valid/invalid topicId | Playwright |
| [ ] | Update ADR-012 status → Accepted | Sau khi review |
| [ ] | Update service-boundaries.md | Document Topic domain ownership |
| [ ] | Update ROADMAP-question-bank-dgraph.md | Đánh dấu Topic task completed |

---

## 9. Consequences (Hệ quả - theo ADR-001 format)

### 9.1. Positive ✅

| # | Lợi ích | Tham chiếu |
|---|---------|------------|
| 1 | **Đúng kiến trúc microservices** - Topic thuộc Content domain | service-boundaries.md §1 |
| 2 | **Single source of truth** - PostgreSQL trong content-service | service-boundaries.md §4.1 |
| 3 | **Transaction safety** - Topic CRUD có ACID transactions | service-boundaries.md §4.3 |
| 4 | **Clear ownership** - content-service owns Topic | service-boundaries.md §1.1 (sẽ update) |
| 5 | **Scalability** - Mỗi service scale độc lập | service-boundaries.md §11 ❌ |
| 6 | **Event-driven sync** - Kafka events tuân thủ schema | ADR-006 §3.1 |

### 9.2. Negative ⚠️

| # | Hạn chế | Giảm thiểu |
|---|---------|-------------|
| 1 | **Thêm content-service dependency** - exam-suite phụ thuộc content-service | Retry logic + circuit breaker (ADR-009) |
| 2 | **Cross-service validation latency** - Check topicId tồn tại | Local cache với TTL 5 phút (ADR-005) |
| 3 | **Eventual consistency** - Topic mới tạo có thể chưa có ở exam-suite | Read-your-writes pattern |
| 4 | **Migration complexity** - Chuyển Topic data từ exam-suite | One-time migration script |
| 5 | **Thêm Kafka topic** - `content.topic.*` | Theo naming convention §5.3 |

### 9.3. Rollback Plan

Nếu content-service không ổn định:

```yaml
1. exam-suite revert về dùng local Topic table
2. Tạm dừng Kafka consumer (comment @EnableKafka)
3. Không delete Topic endpoints ở exam-suite (comment out thay vì xóa)
4. Topic vẫn nằm trong Dgraph (không mất data)
5. Sau khi fix, enable lại consumer → sync lại data
```

---

## 9. Migration Strategy

### 9.1. Zero-Downtime Migration

**Bước 1:** Triển khai content-service với Topic CRUD (READ-ONLY)
```java
// Ban đầu chỉ expose GET endpoints, import existing data
@ReadOnly
public class TopicService {
    public List<Topic> getAll() {
        return topicRepository.findAll();
    }
}
```

**Bước 2:** Sync existing Topic data từ Dgraph → content-service/PostgreSQL
```bash
# Migration script
node scripts/migrate-topics-from-dgraph.js
```

**Bước 3:** Bật Kafka consumer ở exam-suite
```typescript
// Sau khi data đã sync, bật consumer
@EnableKafka
public class ExamSuiteKafkaConfig { }
```

**Bước 4:** Remove local Topic CRUD ở exam-suite
```typescript
// Xóa các endpoint write cho Topic
```

### 9.2. Data Migration Script

```javascript
// scripts/migrate-topics-from-dgraph.js
async function migrateTopics() {
  // 1. Fetch all topics từ Dgraph
  const topics = await dgraph.query(`
    query {
      queryTopic {
        id name slug description
        parentTopic { id }
      }
    }
  `);

  // 2. Insert vào PostgreSQL (content-service)
  for (const topic of topics) {
    await postgres.topics.insert({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      description: topic.description,
      parent_topic_id: topic.parentTopic?.id || null,
    });
  }

  console.log(`Migrated ${topics.length} topics`);
}
```

---

## 10. References

- [Dgraph Documentation](https://dgraph.io/docs)
- [Content-Service README](../../services/content-service/README.md)
- [Kafka Event Schema](https://github.com/confluentinc/confluent-kafka-dotnet)
- [Service Boundaries](../service-boundaries.md)
- [ADR-001: Use Dgraph for Question Bank](./ADR-001-use-dgraph-for-question-bank.md)

---

## 11. Decision Log

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 27/08/2026 | Backend Lead | Initial draft |
| 1.1 | 27/08/2026 | Backend Lead | Update: Tham chiếu chính xác service-boundaries.md §1.1, §2.2, §3.1; Update event schema envelope; Update Kafka topic naming convention; Update Hexagonal architecture folder structure |

---

## 12. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | `topicId` reference - dùng UUID hay slug? | Open | **Đề xuất:** Dùng UUID (consistent với entities khác) |
| 2 | Content-service có nên expose GraphQL API thay vì REST? | Open | **Đề xuất:** Giữ REST (theo convention), GraphQL khi cần complex query |
| 3 | Topic deletion - RESTRICT hay merge? | Open | **Đề xuất:** RESTRICT nếu có questions, MERGE option cho admin |
| 4 | exam-suite có cần cache local cho Topic? | Open | **Đề xuất:** Có, Redis với TTL 5 phút (ADR-005) |

---

## 13. References

| # | Document | Section | Purpose |
|---|----------|---------|---------|
| 1 | [service-boundaries.md](../service-boundaries.md) | §1.1, §2.2, §3.1 | Service ownership, communication, event schema |
| 2 | [ADR-001](./ADR-001-use-dgraph-for-question-bank.md) | §1.2, §3 | Topic trong Dgraph schema, CQRS pattern |
| 3 | [ADR-006](./ADR-006-service-integration.md) | §2.1, §2.2 | Gateway routes, Kafka events |
| 4 | [ADR-009](../adr/ADR-009-gateway-timeouts-and-circuit-breaker.md) | - | Circuit breaker pattern |
| 5 | [ADR-005](../adr/ADR-005-cache-strategy.md) | - | Caching patterns (TTL 5 phút) |
| 6 | [PROJECT_RULES.md](../../01-business/PROJECT_RULES.md) | Rule 2 | ADR requirement |
| 7 | [BA_DOCUMENT.md](../../01-business/BA_DOCUMENT.md) | §3.1.2, §4.1, §8.3, §8.4, §15.2 | Module Content, Service Inventory, Caching Strategy |
| 8 | [git-workflow.md](../../03-development/git-workflow.md) | §1, §2, §3 | Branch naming, commit convention, PR process |
| 9 | [testing-strategy.md](../../03-development/testing-strategy.md) | §1, §2, §3 | Test pyramid, coverage, test types |
| 10 | [node-styleguide.md](../../03-development/coding-standards/node-styleguide.md) | §1, §2 | NestJS structure, naming conventions |
| 11 | [java-styleguide.md](../../03-development/coding-standards/java-styleguide.md) | §1, §2 | Java naming, package structure |
| 12 | [Dgraph Documentation](https://dgraph.io/docs) | - | GraphQL schema, mutations |
| 13 | [Content-Service README](../../services/content-service/README.md) | - | Service overview |

---

### docs/03-development - Các Section liên quan

```yaml
# git-workflow.md
# §1.2 Branch Types: feature/content-PROJ-xxx-topic-management
# §3.3 Scope: (content) cho content-service
# §4.2 PR Rules: PR < 400 lines, squash merge

# testing-strategy.md
# §2 Coverage Requirements: Business logic ≥ 85%, Controllers ≥ 80%
# §3.1 Unit Tests: Fast < 100ms, mock dependencies

# node-styleguide.md (cho exam-suite)
# §1 Naming: PascalCase classes, camelCase methods
# §2.1 Module Organization: controller/service/repository/entities/dto

# java-styleguide.md (cho content-service - Java)
# §1 Naming: PascalCase classes, camelCase methods
# §2.1 Package: com.ioes.content.domain.model, .application.usecase, .infrastructure.persistence
```

---

## 14. Checklist - Required Updates khi ADR được Accept

Sau khi ADR-012 được **Accepted**, cần update:

- [ ] `docs/02-architecture/service-boundaries.md` §1.1 - Thêm `Topic` vào `content-service.owns`
- [ ] `docs/02-architecture/service-boundaries.md` §1.1 - Thêm `TopicCreated, TopicUpdated, TopicDeleted` vào `content-service.publishes_events`
- [ ] `docs/02-architecture/service-boundaries.md` §1.1 - Thêm `TopicCreated, TopicUpdated, TopicDeleted` vào `exam-suite.consumes_events`
- [ ] `docs/02-architecture/service-boundaries.md` §1.1 - Thêm `/api/v1/topics/*` vào `content-service.exposes_apis`
- [ ] `docs/02-architecture/adr/ROADMAP-question-bank-dgraph.md` - Đánh dấu Topic ownership task

# ADR-012: Tách Topic Management sang Content-Service

> **Status:** ✅ Implemented (Phase 1-5 Completed)
> **Date:** 27/08/2026
> **Decision Makers:** Tech Lead, Backend-Node Lead, Backend-Java Lead
> **Related Documents:**
> - [ADR-001](./ADR-001-use-dgraph-for-question-bank.md) - Use Dgraph for Question Bank
> - [ADR-006](./ADR-006-service-integration.md) - Service Integration (Eureka, Gateway, Kafka)
> - [ROADMAP-question-bank-dgraph.md](./ROADMAP-question-bank-dgraph.md) - Question Bank Roadmap
> - [PROJECT_RULES.md](../../01-business/PROJECT_RULES.md) - Rule 2 (architectural changes require ADR)
> - [service-boundaries.md](../service-boundaries.md) - microservice boundaries (§1.1, §2.2, §3.1)

---

## 1. Context (Bối cảnh)

### 1.1. Trạng thái hiện tại (theo service-boundaries.md)

**Service Ownership hiện tại:**

```yaml
# service-boundaries.md §1.1 - content-service (KHÔNG có Topic!)
content-service:
  owns: [Course, Lesson, Chapter, Category, Review, Enrollment]  # ❌ Topic NOT listed
  publishes_events: [CourseCreated, CoursePublished, CourseEnrolled, ReviewCreated]
  exposes_apis: [/api/v1/courses/*, /api/v1/lessons/*]

# service-boundaries.md §1.1 - exam-suite (owns Question, read Dgraph)
exam-suite:
  owns: [Exam, Question, Submission, Attempt, ProctoringSession, GradingResult]
  publishes_events: [ExamStarted, ExamSubmitted, ExamGraded, ProctorAlert, QuestionUpdated]
  exposes_apis: [/api/v1/exams/*, /api/v1/attempts/*, /api/v1/submissions/*, /api/v1/question-bank/*]
```

**Kết luận:** Topic hiện **KHÔNG thuộc domain nào** - đây là architectural gap cần fix.

```typescript
// Dgraph Schema (question-bank-schema.graphql)
type Topic {
    id: ID!
    name: String! @search(by: [term, fulltext])
    slug: String! @search(by: [exact])
    description: String @search(by: [fulltext])
    parentTopic: Topic @hasInverse(field: subTopics)
    subTopics: [Topic] @hasInverse(field: parentTopic)
    questions: [Question] @hasInverse(field: topic)
    createdAt: DateTime!
    updatedAt: DateTime!
}
```

**Vấn đề phát hiện:**

| # | Issue | Severity |
|---|-------|----------|
| 1 | **Vi phạm Service Boundaries** - Topic thuộc business domain "Content" không phải "Exam" | 🔴 Cao |
| 2 | **Không có CRUD write cho Topic** - exam-suite chỉ đọc, không tạo/sửa/xóa được | 🔴 Cao |
| 3 | **Source-of-truth không rõ ràng** - Topic trong Dgraph không có event-driven sync từ source | 🟠 TB |
| 4 | **Content-service chưa implement** - đúng theo kiến trúc nhưng chưa có code | 🟡 Thấp |

### 1.2. Phân tích Domain

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONTENT DOMAIN                              │
│  (Content Service - Java 9001)                                  │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│  │  Course  │   │  Chapter │   │  Lesson  │   │   Topic  │  │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘  │
│                                                         ▲      │
│                                               (Knowledge)│      │
└─────────────────────────────────────────────────────────────────┘
                                                                 │
                        │ Kafka events                            │
                        ▼ (topic.created, topic.updated, etc)     │
┌─────────────────────────────────────────────────────────────────┐
│                       EXAM DOMAIN                                │
│  (Exam Suite - Node.js 9005)                                    │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                  │
│  │ Question │   │   Exam   │   │Submission│                  │
│  └────┬─────┘   └──────────┘   └──────────┘                  │
│       │                                                       │
│       │ topicId (foreign key reference)                       │
│       ▼                                                       │
│  Topic (READ-ONLY from Dgraph)                                │
└─────────────────────────────────────────────────────────────────┘
```

**Kết luận Domain Analysis:**
- Topic là part-of Course/Lesson structure (Content domain)
- Question tham chiếu Topic qua `topicId` (Exam domain)
- Content-Service nên là **single source of truth** cho Topic

### 1.3. Current API Endpoints

**exam-suite hiện tại (chỉ READ):**

| Method | Endpoint | Mô tả | Trạng thái |
|--------|----------|--------|------------|
| GET | `/api/v1/question-bank/topics` | List topics tree | ✅ Working |
| GET | `/api/v1/question-bank/topics/:topicId` | Get 1 topic | ✅ Working |
| GET | `/api/v1/question-bank/topics/:topicId/practice` | Practice path | ✅ Working |
| POST | `/api/v1/question-bank/topics` | Create topic | ❌ Không có |
| PATCH | `/api/v1/question-bank/topics/:topicId` | Update topic | ❌ Không có |
| DELETE | `/api/v1/question-bank/topics/:topicId` | Delete topic | ❌ Không có |

---

## 2. Decision (Quyết định)

### 2.1. Quyết định chính

**Tách Topic Management hoàn toàn sang content-service**, exam-suite chỉ reference qua `topicId`:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTENT-SERVICE (Java)                      │
│  Port: 9001                                                     │
│  Tech: Spring Boot 3 + JPA + PostgreSQL                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Topic Module                                             │   │
│  │ ├── TopicController (REST)                              │   │
│  │ ├── TopicService (business logic)                      │   │
│  │ ├── TopicRepository (JPA)                               │   │
│  │ └── TopicEventPublisher (Kafka)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│                  ┌──────────────┐                              │
│                  │ PostgreSQL   │                              │
│                  │ ioes_content │                              │
│                  │ (topics tbl) │                              │
│                  └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                              │
              Kafka: topic.events
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXAM-SUITE (Node.js)                      │
│  Port: 9005                                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Question Module                                          │   │
│  │ ├── QuestionController                                 │   │
│  │ ├── QuestionService                                     │   │
│  │ └── QuestionRepository (JPA)                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Topic Sync Consumer (NEW)                               │   │
│  │ └── Subscribe: topic.created/updated/deleted           │   │
│  │ └── Upsert vào Dgraph (read-side cache)               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │   Dgraph    │
                      │ (read-side) │
                      └──────────────┘
```

### 2.2. Phương án đã loại trừ

| Phương án | Lý do loại |
|-----------|-----------|
| **Giữ nguyên exam-suite quản lý Topic** | Vi phạm service boundaries, Topic thuộc Content domain |
| **Tách thành topic-service riêng** | Over-engineering, chỉ có 1 bounded context |
| **Dùng Dgraph làm source-of-truth cho Topic** | Dgraph không phải transactional DB, khó maintain consistency |

---

## 3. Architecture (Kiến trúc chi tiết)

### 3.1. Data Flow cho Topic CRUD

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CREATE TOPIC                                                 │
│                                                                 │
│ Instructor → POST /api/v1/topics                                │
│          → Content-Service/TopicController                      │
│          → TopicService.create()                                │
│          → TopicRepository.save() → PostgreSQL                  │
│          → TopicEventPublisher.publish(TopicCreated) → Kafka   │
│          ← 201 Created { id, ... }                             │
│                                                                 │
│ [Async] exam-suite/TopicSyncConsumer                           │
│         → Upsert Topic vào Dgraph                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. UPDATE TOPIC                                                 │
│                                                                 │
│ Instructor → PATCH /api/v1/topics/:topicId                     │
│          → Content-Service validate (không có parent cycle)    │
│          → TopicRepository.update() → PostgreSQL                │
│          → TopicEventPublisher.publish(TopicUpdated) → Kafka   │
│          ← 200 OK                                              │
│                                                                 │
│ [Async] exam-suite/TopicSyncConsumer                           │
│         → Update Topic vào Dgraph                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 3. DELETE TOPIC                                                 │
│                                                                 │
│ Instructor → DELETE /api/v1/topics/:topicId                     │
│          → Content-Service check (không có câu hỏi nào?)       │
│          → TopicRepository.softDelete() → PostgreSQL           │
│          → TopicEventPublisher.publish(TopicDeleted) → Kafka   │
│          ← 204 No Content                                      │
│                                                                 │
│ [Async] exam-suite/TopicSyncConsumer                           │
│         → Delete Topic khỏi Dgraph                             │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2. Data Flow cho Question-Topic relationship

```
┌─────────────────────────────────────────────────────────────────┐
│ CREATE QUESTION (exam-suite)                                     │
│                                                                 │
│ Instructor → POST /api/v1/question-bank/questions               │
│ Body: { topicId: "uuid", ... }                                 │
│                                                                 │
│ exam-suite → Validate topicId exists?                          │
│           → Gọi Content-Service /topics/:topicId (hoặc cache) │
│           → INSERT questions (PostgreSQL - ioes_exam)          │
│           → Publish QuestionCreated event → Kafka               │
│           ← 201 Created                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3. Validation Strategy

**Option A: Synchronous Validation (Recommended)**
```typescript
// exam-suite/question.service.ts
async createQuestion(dto: CreateQuestionDto) {
  // Gọi content-service để validate topicId tồn tại
  const topic = await this.contentServiceClient.getTopic(dto.topicId);
  if (!topic) {
    throw new BusinessException('TOPIC_NOT_FOUND', `Topic ${dto.topicId} not found`);
  }
  // Tiếp tục create question
}
```

**Option B: Async Validation (Kafka-based)**
- Chỉ validate format `topicId` (UUID)
- Sau khi create, event-driven check topic existence
- Phù hợp với write-heavy workload

### 3.4. Service-to-Service Communication

| From | To | Method | Purpose |
|------|----|--------|---------|
| exam-suite | content-service | REST (via API Gateway) | Validate topicId |
| content-service | exam-suite | Kafka events | Topic sync to Dgraph |

```yaml
# API Gateway routes (application.yml)
- id: content-service
  uri: http://content-service:9001
  predicates:
    - Path=/api/v1/topics/**
  filters:
    - StripPrefix=2  # /api/v1/topics -> /topics
```

### 3.5. Topic Cache trong exam-suite

```typescript
// exam-suite/topic-cache.service.ts
@Injectable()
export class TopicCacheService {
  private cache = new Map<string, CachedTopic>();

  async getTopic(topicId: string): Promise<Topic | null> {
    const cached = this.cache.get(topicId);
    if (cached && Date.now() - cached.timestamp < 300_000) {
      return cached.topic;
    }
    // Fallback: gọi content-service
    const topic = await this.contentServiceClient.getTopic(topicId);
    this.cache.set(topicId, { topic, timestamp: Date.now() });
    return topic;
  }
}
```

---

## 4. Database Schema

### 4.1. PostgreSQL - content-service (ioes_content)

```sql
-- V1__init_content_schema.sql (có thể update)

CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 0,  -- 0=root, 1=child, 2=grandchild
    path LTREE,  -- Materialized path for efficient tree queries
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_topics_parent ON topics(parent_topic_id);
CREATE INDEX idx_topics_slug ON topics(slug);
CREATE INDEX idx_topics_level ON topics(level);
CREATE INDEX idx_topics_path ON topics USING GIST(path);
```

### 4.2. PostgreSQL - exam-suite (ioes_exam)

```sql
-- Không đổi - questions.topicId vẫn là UUID reference
ALTER TABLE questions ADD CONSTRAINT fk_questions_topic
    FOREIGN KEY (topic_id) REFERENCES content.topics(id) ON DELETE RESTRICT;
```

> **Note:** FK constraint vẫn OK vì content-service và exam-suite dùng 2 database khác nhau. FK chỉ là documentation, không enforce ở database level (cross-database FK không supported).

### 4.3. Dgraph Schema (read-side cache)

```graphql
# Không đổi, chỉ sync từ content-service

type Topic {
    id: ID!
    name: String! @search(by: [term, fulltext])
    slug: String! @search(by: [exact])
    description: String @search(by: [fulltext])
    parentTopic: Topic @hasInverse(field: subTopics)
    subTopics: [Topic] @hasInverse(field: parentTopic)
    questions: [Question] @hasInverse(field: topic)
    level: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
}
```

---

## 5. Kafka Events Schema (theo service-boundaries.md §3.1)

### 5.1. Event Envelope (BẮT BUỘC)

```json
{
  "eventId": "uuid-v7",
  "eventType": "TopicCreated",
  "eventVersion": "1.0",
  "occurredAt": "2026-08-27T14:00:00Z",
  "aggregateId": "topic-uuid",
  "aggregateType": "Topic",
  "correlationId": "trace-id-xxx",
  "causationId": "command-id-xxx",
  "source": "content-service",
  "payload": { ... },
  "metadata": {
    "userId": "user-uuid",
    "ip": "192.168.1.1"
  }
}
```

### 5.2. Topic Events (Past tense, theo §3.2)

```typescript
// TopicCreated Event
{
  eventType: "TopicCreated",       // ✅ Past tense (NOT TopicCreate)
  payload: {
    id: "topic-uuid",
    name: "Java Fundamentals",
    slug: "java-fundamentals",
    description: "Basic Java programming concepts",
    parentTopicId: null,
    level: 0
  }
}

// TopicUpdated Event
{
  eventType: "TopicUpdated",       // ✅ Past tense
  payload: {
    id: "topic-uuid",
    name: "Java Core",
    slug: "java-core",
    parentTopicId: "parent-uuid",
    level: 0
  }
}

// TopicDeleted Event
{
  eventType: "TopicDeleted",       // ✅ Past tense
  payload: {
    id: "topic-uuid",
    reason: "MANUAL"               // hoặc "MERGED"
  }
}
```

### 5.3. Kafka Topic Naming (theo §2.2)

```yaml
topic_naming: {service}.{aggregate}.{action}

content.topics.created   # ❌ SAI
content.topic.created    # ❌ SAI
content-service.topic.created  # ❌ SAI

✅ content.topic.created
✅ content.topic.updated
✅ content.topic.deleted
```

### 5.4. Idempotency (theo §3.4)

```yaml
# Consumers PHẢI be idempotent
# eventId là idempotency key

exam-suite/TopicSyncConsumer:
  1. Check: eventId đã xử lý chưa (Redis/bảng processed_events)?
  2. Nếu đã xử lý → skip
  3. Nếu chưa → process → mark processed
```

### 5.5. Exam-suite Consumer

```typescript
// exam-suite/src/modules/question-bank/topic-sync.consumer.ts
@Injectable()
export class TopicSyncConsumer {
  @EventPattern('content.topic.created')  // ✅ Topic naming convention
  @EventPattern('content.topic.updated')
  @EventPattern('content.topic.deleted')
  async handle(@Payload() event: TopicEvent) {
    if (await this.isProcessed(event.eventId)) return; // §3.4 idempotency

    switch (event.eventType) {
      case 'TopicCreated':
        await this.dgraphClient.upsertTopic(event.payload);
        break;
      case 'TopicUpdated':
        await this.dgraphClient.updateTopic(event.payload);
        break;
      case 'TopicDeleted':
        await this.dgraphClient.deleteTopic(event.aggregateId);
        break;
    }

    await this.markProcessed(event.eventId);
  }
}
```

---

## 6. API Endpoints

### 6.1. Content-Service Topic APIs

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/v1/topics` | STUDENT+ | List all topics (tree) |
| `GET` | `/api/v1/topics/:topicId` | STUDENT+ | Get topic details |
| `GET` | `/api/v1/topics/:topicId/children` | STUDENT+ | Get child topics |
| `GET` | `/api/v1/topics/:topicId/practice` | STUDENT+ | Get practice path |
| `POST` | `/api/v1/topics` | INSTRUCTOR, ADMIN | Create topic |
| `PATCH` | `/api/v1/topics/:topicId` | INSTRUCTOR, ADMIN | Update topic |
| `DELETE` | `/api/v1/topics/:topicId` | ADMIN | Soft delete topic |

### 6.2. exam-suite - Remove Topic CRUD

| Action | Lý do |
|--------|-------|
| ❌ Remove: POST `/api/v1/question-bank/topics` | Không phải domain của exam |
| ❌ Remove: PATCH `/api/v1/question-bank/topics/:id` | Không phải domain của exam |
| ❌ Remove: DELETE `/api/v1/question-bank/topics/:id` | Không phải domain của exam |
| ✅ Keep: GET `/api/v1/question-bank/topics` | Proxy/cache từ Dgraph |
| ✅ Keep: GET `/api/v1/question-bank/topics/:id` | Proxy/cache từ Dgraph |

### 6.3. Validation Endpoint (exam-service → content-service)

Theo ADR-006 §2.2, service-to-service call nên qua Gateway hoặc direct:

```typescript
// content-service/src/interfaces/rest/topic.controller.ts
@Get(':topicId/exists')
@ApiOperation({ summary: 'Check if topic exists' })
async exists(@Param('topicId') topicId: string): Promise<{ exists: boolean }> {
  const exists = await this.topicService.exists(topicId);
  return { exists };
}

// exam-suite/src/modules/question-bank/question-write.service.ts
async createQuestion(dto: CreateQuestionDto) {
  // Validate topicId exists via content-service (service-to-service)
  const topic = await this.contentServiceClient.getTopic(dto.topicId);
  if (!topic) {
    throw new BusinessException('TOPIC_NOT_FOUND');
  }
  // Tiếp tục...
}
```

### 6.4. API Gateway Routes (theo ADR-006 §2.1)

```yaml
# api-gateway/src/main/resources/application.yml
spring:
  cloud:
    gateway:
      routes:
        # Content Service routes
        - id: content-service
          uri: http://content-service:9001
          predicates:
            - Path=/api/v1/topics/**
          filters:
            - StripPrefix=2  # /api/v1/topics -> /topics

        # Exam Service routes
        - id: exam-suite
          uri: lb://exam-suite
          predicates:
            - Path=/api/v1/question-bank/**
          filters:
            - StripPrefix=2
```

---

## 7. Update service-boundaries.md (REQUIRED)

ADR này yêu cầu cập nhật `service-boundaries.md §1.1`:

```yaml
# UPDATE: content-service ownership
content-service:
  owns: [Course, Lesson, Chapter, Category, Review, Enrollment, Topic]  # ✅ ADD Topic
  databases: [ioes_content, ioes_content_mongo]
  publishes_events: [
    CourseCreated, CoursePublished, CourseEnrolled, ReviewCreated,
    TopicCreated, TopicUpdated, TopicDeleted  # ✅ ADD Topic events
  ]
  consumes_events: [UserRegistered, PaymentCompleted]
  exposes_apis: [/api/v1/courses/*, /api/v1/lessons/*, /api/v1/topics/*]  # ✅ ADD topics

# UPDATE: exam-suite consumes Topic events
exam-suite:
  consumes_events: [
    UserRegistered, CourseEnrolled, QuestionUpdated,
    TopicCreated, TopicUpdated, TopicDeleted  # ✅ ADD
  ]
```

---

## 8. Implementation Plan (theo Hexagonal Architecture - service-boundaries.md §5)

### Phase 1: Content-Service Topic Module (3 days) - Hexagonal

```
content-service/
├── domain/
│   ├── model/
│   │   └── Topic.java                    # Entity
│   ├── event/
│   │   └── TopicDomainEvent.java         # Domain event (part of domain)
│   └── exception/
│       └── TopicNotFoundException.java
│
├── application/
│   ├── port/
│   │   └── TopicRepository.java          # Interface (port)
│   ├── usecase/
│   │   ├── CreateTopicUseCase.java
│   │   ├── UpdateTopicUseCase.java
│   │   └── DeleteTopicUseCase.java
│   ├── dto/
│   │   ├── CreateTopicCommand.java
│   │   └── TopicResponse.java
│   └── service/
│       └── TopicApplicationService.java
│
├── infrastructure/
│   ├── persistence/
│   │   └── JpaTopicRepository.java       # Adapter (implement port)
│   └── kafka/
│       └── TopicEventPublisher.java      # Kafka adapter
│
└── interfaces/
    └── rest/
        └── TopicController.java          # Inbound adapter
```

**Files cần tạo (theo git-workflow.md §3.3 - scope là `content`):**

| Task | File | Mô tả |
|------|------|--------|
| [ ] | `domain/model/Topic.java` | Topic entity (id, name, slug, parentTopic, level, timestamps) |
| [ ] | `domain/event/TopicCreatedEvent.java` | Domain event |
| [ ] | `application/port/TopicRepository.java` | Repository interface |
| [ ] | `application/usecase/CreateTopicUseCase.java` | Create use case |
| [ ] | `application/usecase/UpdateTopicUseCase.java` | Update use case |
| [ ] | `application/usecase/DeleteTopicUseCase.java` | Delete use case |
| [ ] | `infrastructure/persistence/JpaTopicRepository.java` | JPA implementation |
| [ ] | `infrastructure/kafka/TopicEventPublisher.java` | Publish TopicCreated/Updated/Deleted |
| [ ] | `interfaces/rest/TopicController.java` | REST endpoints |
| [ ] | `resources/db/migration/V2__topics.sql` | Flyway migration |
| [ ] | Unit tests ≥ 85% | Test use cases (theo testing-strategy.md §2) |

### Phase 2: Exam-Suite Topic Sync Consumer (2 days)

| Task | File | Mô tả |
|------|------|--------|
| [ ] | `exam-suite/src/modules/question-bank/topic-sync.consumer.ts` | Kafka consumer |
| [ ] | `exam-suite/src/modules/question-bank/dgraph-topic.adapter.ts` | Dgraph upsert logic |
| [ ] | `exam-suite/src/modules/question-bank/topic-cache.service.ts` | Local cache |
| [ ] | Update Dgraph queries cho Topic tree | `LIST_TOPICS_QUERY`, etc |
| [ ] | Integration test với Testcontainers | Kafka + Dgraph |
| [ ] | Unit tests ≥ 85% coverage | Test sync consumer |

### Phase 3: API Gateway Routes (1 day)

| Task | File | Mô tả |
|------|------|--------|
| [ ] | `api-gateway/src/main/resources/application.yml` | Add route to content-service |
| [ ] | Test route forwarding | Verify /api/v1/topics → content-service:9001 |

### Phase 4: exam-suite Remove Topic CRUD (1 day)

| Task | File | Mô tả |
|------|------|--------|
| [ ] | Remove POST `/topics` endpoint | exam-suite/question-bank.controller.ts |
| [ ] | Remove PATCH `/topics/:id` endpoint | exam-suite/question-bank.controller.ts |
| [ ] | Remove DELETE `/topics/:id` endpoint | exam-suite/question-bank.controller.ts |
| [ ] | Update unit tests | Remove tests cho Topic CRUD |

### Phase 5: Integration Testing & Documentation (2 days)

| Task | File | Mô tả |
|------|------|--------|
| [ ] | E2E test: Full Topic CRUD flow | Playwright |
| [ ] | E2E test: Question create with valid/invalid topicId | Playwright |
| [ ] | Update ADR-012 status → Accepted | Sau khi review |
| [ ] | Update service-boundaries.md | Document Topic domain ownership |
| [ ] | Update ROADMAP-question-bank-dgraph.md | Đánh dấu Topic task completed |

---

## 9. Consequences (Hệ quả - theo ADR-001 format)

### 9.1. Positive ✅

| # | Lợi ích | Tham chiếu |
|---|---------|------------|
| 1 | **Đúng kiến trúc microservices** - Topic thuộc Content domain | service-boundaries.md §1 |
| 2 | **Single source of truth** - PostgreSQL trong content-service | service-boundaries.md §4.1 |
| 3 | **Transaction safety** - Topic CRUD có ACID transactions | service-boundaries.md §4.3 |
| 4 | **Clear ownership** - content-service owns Topic | service-boundaries.md §1.1 (sẽ update) |
| 5 | **Scalability** - Mỗi service scale độc lập | service-boundaries.md §11 ❌ |
| 6 | **Event-driven sync** - Kafka events tuân thủ schema | ADR-006 §3.1 |

### 9.2. Negative ⚠️

| # | Hạn chế | Giảm thiểu |
|---|---------|-------------|
| 1 | **Thêm content-service dependency** - exam-suite phụ thuộc content-service | Retry logic + circuit breaker (ADR-009) |
| 2 | **Cross-service validation latency** - Check topicId tồn tại | Local cache với TTL 5 phút (ADR-005) |
| 3 | **Eventual consistency** - Topic mới tạo có thể chưa có ở exam-suite | Read-your-writes pattern |
| 4 | **Migration complexity** - Chuyển Topic data từ exam-suite | One-time migration script |
| 5 | **Thêm Kafka topic** - `content.topic.*` | Theo naming convention §5.3 |

### 9.3. Rollback Plan

Nếu content-service không ổn định:

```yaml
1. exam-suite revert về dùng local Topic table
2. Tạm dừng Kafka consumer (comment @EnableKafka)
3. Không delete Topic endpoints ở exam-suite (comment out thay vì xóa)
4. Topic vẫn nằm trong Dgraph (không mất data)
5. Sau khi fix, enable lại consumer → sync lại data
```

---

## 9. Migration Strategy

### 9.1. Zero-Downtime Migration

**Bước 1:** Triển khai content-service với Topic CRUD (READ-ONLY)
```java
// Ban đầu chỉ expose GET endpoints, import existing data
@ReadOnly
public class TopicService {
    public List<Topic> getAll() {
        return topicRepository.findAll();
    }
}
```

**Bước 2:** Sync existing Topic data từ Dgraph → content-service/PostgreSQL
```bash
# Migration script
node scripts/migrate-topics-from-dgraph.js
```

**Bước 3:** Bật Kafka consumer ở exam-suite
```typescript
// Sau khi data đã sync, bật consumer
@EnableKafka
public class ExamSuiteKafkaConfig { }
```

**Bước 4:** Remove local Topic CRUD ở exam-suite
```typescript
// Xóa các endpoint write cho Topic
```

### 9.2. Data Migration Script

```javascript
// scripts/migrate-topics-from-dgraph.js
async function migrateTopics() {
  // 1. Fetch all topics từ Dgraph
  const topics = await dgraph.query(`
    query {
      queryTopic {
        id name slug description
        parentTopic { id }
      }
    }
  `);

  // 2. Insert vào PostgreSQL (content-service)
  for (const topic of topics) {
    await postgres.topics.insert({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      description: topic.description,
      parent_topic_id: topic.parentTopic?.id || null,
    });
  }

  console.log(`Migrated ${topics.length} topics`);
}
```

---

## 10. References

- [Dgraph Documentation](https://dgraph.io/docs)
- [Content-Service README](../../services/content-service/README.md)
- [Kafka Event Schema](https://github.com/confluentinc/confluent-kafka-dotnet)
- [Service Boundaries](../service-boundaries.md)
- [ADR-001: Use Dgraph for Question Bank](./ADR-001-use-dgraph-for-question-bank.md)

---

## 11. Decision Log

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 27/08/2026 | Backend Lead | Initial draft |
| 1.1 | 27/08/2026 | Backend Lead | Update: Tham chiếu chính xác service-boundaries.md §1.1, §2.2, §3.1; Update event schema envelope; Update Kafka topic naming convention; Update Hexagonal architecture folder structure |

---

## 12. Open Questions

| # | Question | Status | Resolution |
|---|----------|--------|------------|
| 1 | `topicId` reference - dùng UUID hay slug? | Open | **Đề xuất:** Dùng UUID (consistent với entities khác) |
| 2 | Content-service có nên expose GraphQL API thay vì REST? | Open | **Đề xuất:** Giữ REST (theo convention), GraphQL khi cần complex query |
| 3 | Topic deletion - RESTRICT hay merge? | Open | **Đề xuất:** RESTRICT nếu có questions, MERGE option cho admin |
| 4 | exam-suite có cần cache local cho Topic? | Open | **Đề xuất:** Có, Redis với TTL 5 phút (ADR-005) |

---

## 13. References

| # | Document | Section | Purpose |
|---|----------|---------|---------|
| 1 | [service-boundaries.md](../service-boundaries.md) | §1.1, §2.2, §3.1 | Service ownership, communication, event schema |
| 2 | [ADR-001](./ADR-001-use-dgraph-for-question-bank.md) | §1.2, §3 | Topic trong Dgraph schema, CQRS pattern |
| 3 | [ADR-006](./ADR-006-service-integration.md) | §2.1, §2.2 | Gateway routes, Kafka events |
| 4 | [ADR-009](../adr/ADR-009-gateway-timeouts-and-circuit-breaker.md) | - | Circuit breaker pattern |
| 5 | [ADR-005](../adr/ADR-005-cache-strategy.md) | - | Caching patterns (TTL 5 phút) |
| 6 | [PROJECT_RULES.md](../../01-business/PROJECT_RULES.md) | Rule 2 | ADR requirement |
| 7 | [BA_DOCUMENT.md](../../01-business/BA_DOCUMENT.md) | §3.1.2, §4.1, §8.3, §8.4, §15.2 | Module Content, Service Inventory, Caching Strategy |
| 8 | [git-workflow.md](../../03-development/git-workflow.md) | §1, §2, §3 | Branch naming, commit convention, PR process |
| 9 | [testing-strategy.md](../../03-development/testing-strategy.md) | §1, §2, §3 | Test pyramid, coverage, test types |
| 10 | [node-styleguide.md](../../03-development/coding-standards/node-styleguide.md) | §1, §2 | NestJS structure, naming conventions |
| 11 | [java-styleguide.md](../../03-development/coding-standards/java-styleguide.md) | §1, §2 | Java naming, package structure |
| 12 | [Dgraph Documentation](https://dgraph.io/docs) | - | GraphQL schema, mutations |
| 13 | [Content-Service README](../../services/content-service/README.md) | - | Service overview |

---

### docs/03-development - Các Section liên quan

```yaml
# git-workflow.md
# §1.2 Branch Types: feature/content-PROJ-xxx-topic-management
# §3.3 Scope: (content) cho content-service
# §4.2 PR Rules: PR < 400 lines, squash merge

# testing-strategy.md
# §2 Coverage Requirements: Business logic ≥ 85%, Controllers ≥ 80%
# §3.1 Unit Tests: Fast < 100ms, mock dependencies

# node-styleguide.md (cho exam-suite)
# §1 Naming: PascalCase classes, camelCase methods
# §2.1 Module Organization: controller/service/repository/entities/dto

# java-styleguide.md (cho content-service - Java)
# §1 Naming: PascalCase classes, camelCase methods
# §2.1 Package: com.ioes.content.domain.model, .application.usecase, .infrastructure.persistence
```

---

## 14. Checklist - Required Updates khi ADR được Accept

Sau khi ADR-012 được **Accepted**, cần update:

- [ ] `docs/02-architecture/service-boundaries.md` §1.1 - Thêm `Topic` vào `content-service.owns`
- [ ] `docs/02-architecture/service-boundaries.md` §1.1 - Thêm `TopicCreated, TopicUpdated, TopicDeleted` vào `content-service.publishes_events`
- [ ] `docs/02-architecture/service-boundaries.md` §1.1 - Thêm `TopicCreated, TopicUpdated, TopicDeleted` vào `exam-suite.consumes_events`
- [ ] `docs/02-architecture/service-boundaries.md` §1.1 - Thêm `/api/v1/topics/*` vào `content-service.exposes_apis`
- [ ] `docs/02-architecture/adr/ROADMAP-question-bank-dgraph.md` - Đánh dấu Topic ownership task
