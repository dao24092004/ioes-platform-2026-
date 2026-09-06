# 🏗️ Architecture Rules & Service Boundaries
## Quy tắc kiến trúc Microservices cho IOES

> **Áp dụng cho:** Tất cả developers khi thiết kế/triển khai services
> **Owner:** Tech Lead + Solution Architect

---

## 1. MICROSERVICES BOUNDARIES

### 1.1 Service Ownership

Mỗi service là **1 bounded context** với database, business logic, và API riêng.

```yaml
# Service ownership map

auth-service:
  owns: [User, Role, Permission, Session, OAuthAccount]
  databases: [ioes_auth]
  publishes_events: [UserRegistered, UserLoggedIn, PasswordReset, UserUpdated]
  consumes_events: []
  exposes_apis: [/api/v1/auth/*, /api/v1/users/*]

content-service:
  owns: [Course, Lesson, Chapter, Category, Review, Enrollment]
  databases: [ioes_content, ioes_content_mongo]
  publishes_events: [CourseCreated, CoursePublished, CourseEnrolled, ReviewCreated]
  consumes_events: [UserRegistered, PaymentCompleted]
  exposes_apis: [/api/v1/courses/*, /api/v1/lessons/*]

exam-suite:
  owns: [Exam, Question, Submission, Attempt, ProctoringSession, GradingResult]
  databases: [ioes_exam, ioes_question_bank_graph]
  publishes_events: [ExamStarted, ExamSubmitted, ExamGraded, ProctorAlert, QuestionUpdated]
  consumes_events: [UserRegistered, CourseEnrolled, QuestionUpdated]
  exposes_apis: [/api/v1/exams/*, /api/v1/attempts/*, /api/v1/submissions/*, /api/v1/question-bank/*]
  exposes_websockets: [/ws/exam/*, /ws/proctoring/*]
  notes: >
    Module `question-bank` trong exam-suite sử dụng Dgraph (Graph NoSQL native
    GraphQL) làm read-side store cho Question Bank, theo CQRS pattern.
    PostgreSQL giữ source-of-truth (write), Dgraph phục vụ read/traversal.
    Sync qua Kafka topic `question.events`. Xem chi tiết:
    docs/02-architecture/adr/ADR-001-use-dgraph-for-question-bank.md

ai-suite:
  owns: [LearningPath, Recommendation, ChatSession, ModelRegistry]
  databases: [ioes_ai, ioes_milvus]
  publishes_events: [LearningPathGenerated, RecommendationUpdated]
  consumes_events: [UserRegistered, ExamGraded, CourseEnrolled]
  exposes_apis: [/api/v1/ai/*]

blockchain-suite:
  owns: [Certificate, SmartContract, IPFSRecord, TokenTransaction]
  databases: [ioes_blockchain]
  publishes_events: [CertificateIssued, CertificateRevoked]
  consumes_events: [ExamGraded, UserRegistered]
  exposes_apis: [/api/v1/certificates/*, /api/v1/verify/*]

analytics-service:
  owns: [Event, Metric, Dashboard, Report]
  databases: [ioes_analytics, ioes_clickhouse]
  publishes_events: []
  consumes_events: [ALL]  # Analytics consume all events
  exposes_apis: [/api/v1/analytics/*, /api/v1/reports/*]

notification-service:
  owns: [Notification, Template, DeliveryLog]
  databases: [ioes_notification]
  publishes_events: [NotificationSent, NotificationFailed]
  consumes_events: [ALL]  # Notification consume relevant events
  exposes_apis: [/api/v1/notifications/*]
```

---

## 2. COMMUNICATION PATTERNS

### 2.1 Khi nào dùng gì?

```yaml
SYNCHRONOUS (REST/gRPC):
  when:
    - Cần response ngay (query data)
    - Cần validate input
    - Idempotent operation
  examples:
    - GET /api/v1/courses/{id}
    - POST /api/v1/auth/login
    - POST /api/v1/orders (validate inventory)

ASYNCHRONOUS (Kafka):
  when:
    - Không cần response ngay
    - Multiple consumers cùng xử lý
    - Heavy processing
    - Event sourcing
  examples:
    - Send email sau khi user đăng ký
    - Generate learning path sau khi user đăng ký
    - Update analytics
    - Issue certificate sau khi pass exam

REAL-TIME (WebSocket):
  when:
    - Push data từ server xuống client
    - Two-way communication
    - Low latency requirement
  examples:
    - Exam timer countdown
    - Proctoring video stream
    - Live notifications
    - Real-time chat

# ❌ CẤM
- Direct DB access giữa services
- Synchronous chain calls (A → B → C → D)
- Long polling
```

### 2.2 API Communication Rules

```yaml
# Service-to-Service Communication

frontend → service:
  method: QUA API GATEWAY (bắt buộc)
  protocol: HTTPS
  auth: JWT token

service-to-service (sync):
  method: QUA API GATEWAY hoặc service discovery + load balancer
  protocol: HTTPS hoặc gRPC
  auth: Service-to-Service token (mTLS hoặc JWT với service account)
  timeout: 5 seconds max

service-to-service (async):
  method: Kafka
  protocol: TCP
  auth: SASL/SSL
  topic_naming: {service}.{aggregate}.{action}
  examples: auth.user.registered, exam.submission.graded
```

---

## 3. EVENT-DRIVEN ARCHITECTURE

### 3.1 Event Schema (BẮT BUỘC)

```json
// Event envelope
{
  "eventId": "uuid-v7",
  "eventType": "UserRegistered",
  "eventVersion": "1.0",
  "occurredAt": "2026-08-12T10:00:00Z",
  "aggregateId": "user-123",
  "aggregateType": "User",
  "correlationId": "trace-id-xxx",
  "causationId": "command-id-xxx",
  "source": "auth-service",
  "payload": {
    // Event-specific data
  },
  "metadata": {
    "userId": "user-123",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### 3.2 Event Naming Convention

```yaml
# Format: {Aggregate}.{Action}[.{Modifier}]

# Past tense (events that happened)
UserRegistered
UserLoggedIn
PasswordReset
CoursePublished
ExamStarted
ExamSubmitted
ExamGraded
CertificateIssued
PaymentCompleted
OrderShipped

# ❌ SAI
register_user
user.register
RegisterUser
USER_REGISTERED_EVENT
```

### 3.3 Event Versioning

```yaml
# When changing event schema:
# 1. Add new field (backward compatible)
# 2. OR Create new event version (UserRegisteredV2)
# 3. Old consumers continue working with old version
# 4. New consumers use new version

# Example:
UserRegistered (v1.0): { userId, email, fullName }
UserRegistered (v1.1): { userId, email, fullName, phone }  # Added field, OK
UserRegistered (v2.0): { userId, email, fullName, phone, preferences }  # Breaking, new event
```

### 3.4 Idempotency

```yaml
# Consumers PHẢI be idempotent
# Same event delivered multiple times → same result

# Idempotency strategies:
1. Idempotency key in event (eventId)
2. Deduplication table (eventId → processed)
3. Database constraints (unique key)
4. Conditional updates (version field)
```

---

## 4. DATA ARCHITECTURE

### 4.1 Database Per Service (BẮT BUỘC)

```yaml
# ✅ Mỗi service có database riêng
auth-service: ioes_auth (PostgreSQL)
content-service: ioes_content (PostgreSQL + MongoDB)
exam-suite: ioes_exam (PostgreSQL)
analytics-service: ioes_analytics (PostgreSQL + ClickHouse)
ai-suite: ioes_ai (PostgreSQL + Milvus)
blockchain-suite: ioes_blockchain (PostgreSQL)
notification-service: ioes_notification (PostgreSQL)

# ❌ CẤM
- 2 services share 1 database
- Foreign key giữa 2 databases
- Service A query trực tiếp DB của Service B
```

### 4.2 Polyglot Persistence

```yaml
# Chọn DB theo use case

PostgreSQL:
  use_for: Transactional data, ACID, relational
  examples: users, courses, exams, orders, payments

MongoDB:
  use_for: Document data, flexible schema
  examples: lessons (rich content), reviews, comments

Redis:
  use_for: Cache, session, leaderboard, rate limiting, pub/sub
  examples: exam session cache, JWT blacklist, leaderboard

ClickHouse:
  use_for: OLAP, analytics, time-series
  examples: events, metrics, dashboards

Milvus:
  use_for: Vector similarity search
  examples: course embeddings, learning path similarity

Dgraph:
  use_for: Graph database với native GraphQL API
  examples: Question Bank knowledge graph (Topic → Skill → Question → Prerequisite)
  notes: >
    Read-side store cho Question Bank (CQRS). Dùng cho full-text search,
    graph traversal, recommendation. Source-of-truth vẫn là PostgreSQL.
    Xem ADR-001.

MinIO/S3:
  use_for: Object storage
  examples: videos, images, certificates, proctoring recordings
```

### 4.3 Data Consistency

```yaml
# Strong consistency (ACID):
- Trong cùng 1 service, cùng 1 database
- Dùng database transaction
- Example: tạo user + role trong 1 transaction

# Eventual consistency (across services):
- Giữa các services
- Dùng Saga pattern hoặc Event-driven
- Example: enroll course → update analytics (eventual)
```

### 4.4 Saga Pattern (Cross-service Transaction)

```yaml
# Khi cần transaction giữa nhiều services:

# Ví dụ: User đăng ký khóa học
# 1. content-service: tạo enrollment
# 2. payment-service: charge payment
# 3. notification-service: gửi email

# Choreography Saga (dùng events):
- Step 1 → publish CourseEnrollRequested event
- Step 2 (payment) consume → charge → publish PaymentCompleted
- Step 3 (notification) consume → send email → publish NotificationSent

# Orchestration Saga (1 coordinator):
- SagaOrchestrator coordinate các steps
- Handle rollback nếu step fail
```

---

## 5. HEXAGONAL ARCHITECTURE (Per Service)

### 5.1 Layers (BẮT BUỘC)

```
service/
├── domain/              # Pure business logic
│   ├── model/           # Entities, Value Objects
│   ├── event/           # Domain events
│   └── exception/       # Domain exceptions
│
├── application/         # Use cases
│   ├── usecase/         # Use case classes
│   ├── port/            # Interfaces (input/output)
│   ├── service/         # Application services
│   └── dto/             # DTOs
│
├── infrastructure/      # Adapters
│   ├── persistence/     # Database
│   ├── kafka/           # Message queue
│   ├── cache/           # Cache
│   ├── security/        # Auth providers
│   └── external/        # Third-party APIs
│
└── interfaces/          # Inbound adapters
    ├── rest/            # REST controllers
    ├── graphql/         # GraphQL (optional)
    └── event/           # Event consumers
```

### 5.2 Dependency Rules (BẮT BUỘC)

```yaml
# Allowed dependencies:
interfaces → application → domain
infrastructure → application → domain
infrastructure → domain (chỉ để implement domain interfaces)

# ❌ Forbidden:
domain → application       # Domain không biết application
domain → infrastructure   # Domain thuần túy, không có framework
domain → interfaces       # Domain không biết HTTP/WS/Kafka
application → interfaces  # Application không biết inbound
application → infrastructure (trực tiếp)  # Phải qua port interface

# Implementation:
# Port (interface) defined in application/
# Adapter (implementation) defined in infrastructure/
```

### 5.3 Example: Login Flow

```java
// 1. Domain - Pure business logic
// domain/model/User.java
public class User {
    private final String id;
    private final String email;
    private final String passwordHash;
    private final UserStatus status;

    public boolean verifyPassword(String rawPassword, PasswordHasher hasher) {
        return hasher.matches(rawPassword, this.passwordHash);
    }

    public boolean canLogin() {
        return this.status == UserStatus.ACTIVE;
    }
}

// 2. Application - Use case + Port
// application/port/UserRepository.java
public interface UserRepository {
    Optional<User> findByEmail(String email);
    User save(User user);
}

// application/usecase/LoginUseCase.java
public class LoginUseCase {
    private final UserRepository userRepository;
    private final PasswordHasher passwordHasher;
    private final TokenService tokenService;

    public LoginUseCase(
        UserRepository userRepository,
        PasswordHasher passwordHasher,
        TokenService tokenService
    ) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
        this.tokenService = tokenService;
    }

    public Token execute(LoginCommand command) {
        // 1. Find user
        User user = userRepository.findByEmail(command.email())
            .orElseThrow(() -> new InvalidCredentialsException());

        // 2. Verify
        if (!user.verifyPassword(command.password(), passwordHasher)) {
            throw new InvalidCredentialsException();
        }

        if (!user.canLogin()) {
            throw new UserBannedException();
        }

        // 3. Generate token
        return tokenService.generateAccessToken(user.getId());
    }
}

// 3. Infrastructure - Implement Port
// infrastructure/persistence/UserRepositoryImpl.java
@Repository
public class UserRepositoryImpl implements UserRepository {
    private final JpaUserRepository jpaRepo;

    @Override
    public Optional<User> findByEmail(String email) {
        return jpaRepo.findByEmail(email).map(UserMapper::toDomain);
    }

    @Override
    public User save(User user) {
        UserEntity entity = UserMapper.toEntity(user);
        return UserMapper.toDomain(jpaRepo.save(entity));
    }
}

// 4. Interface - REST Controller
// interfaces/rest/AuthController.java
@RestController
public class AuthController {
    private final LoginUseCase loginUseCase;

    @PostMapping("/api/v1/auth/login")
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest request) {
        Token token = loginUseCase.execute(new LoginCommand(request.email(), request.password()));
        return ResponseEntity.ok(LoginResponse.from(token));
    }
}
```

---

## 6. SHARED LIBRARIES

### 6.1 Quy tắc chia sẻ code

```yaml
# Nếu code được dùng bởi ≥ 2 services → shared library
# Nếu chỉ 1 service dùng → giữ trong service đó

# Shared libraries:
libs/common-library/    # Java common (DTOs, exceptions, JWT, Kafka)
libs/common-node/       # Node.js common (filters, guards, decorators)
libs/common-python/     # Python common (schemas, OpenTelemetry)
```

### 6.2 CẤM

```yaml
# ❌ KHÔNG share:
- Business logic giữa services (mỗi service own business logic riêng)
- Entities giữa services (mỗi service define entity riêng)
- Database access code giữa services

# ✅ ĐƯỢC share:
- DTOs (chỉ data structure, không có logic)
- Exceptions (cross-cutting)
- Utilities (date, string, crypto)
- Configuration (Kafka, Redis, JWT)
- Logging infrastructure
- Tracing infrastructure
- HTTP client (Feign, RestTemplate, fetch wrapper)
```

### 6.3 Versioning

```yaml
# Shared libraries PHẢI dùng semantic versioning
# 1.0.0 → 1.0.1 (bug fix, backward compatible)
# 1.0.0 → 1.1.0 (new feature, backward compatible)
# 1.0.0 → 2.0.0 (breaking change, bump major)

# Khi update shared library:
1. Bump version
2. Update CHANGELOG
3. Test backward compatibility
4. Deploy từng service consume library
5. Monitor errors
```

---

## 7. API DESIGN RULES

### 7.1 REST API Conventions

```yaml
URL structure:
  /api/v1/{resource}
  /api/v1/{resource}/{id}
  /api/v1/{resource}/{id}/{sub-resource}
  /api/v1/users/{id}/enrollments

HTTP methods:
  GET: Read (idempotent, cacheable)
  POST: Create (non-idempotent)
  PUT: Replace (idempotent)
  PATCH: Partial update
  DELETE: Remove (idempotent)

Status codes:
  200: OK
  201: Created
  204: No Content
  400: Bad Request
  401: Unauthorized
  403: Forbidden
  404: Not Found
  409: Conflict
  422: Unprocessable Entity
  500: Internal Server Error

Response format:
  Success: { "success": true, "data": {...}, "meta": {...} }
  Error: { "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
  Paginated: { "success": true, "data": [...], "meta": { "page": 1, "total": 100 } }

# Naming:
- Resource names: plural, kebab-case (/api/v1/course-categories)
- Query params: camelCase (?pageSize=20&sortBy=createdAt)
- Header: X-Custom-Header
```

### 7.2 API Versioning

```yaml
# URL versioning (khuyến nghị)
/api/v1/users
/api/v2/users

# Khi nào bump version:
- Breaking change (required field removed, type changed)
- Response structure changed
- New auth requirement
```

### 7.3 API Documentation (BẮT BUỘC)

```yaml
# Mọi API PHẢI có OpenAPI/Swagger
# URL: /swagger-ui.html
# Mỗi endpoint PHẢI có:
- Summary
- Description
- Request schema
- Response schema (200, 400, 401, 404, 500)
- Auth required
- Rate limit
- Examples
```

---

## 8. CACHING STRATEGY

### 8.1 Cache Patterns

```yaml
Cache-Aside (Lazy loading):
  when: Read-heavy, data thay đổi ít
  example: User profile, course list
  flow:
    1. App check cache
    2. If miss → query DB → set cache → return
    3. If hit → return

Write-Through:
  when: Cần strong consistency
  example: User session
  flow:
    1. App write DB
    2. App update cache
    3. Return success

Write-Behind (Write-Back):
  when: Write-heavy, eventual consistency OK
  example: Analytics events
  flow:
    1. App write cache
    2. Async write DB

Refresh-Ahead:
  when: Predictable access pattern
  example: Daily leaderboard
  flow:
    1. Cache tự refresh trước khi expire
```

### 8.2 Cache Keys

```yaml
# Format: {service}:{resource}:{id}:{version}
user:profile:user-123:v1
course:detail:course-456:v1
exam:session:attempt-789:v1
leaderboard:global:v1

# Cache invalidation:
- TTL: auto expire
- Event-based: invalidate on update event
- Manual: clear on specific action
```

### 8.3 Caching Rules

```yaml
# ✅ Cache:
- Read-heavy data
- Expensive queries
- Data thay đổi không thường xuyên
- Public data (course list, categories)

# ❌ KHÔNG Cache:
- User-specific real-time data (notifications)
- Sensitive data (password, payment info) - cache tham chiếu thôi
- Data thay đổi mỗi giây (exam live score)

# Cache size:
- Limit per service (e.g., 100MB)
- LRU eviction
- Monitor hit rate (target > 80%)
```

---

## 9. SECURITY ARCHITECTURE

### 9.1 Authentication

```yaml
# JWT-based (BẮT BUỘC cho IOES)

Access Token:
  - TTL: 15 minutes
  - Storage: HttpOnly cookie hoặc Authorization header
  - Algorithm: RS256 (asymmetric)
  - Claims: userId, email, roles, permissions, sessionId

Refresh Token:
  - TTL: 7 days
  - Storage: HttpOnly cookie only
  - Rotation: new refresh token mỗi lần refresh
  - Revocation: blacklist trong Redis

MFA (Multi-Factor):
  - Bắt buộc cho admin, instructor
  - Optional cho student
  - TOTP (Google Authenticator) hoặc SMS

OAuth2:
  - Google, GitHub, Microsoft
  - Standard flow
  - Link OAuth account với user
```

### 9.2 Authorization (RBAC)

```yaml
Roles:
  - SUPER_ADMIN: full access
  - ADMIN: manage users, courses, system
  - INSTRUCTOR: create courses, exams, grade
  - STUDENT: take courses, exams
  - GUEST: view public content

# Role hierarchy:
SUPER_ADMIN → ADMIN → INSTRUCTOR → STUDENT → GUEST

# Permission check:
@PreAuthorize("hasRole('INSTRUCTOR')")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
@PreAuthorize("hasPermission(#examId, 'exam:edit')")

# Resource-level (ABAC):
- Owner check (user chỉ edit được course của mình)
- Tenant check (multi-tenant)
- Time-based (chỉ access trong exam window)
```

### 9.3 Defense in Depth

```yaml
Layers (BẮT BUỘC):
1. WAF (Web Application Firewall)
2. API Gateway (rate limit, auth)
3. Service-level (auth, authorization)
4. Database (row-level security, encryption)
5. Audit log (track all sensitive actions)

# Network:
- mTLS giữa services
- Network policy (chỉ allow needed traffic)
- VPC isolation
- Bastion host cho admin access
```

---

## 10. OBSERVABILITY ARCHITECTURE

### 10.1 Three Pillars

```yaml
1. METRICS (Prometheus):
   - RED metrics: Rate, Errors, Duration
   - USE metrics: Utilization, Saturation, Errors
   - Business metrics: exam submissions, course enrollments
   - Format: histogram, counter, gauge

2. LOGS (ELK/Loki):
   - Structured JSON logs
   - Correlation ID (trace)
   - Log levels: trace, debug, info, warn, error
   - Centralized aggregation
   - Retention: 30 days

3. TRACES (Jaeger):
   - Distributed tracing
   - OpenTelemetry SDK
   - Trace context propagation (W3C)
   - Sample rate: 10% (production), 100% (staging)
```

### 10.2 Service Identification

```yaml
# Mỗi service PHẢI có:
service.name: {service-name}
service.version: {version}
service.environment: {dev|staging|prod}
service.team: ioes-{team-name}

# Resource attributes:
- service.name
- service.version
- deployment.environment
- host.name
- container.id
```

---

## 11. CẤM TUYỆT ĐỐI

```yaml
# Architectural violations:

❌ Service gọi trực tiếp DB của service khác
❌ Shared database giữa 2 services
❌ Foreign key constraints giữa 2 databases
❌ Tight coupling giữa services
❌ Service gọi REST trực tiếp service khác (phải qua Gateway)
❌ Business logic trong Controller (chỉ ở Service/UseCase layer)
❌ Framework dependencies trong Domain layer
❌ Shared entities giữa services
❌ Hardcoded URLs, secrets
❌ Circular dependencies giữa services
❌ Chatty communication (nhiều calls liên tiếp)
❌ 2 services deploy cùng nhau (phải independent)
```

---

## 📚 REFERENCE

- [Microservices Patterns (Chris Richardson)](https://microservices.io/patterns/index.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/)
- [12 Factor App](https://12factor.net/)
- [Project Rules](../01-business/PROJECT_RULES.md)

---

**Version:** 1.0
**Last updated:** 12/08/2026
