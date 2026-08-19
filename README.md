# 🎓 IOES — Intelligent Online Examination System

> **Hệ thống thi trực tuyến thông minh tích hợp AI, Computer Vision, và Blockchain**

Nền tảng thi trực tuyến microservice cho các tổ chức giáo dục, gồm 10 backend services (Java / Node.js / Python), 1 frontend SPA (React), 3 shared libraries, và Kubernetes Helm + Terraform cho triển khai.

---

## 📑 Mục lục

1. [Cách chạy services](#1-cách-chạy-services) — chạy local, dev, production
2. [Cách triển khai logic](#2-cách-triển-khai-logic) — Hexagonal Architecture, coding flow
3. [Kết nối & giao tiếp giữa services](#3-kết-nối--giao-tiếp-giữa-services) — REST, Kafka, WebSocket, JWT
4. [Phụ lục](#4-phụ-lục) — ports, topics, stack, tham chiếu

---

## 1. Cách chạy services

### 1.1 Yêu cầu hệ thống

| Tool | Phiên bản | Cài đặt |
|---|---|---|
| Node.js | ≥ 20.x | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 9.x | `npm install -g pnpm` |
| Java | 17.x (Temurin) | [adoptium.net](https://adoptium.net) |
| Python | 3.11.x | [pyenv](https://github.com/pyenv/pyenv) |
| Docker | ≥ 24.x + Compose v2 | [docker.com](https://docker.com) |
| Maven | ≥ 3.9.x | (mvnw wrapper đi kèm từng service) |
| Helm | ≥ 3.14 | [helm.sh](https://helm.sh) |
| Terraform | ≥ 1.5 | [terraform.io](https://terraform.io) |

### 1.2 Chạy lần đầu (5 phút)

```bash
# 1. Clone & copy env
git clone <repo-url>
cd AiProject
cp .env.example .env

# 2. Khởi động infrastructure (Postgres, Redis, MongoDB, Kafka, MinIO, Prometheus, Grafana, Jaeger)
make setup-dev
# Tương đương: cd infrastructure && docker-compose up -d

# 3. Đợi Postgres + MongoDB ready, sau đó tạo per-service databases + users
make db-init
# Tương đương: docker exec -i ioes-postgres psql -U ioes -d postgres \
#                          < infrastructure/init-scripts/01-init-databases.sql

# 4. Chạy migrations cho từng service (Flyway/JPA tự chạy khi service start)
make migrate

# 5. Khởi động services theo thứ tự (mỗi service 1 terminal)
make dev-java    # discovery-service → config-server → api-gateway → auth-service → notification-service
make dev-node    # exam-suite (Node.js)
make dev-python  # ai-suite/api-gateway + ai-suite/ml-worker (Python)
make dev-frontend  # apps/web (React + Vite)
```

> **Discovery & Config phải chạy trước tiên** — các service khác đăng ký với Eureka và load config từ Spring Cloud Config.

> ⚠️ **Lưu ý khi chạy trên Windows:**
> Makefile dùng cú pháp GNU Make + Unix shell (`sleep`, `/dev/null`, `grep`, `awk`...) nên **không chạy trực tiếp trên PowerShell/CMD** được.
>
> **Cách 1 — Khuyến nghị: Dùng Git Bash** (đơn giản nhất)
> 1. Cài [Git for Windows](https://git-scm.com/download/win) — đã bao gồm `make`
> 2. Cài thêm `make` nếu Git Bash chưa có: `choco install make -y` (chạy PowerShell **Run as Administrator**)
> 3. Mở **Git Bash** rồi chạy:
>    ```bash
>    cd /d/NCKH/ioes-platform-2026-
>    make setup-dev
>    make db-init
>    make dev-java
>    ```
>
> **Cách 2 — WSL** (ổn định nhất)
> ```powershell
> wsl
> cd /mnt/d/NCKH/ioes-platform-2026-
> make setup-dev
> ```
>
> **Cách 3 — Chạy trực tiếp Docker Compose** (bỏ qua `make`)
> ```powershell
> cd infrastructure
> docker compose up -d
> ```
>
> Nếu `choco install make` bị lỗi **"Unable to obtain lock file"** hoặc **"Access to the path 'C:\ProgramData\chocolatey\lib-bad' is denied"**, mở PowerShell **Run as Administrator** rồi xóa lock cũ:
> ```powershell
> Remove-Item "C:\ProgramData\chocolatey\lib\*lock*" -Force -ErrorAction SilentlyContinue
> choco install make -y --force
> ```

### 1.3 Stack infrastructure (Docker Compose)

| Service | Port | Mục đích |
|---|---|---|
| PostgreSQL 15 | 5432 | 10 DBs riêng (1 per service) |
| Redis 7 | 6379 | cache, session, leaderboard, rate limit |
| MongoDB 7 | 27017 | document storage (replica set `rs0`, auth required) |
| Kafka 3.7 | 9092 | async event streaming |
| MinIO | 9000/9001 | S3-compatible object storage |
| Milvus | 19530 | vector DB (cho AI embeddings) |
| Prometheus | 9090 | metrics |
| Grafana | 3001 | dashboards (admin/admin) |
| Jaeger | 16686 | distributed tracing |
| Kafka UI | 8081 | topic/consumer visualization |
| PgAdmin | 5050 | Postgres UI |
| Mongo Express | 8083 | MongoDB UI |
| MailHog | 1025/8025 | email testing (SMTP + web) |

Khởi động chỉ infrastructure (không chạy app):

```bash
cd infrastructure
docker-compose up -d postgres redis mongodb kafka minio prometheus grafana jaeger
```

### 1.4 Build Java services

**Build all Java modules** (from project root, includes `common-library`):

```bash
cd /home/minhdao/projects/team/AiProject
mvn install -DskipTests
```

**Build a specific service + its dependencies:**

```bash
mvn install -pl services/api-gateway -am -DskipTests
```

Flags: `-pl` = project list, `-am` = also make (build dependencies first), `-DskipTests` = skip tests.

### 1.5 Chạy từng service độc lập

> **Lưu ý:** Trước khi chạy bất kỳ service nào, phải build toàn bộ modules trước:
> ```bash
> mvn install -DskipTests   # chạy từ project root
> ```

#### Java services (Spring Boot 3 + Spring Cloud)

```bash
# Bắt buộc: discovery-service + config-server phải chạy trước
cd services/discovery-service && ./mvnw spring-boot:run
cd services/config-server && ./mvnw spring-boot:run

# Sau đó chạy các service khác
cd services/api-gateway && ./mvnw spring-boot:run       # port 8080
cd services/auth-service && ./mvnw spring-boot:run     # port 9000
cd services/content-service && ./mvnw spring-boot:run  # port 9001
cd services/notification-service && ./mvnw spring-boot:run  # port 9009
```

Mỗi service tự động:
- Đăng ký với Eureka (`@EnableDiscoveryClient`)
- Load config từ `config-server` (Spring Cloud Config)
- Apply Flyway migrations (`db/migration/V1__init_schema.sql`)
- Subscribe Kafka topics nếu có `@KafkaListener`

#### Node.js services (NestJS 10)

```bash
cd services/exam-suite     && pnpm install && pnpm start:dev   # port 9005
cd services/blockchain-suite && pnpm install && pnpm start:dev # port 9200
```

#### Python services (FastAPI)

```bash
cd services/ai-suite/api-gateway && pip install -e . && uvicorn main:app --reload  # port 9100
cd services/ai-suite/ml-worker   && pip install -e . && uvicorn main:app --reload  # port 9101
```

#### Frontend (React 18 + Vite)

```bash
cd apps/web
pnpm install
pnpm dev    # http://localhost:3000
```

Frontend proxy qua `http://localhost:8080` (API Gateway) — xem `apps/web/vite.config.ts`.

### 1.6 Chạy production-style (Kubernetes)

```bash
# 1. Cài helm (nếu chưa có)
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# 2. Validate toàn bộ Helm charts
make helm-lint

# 3. Render templates ra YAML
make helm-template

# 4. Khởi động dependencies cho các chart
make helm-deps

# 5. Dry-run install
make helm-install-local

# 6. Cấu hình infrastructure cloud (EKS)
make tf-init    TF_ENV=dev
make tf-plan    TF_ENV=dev
make tf-apply   TF_ENV=dev
```

### 1.7 Verify mọi thứ OK

```bash
# Health check tổng
make health-check

# Kiểm tra từng service
curl http://localhost:8080/actuator/health    # API Gateway
curl http://localhost:9000/actuator/health    # Auth Service
curl http://localhost:9999/                   # Eureka dashboard
curl http://localhost:8888/auth-service/local # Spring Cloud Config

# Test login qua Gateway
curl http://localhost:8080/api/auth/register -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ioes.com","password":"Password123!","fullName":"Test User"}'
```

### 1.8 Common commands

```bash
# Docker
make docker-up              # Start containers
make docker-down            # Stop containers
make docker-logs            # Tail logs
make docker-clean           # Destroy volumes + containers

# Database
make db-init                # Create per-service DBs
make migrate                # Run migrations
make db-reset               # Reset all data
make db-console             # Open psql

# Test
make test                   # All tests
make test-unit              # Unit only
make test-e2e               # Playwright E2E
make test-load              # k6 load tests

# Build
make build                  # Build all artifacts
make docker-build-all       # Build Docker images
```

---

## 2. Cách triển khai logic

### 2.1 Hexagonal Architecture (BẮT BUỘC cho Java services)

Mỗi Java service theo cấu trúc Ports & Adapters — domain layer thuần túy, không phụ thuộc framework.

```
service/
├── domain/                          # Pure business logic (no framework)
│   ├── model/                       # Entities, Value Objects
│   │   ├── User.java
│   │   ├── UserRole.java
│   │   └── UserStatus.java
│   ├── port/
│   │   ├── in/                      # Input ports (use case interfaces)
│   │   │   └── AuthUseCase.java
│   │   └── out/                     # Output ports (repository interfaces)
│   │       └── UserRepositoryPort.java
│   └── service/                     # Use case implementations
│       └── AuthService.java
│
├── application/                     # Orchestration
│   ├── usecase/                     # Use case classes
│   └── dto/                         # Internal DTOs
│
├── infrastructure/                  # Adapters (impl ports)
│   ├── persistence/
│   │   ├── entity/                  # UserEntity (JPA)
│   │   ├── repository/              # UserJpaRepository
│   │   └── adapter/                 # UserRepositoryAdapter implements port
│   ├── kafka/                       # Kafka producers
│   ├── cache/                       # Redis adapters
│   └── security/                    # JWT providers
│
├── interfaces/                      # Inbound adapters
│   ├── rest/
│   │   ├── controller/              # AuthController
│   │   └── dto/                     # Request/Response DTOs
│   └── event/                       # Kafka listeners (@KafkaListener)
│
└── config/                          # Spring config (@Configuration)
```

**Dependency rules:**
```
interfaces → application → domain
infrastructure → application → domain
```

**CẤM:**
- `domain → infrastructure` (domain phải thuần túy, không biết JPA/HTTP/Kafka)
- `application → interfaces` (application không biết inbound)
- Business logic trong Controller

### 2.2 Flow triển khai 1 use case (ví dụ: Login)

**Bước 1: Định nghĩa input port (use case interface)`**

```java
// domain/port/in/AuthUseCase.java
public interface AuthUseCase {
    User register(RegisterCommand command);
    LoginResult login(LoginCommand command);
    LoginResult refreshToken(String refreshToken);
    void logout(UUID userId);
    User getCurrentUser(UUID userId);
    void changePassword(UUID userId, String oldPassword, String newPassword);

    record RegisterCommand(String email, String password, String fullName) {}
    record LoginCommand(String email, String password, String ipAddress) {}
    record LoginResult(User user, String accessToken, String refreshToken, long expiresIn) {}
}
```

**Bước 2: Implement use case (business logic)**

```java
// domain/service/AuthService.java
@Service
@RequiredArgsConstructor
public class AuthService implements AuthUseCase {
    private final UserRepositoryPort userRepositoryPort;
    private final JwtTokenProvider jwtTokenProvider;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    public LoginResult login(LoginCommand command) {
        User user = userRepositoryPort.findByEmail(command.email().toLowerCase().trim())
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));

        if (!user.isActive()) throw ApiException.forbidden("Account is not active");
        if (user.isLocked())  throw ApiException.forbidden("Account is temporarily locked");

        if (!passwordEncoder.matches(command.password(), user.getPasswordHash())) {
            user.recordFailedLogin(5);
            userRepositoryPort.save(user);
            throw ApiException.unauthorized("Invalid email or password");
        }

        user.recordSuccessfulLogin(command.ipAddress());
        userRepositoryPort.save(user);

        UserPrincipal principal = UserPrincipal.builder()
                .userId(user.getId()).email(user.getEmail())
                .role(user.getRole().name()).fullName(user.getFullName())
                .build();

        String accessToken = jwtTokenProvider.generateAccessToken(principal);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        return new LoginResult(user, accessToken, refreshToken, 900L);
    }
}
```

**Bước 3: Implement output port (repository)**

```java
// infrastructure/persistence/adapter/UserRepositoryAdapter.java
@Component
@RequiredArgsConstructor
public class UserRepositoryAdapter implements UserRepositoryPort {
    private final UserJpaRepository jpaRepo;

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
```

**Bước 4: REST controller (inbound)**

```java
// interfaces/rest/controller/AuthController.java
@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthUseCase authUseCase;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthUseCase.LoginCommand command = new AuthUseCase.LoginCommand(
                request.email(), request.password(), getClientIp(httpRequest));

        AuthUseCase.LoginResult result = authUseCase.login(command);

        return ResponseEntity.ok(ApiResponse.success("Login successful",
                new AuthResponse(toUserResponse(result.user()), result.accessToken(),
                                 result.refreshToken(), "Bearer", result.expiresIn())));
    }
}
```

### 2.3 Template áp dụng cho service mới

```bash
# 1. Copy skeleton từ auth-service
cp -r services/auth-service services/<new-service>
cd services/<new-service>

# 2. Đổi tên package + class trong src/main/java/com/ioes/<new-service>/
# 3. Đổi tên trong pom.xml (artifactId, name)
# 4. Cập nhật application.yml (port, datasource, kafka topic)
# 5. Đăng ký trong docker-compose.yml (volumes, depends_on)
# 6. Tạo Helm values trong infrastructure/helm/charts/<new-service>/values.yaml
# 7. Thêm vào ioes-platform/Chart.yaml dependencies
```

### 2.4 Triển khai event consumer (Kafka)

```java
// interfaces/event/NotificationEventListener.java
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {
    private final NotificationUseCase notificationUseCase;

    @KafkaListener(topics = "auth.user.registered", groupId = "notification-service")
    public void onUserRegistered(Map<String, Object> event) {
        String email = (String) event.get("email");
        String fullName = (String) event.get("fullName");

        notificationUseCase.sendTemplated(new NotificationUseCase.TemplatedCommand(
                null, NotificationType.EMAIL, email, "welcome",
                Map.of("fullName", fullName != null ? fullName : "User",
                       "appName", "IOES Platform")));
    }
}
```

### 2.5 Triển khai messaging publisher

```java
// infrastructure/kafka/UserEventPublisher.java
@Component
@RequiredArgsConstructor
public class UserEventPublisher {
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishUserRegistered(User user) {
        Map<String, Object> payload = Map.of(
            "eventId", UUID.randomUUID().toString(),
            "eventType", "UserRegistered",
            "occurredAt", Instant.now().toString(),
            "userId", user.getId().toString(),
            "email", user.getEmail(),
            "fullName", user.getFullName(),
            "role", user.getRole().name()
        );
        kafkaTemplate.send("auth.user.registered", user.getId().toString(), payload);
    }
}
```

### 2.6 Triển khai REST API Gateway routes

Trong `services/api-gateway/src/main/resources/application.yml`:

```yaml
spring.cloud.gateway.routes:
  - id: auth-service
    uri: lb://auth-service          # lb:// = load balance từ Eureka
    predicates:
      - Path=/api/auth/**
    filters:
      - StripPrefix=2                  # /api/auth/login → /login

  - id: content-service
    uri: lb://content-service
    predicates:
      - Path=/api/content/**,/api/courses/**,/api/lessons/**
    filters:
      - StripPrefix=2
  # ... các route khác
```

### 2.7 Coding rules áp dụng

| Quy tắc | Chi tiết |
|---|---|
| Branch | `feature/PROJ-123-short-desc` |
| Commit | `feat(auth): add Google OAuth2 login` (Conventional Commits) |
| Package | Java `com.ioes.<service>`, Node `<service>/src/modules`, Python `<service_module>` |
| Logging | SLF4J (Java), NestJS Logger (Node), structlog (Python) — **không `console.log`/`System.out.println`** |
| Magic numbers | đặt thành `MAX_RETRIES = 3` constants |
| Secrets | KHÔNG hardcode URL/credentials — load từ `application.yml` → env vars → K8s Secret |
| Coverage | ≥ 80% (≥ 95% cho auth, payment, grading logic) |
| Tests | `should_<expected>_When_<condition>` naming convention |

---

## 3. Kết nối & giao tiếp giữa services

### 3.1 Communication patterns

| Pattern | Khi nào dùng | Công cụ |
|---|---|---|
| **REST qua Gateway** | Query data cần ngay, validate input, idempotent | Spring Cloud Gateway (`lb://service-name`) |
| **Kafka event** | Async, multiple consumers, audit, eventual consistency | `KafkaTemplate` (produce) + `@KafkaListener` (consume) |
| **WebSocket** | Real-time push (exam live, proctoring alerts) | uWebSockets.js (Node.js) |
| **gRPC** | High-perf internal RPC (planned) | Protocol Buffers |
| **❌ Sync chain** | KHÔNG BAO GIỜ (A → B → C → D) | — |
| **❌ Direct REST** | Service không gọi REST sang service khác (phải qua Gateway) | — |

### 3.2 Luồng tổng quan

```
┌──────────┐
│ Frontend │  React SPA (port 3000)
└────┬─────┘
     │ HTTPS
     ▼
┌──────────────┐
│ API Gateway  │  Spring Cloud Gateway (Java, port 8080)
│              │  - JWT validation (JwtAuthenticationFilter)
│              │  - Inject X-User-* headers
│              │  - Circuit breaker (Resilience4j)
│              │  - Rate limit (Redis)
│              │  - StripPrefix routing
└────┬─────────┘
     │ lb://service-name (via Eureka)
     │
     ├──► auth-service (9000)         — JWT issuance, OAuth2, RBAC
     ├──► content-service (9001)      — Courses, lessons, MongoDB
     ├──► analytics-service (9004)    — Dashboards, KPIs, MongoDB
     ├──► exam-suite (9005)           — Node.js NestJS, WebSocket
     ├──► notification-service (9009) — Email/SMS via Thymeleaf
     ├──► ai-suite-api (9100)         — Polyglot, learning path
     ├──► ai-suite-ml (9101)          — Python ML inference
     └──► blockchain-suite (9200)     — Polygon + IPFS

     ▼
┌──────────────┐
│ Apache Kafka │  Async event streaming
│ (port 9092)  │
└──────────────┘
     ▲              │
     │              ▼
  Publishers   Consumers (parallel)

Cơ sở dữ liệu:
- PostgreSQL: 1 schema per service (ioes_auth, ioes_content, ...)
- MongoDB: replica set rs0, per-service user (ioes_content_user, ioes_analytics_user)
- Redis: shared cache, session, rate limit
- MinIO: media, certificates, proctoring recordings
- Milvus: AI embeddings
```

### 3.3 JWT propagation (cách Gateway xác thực cho cả hệ thống)

```
Client                    API Gateway                       auth-service
  │                            │                                 │
  │  POST /api/auth/login      │                                 │
  ├───────────────────────────►│                                 │
  │                            │  POST /auth/login              │
  │                            ├────────────────────────────────►│
  │                            │                                 │
  │                            │  { accessToken, refreshToken } │
  │                            │◄────────────────────────────────┤
  │  { accessToken, ... }      │                                 │
  │◄───────────────────────────┤                                 │
  │                            │                                 │
  │  GET /api/content/courses  │                                 │
  │  Authorization: Bearer ... │                                 │
  ├───────────────────────────►│                                 │
  │                            │  JwtAuthenticationFilter:      │
  │                            │   1. Validate token (HS256)    │
  │                            │   2. Extract claims             │
  │                            │   3. Inject headers:           │
  │                            │      X-User-Id                 │
  │                            │      X-User-Email               │
  │                            │      X-User-Role                │
  │                            │      X-User-Name                │
  │                            │  GET /content/courses          │
  │                            ├────────────────────────────────►│
  │                            │   with X-User-* headers        │
  │                            │                                 │
  │                            │  200 OK { courses: [...] }     │
  │                            │◄────────────────────────────────┤
  │  200 OK { courses: [...] } │                                 │
  │◄───────────────────────────┤                                 │
```

Implementation: `services/api-gateway/src/main/java/com/ioes/gateway/filter/JwtAuthenticationFilter.java`

Public paths (không cần JWT):
- `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`
- `/api/auth/oauth2/*`, `/api/auth/verify-email`
- `/api/public/*`

### 3.4 Kafka topics & event schema

Topics được auto-declare khi service start (xem `libs/common-library/.../KafkaTopicConfig.java`):

| Topic | Partitions | Producer | Consumers |
|---|---|---|---|
| `auth.user.registered` | 3 | auth-service | notification-service, content-service, analytics-service |
| `auth.user.logged_in` | 3 | auth-service | analytics-service |
| `content.course.published` | 3 | content-service | ai-suite, analytics-service |
| `exam.submission.submitted` | 3 | exam-suite | notification-service, analytics-service |
| `exam.submission.graded` | 3 | exam-suite | notification-service, blockchain-suite, analytics-service |
| `notification.requested` | 3 | bất kỳ service | notification-service |
| `blockchain.certificate.issued` | 3 | blockchain-suite | notification-service, analytics-service |

**Event envelope (BẮT BUỘC):**

```json
{
  "eventId": "uuid-v7",
  "eventType": "UserRegistered",
  "eventVersion": "1.0",
  "occurredAt": "2026-08-12T10:00:00Z",
  "aggregateId": "user-123",
  "aggregateType": "User",
  "correlationId": "trace-id-xxx",
  "source": "auth-service",
  "payload": {
    "userId": "uuid",
    "email": "user@example.com",
    "fullName": "Nguyen Van A",
    "role": "STUDENT"
  }
}
```

Ví dụ event payload thực tế:

```json
// auth.user.registered
{
  "eventId": "9b0c7e1a-...",
  "eventType": "UserRegistered",
  "payload": {
    "userId": "uuid",
    "email": "user@ioes.com",
    "fullName": "Nguyen Van A",
    "role": "STUDENT"
  }
}

// exam.submission.graded
{
  "eventId": "...",
  "eventType": "ExamGraded",
  "payload": {
    "submissionId": "uuid",
    "userId": "uuid",
    "examId": "uuid",
    "email": "user@ioes.com",
    "examTitle": "Mid-term Math 101",
    "score": 85.5,
    "passed": true
  }
}
```

### 3.5 Service-to-service flow chi tiết

#### Flow 1: User đăng ký (1 sync + 1 event)

```
1. Client POST /api/auth/register
   └─► api-gateway (no auth required)
       └─► auth-service: register(RegisterCommand)
           ├─► userRepositoryPort.save(user)       # Postgres ioes_auth
           └─► UserEventPublisher.publishUserRegistered(...)
               └─► kafkaTemplate.send("auth.user.registered", ...)
                   📤

2. Nhiều consumers song song consume "auth.user.registered":
   ├─► notification-service: send welcome email (TemplatedCommand(template="welcome"))
   ├─► content-service: pre-create user profile document
   └─► analytics-service: write user_registered event
```

#### Flow 2: User làm bài thi (sync + WebSocket + 1 event)

```
1. Client connect ws://localhost:8080/api/exam/ws/attempt/{attemptId}
   └─► exam-suite (WebSocket via uWebSockets.js, port 9005)
       Redis pub/sub để broadcast giữa các node

2. User submit đáp án
   └─► exam-suite: POST /api/exam/attempts/{id}/submit
       └─► Lưu submission vào Postgres ioes_exam
       └─► kafkaTemplate.send("exam.submission.submitted", ...)
           📤

3. Background grading service consume "exam.submission.submitted"
   └─► Chấm điểm (auto-grading: MCQ + coding + AI essay)
       └─► kafkaTemplate.send("exam.submission.graded", ...)
           📤

4. Nhiều consumers song song consume "exam.submission.graded":
   ├─► notification-service: send email "exam-passed" hoặc "exam-failed"
   ├─► blockchain-suite: chuẩn bị issue certificate (nếu passed)
   └─► analytics-service: update stats
```

#### Flow 3: Blockchain issue certificate (chained events)

```
1. exam-suite → "exam.submission.graded" (passed=true)
2. (chờ manual approve hoặc auto) → content-service: bấm "Issue Certificate"
   └─► blockchain-suite: POST /api/certificates
       ├─► Upload metadata to IPFS
       └─► Mint NFT trên Polygon
       └─► kafkaTemplate.send("blockchain.certificate.issued", ...)
           📤

3. notification-service: send "Your certificate is ready" email
   analytics-service: update certificate stats
```

### 3.6 Idempotency (BẮT BUỘC)

Kafka đảm bảo **at-least-once** delivery. Consumers PHẢI handle duplicate events:

```java
@KafkaListener(topics = "exam.submission.graded", groupId = "notification-service")
public void onExamGraded(Map<String, Object> event) {
    String eventId = (String) event.get("eventId");

    // Idempotency check: đã xử lý eventId này chưa?
    if (processedEventRepository.existsById(eventId)) {
        log.info("Event {} already processed, skipping", eventId);
        return;
    }

    // ... business logic ...

    processedEventRepository.save(new ProcessedEvent(eventId, Instant.now()));
}
```

Các strategy idempotency:
1. **Idempotency key** (eventId) — uniqueness constraint
2. **Deduplication table** — track processed events
3. **DB constraints** — unique key trên bảng nghiệp vụ
4. **Conditional updates** — version field (optimistic locking)

### 3.7 Saga pattern (cross-service transactions)

Khi cần ACID giữa nhiều services, dùng **Choreography Saga** (event-driven):

```
Example: User đăng ký khóa học

content-service:
  1. Create enrollment (DB transaction)
  2. Publish "course.enroll.requested" event

payment-service (consume):
  3. Charge card
  4. Publish "payment.completed" or "payment.failed"

content-service (consume payment.completed):
  5. Update enrollment status → ACTIVE

notification-service (consume payment.completed):
  6. Send "Enrollment successful" email

Nếu step 4 fail:
  - Publish "payment.failed" → content-service rollback enrollment → CANCELLED
```

### 3.8 Multi-database isolation

Mỗi service có database riêng — KHÔNG BAO GIỜ query DB của service khác:

| Service | Postgres schema | MongoDB database | Cache namespace |
|---|---|---|---|
| auth-service | `ioes_auth` | — | `ioes:auth:*` |
| content-service | `ioes_content` | `ioes_content` (user: `ioes_content_user`) | `ioes:content:*` |
| analytics-service | `ioes_analytics` | `ioes_analytics` (user: `ioes_analytics_user`) | `ioes:analytics:*` |
| exam-suite | `ioes_exam` | — | `ioes:exam:*` |
| notification-service | `ioes_notification` | — | `ioes:notification:*` |
| ai-suite | `ioes_ai` | — (`ioes_milvus`) | `ioes:ai:*` |
| blockchain-suite | `ioes_blockchain` | — | `ioes:blockchain:*` |

**CẤM:**
- Foreign key constraints giữa 2 databases
- Service A query trực tiếp DB của Service B
- Shared entities giữa services (mỗi service define entity riêng)

Cross-service data → query qua REST (qua Gateway) hoặc publish event với payload đầy đủ.

### 3.9 Triển khai service-to-service call (qua Gateway)

Khi Java service cần data từ service khác, dùng **WebClient** + Eureka (không gọi trực tiếp):

```java
@Component
public class AuthServiceClient {
    private final WebClient webClient;

    public AuthServiceClient(WebClient.Builder builder) {
        this.webClient = builder.baseUrl("http://api-gateway:8080").build();
    }

    public UserResponse getUser(String userId, String authToken) {
        return webClient.get()
                .uri("/api/auth/users/{id}", userId)
                .header("Authorization", "Bearer " + authToken)
                .retrieve()
                .bodyToMono(UserResponse.class)
                .block();
    }
}
```

Hoặc dùng **OpenFeign** (Spring Cloud):

```java
@FeignClient(name = "auth-service", path = "/auth")
public interface AuthServiceClient {
    @GetMapping("/users/{id}")
    UserResponse getUser(@PathVariable String id);
}
```

### 3.10 WebSocket endpoints (real-time)

| Endpoint | Service | Use case |
|---|---|---|
| `ws://localhost:8080/api/exam/attempts/{id}` | exam-suite | Live exam session (questions, timer, autosave) |
| `ws://localhost:8080/api/proctoring/sessions/{id}` | exam-suite | Proctoring events (face detection, gaze) |

uWebSockets.js + Redis pub/sub để scale horizontally — nhiều node exam-suite chia sẻ session state.

---

## 4. Phụ lục

### 4.1 Service port mapping

| Service | Port | Language | DB |
|---|---|---|---|
| Frontend (Vite dev) | 3000 | TypeScript | — |
| API Gateway | 8080 | Java 17 | Redis (rate limit) |
| Auth Service | 9000 | Java 17 | PostgreSQL `ioes_auth` |
| Content Service | 9001 | Java 17 | PostgreSQL `ioes_content` + MongoDB |
| Analytics Service | 9004 | Java 17 | PostgreSQL `ioes_analytics` + MongoDB |
| Exam Suite | 9005 | Node.js 20 | PostgreSQL `ioes_exam` |
| Notification Service | 9009 | Java 17 | PostgreSQL `ioes_notification` |
| AI Suite API | 9100 | Node.js 20 | PostgreSQL `ioes_ai` |
| AI Suite ML Worker | 9101 | Python 3.11 | Milvus (vectors) |
| AI Suite OCR | 9102 | Python 3.11 | — |
| AI Suite Speech | 9103 | Python 3.11 | — |
| Blockchain Suite | 9200 | Node.js 20 | PostgreSQL `ioes_blockchain` |
| Discovery Service (Eureka) | 9999 | Java 17 | — |
| Config Server | 8888 | Java 17 | — |
| Prometheus | 9090 | — | — |
| Grafana | 3001 | — | — |
| Jaeger | 16686 | — | — |
| Kafka UI | 8081 | — | — |
| MinIO Console | 9001 | — | — |
| PgAdmin | 5050 | — | — |
| Mongo Express | 8083 | — | — |
| MailHog (SMTP) | 1025 | — | — |
| MailHog (Web) | 8025 | — | — |

### 4.2 Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + React Query + Zustand |
| Backend Java | Java 17 + Spring Boot 3 + Spring Cloud (Gateway, Eureka, Config, OpenFeign) + WebFlux |
| Backend Node.js | Node.js 20 + NestJS 10 + uWebSockets.js + TypeORM + KafkaJS |
| Backend Python | Python 3.11 + FastAPI + PyTorch + vLLM + TensorRT |
| Database | PostgreSQL 15 + MongoDB 7 + Redis 7 (cluster) + ClickHouse 24 + Milvus 2.4 |
| Message Queue | Apache Kafka 3.7 (Confluent) + Zookeeper |
| Object Storage | MinIO (S3-compatible) |
| Auth | JWT (HS256) + OAuth2 (Google, GitHub, Microsoft) + RBAC |
| Cache | Redis (LRU eviction, persistence) |
| Container | Docker 24 + Kubernetes 1.30 + Helm 3.14 |
| GitOps | ArgoCD 2.11 |
| IaC | Terraform 1.5+ (AWS: EKS, RDS, MSK, ElastiCache, S3, CloudFront) |
| Observability | Prometheus 2.51 + Grafana 11 + Jaeger 1.58 + Loki/ELK |
| CI/CD | GitHub Actions (CI: build + test + lint; CD: rollout qua ArgoCD) |
| Testing | JUnit 5 + Mockito (Java), Jest + Supertest (Node), pytest (Python), Playwright (E2E), k6 (load) |

### 4.3 Cấu trúc thư mục

```
AiProject/
├── apps/
│   └── web/                        # Frontend React SPA
├── services/                       # 10 backend microservices
│   ├── api-gateway/                # Java - Spring Cloud Gateway
│   ├── discovery-service/          # Java - Eureka
│   ├── config-server/              # Java - Spring Cloud Config
│   ├── auth-service/               # Java - JWT + OAuth2
│   ├── content-service/            # Java - Courses + MongoDB
│   ├── analytics-service/          # Java - Dashboards + MongoDB
│   ├── notification-service/       # Java - Email/SMS/Push
│   ├── exam-suite/                 # Node.js - Real-time exam + WebSocket
│   ├── ai-suite/                   # Polyglot (Node.js + Python)
│   │   ├── api-gateway/
│   │   ├── ml-worker/
│   │   ├── ocr-service/
│   │   └── speech-service/
│   └── blockchain-suite/           # Node.js - Polygon + IPFS
├── libs/                           # Shared libraries
│   ├── common-library/             # Java (DTOs, exceptions, JWT, Kafka)
│   ├── common-node/                # Node.js (filters, guards, decorators)
│   └── common-python/              # Python (schemas, OpenTelemetry)
├── packages/                       # Frontend shared packages
│   ├── ui-kit/                     # UI components
│   ├── api-client/                 # Generated API client
│   ├── shared-types/               # Shared TS types
│   ├── eslint-config/
│   ├── tsconfig/
│   └── utils/
├── infrastructure/                 # IaC & ops
│   ├── docker-compose.yml          # Local dev stack
│   ├── mongo-init/                 # MongoDB replica set + users
│   ├── init-scripts/               # Postgres init
│   ├── terraform/                  # Cloud provisioning (AWS)
│   ├── helm/                       # K8s Helm charts
│   │   ├── templates/              # Shared library chart (ioes-common)
│   │   ├── charts/                 # 8 service sub-charts
│   │   └── ioes-platform/          # Umbrella chart
│   ├── monitoring/                 # Prometheus + Grafana + Jaeger
│   └── k8s-manifests/              # Raw K8s (secrets, ingress, RBAC)
├── database/
│   ├── migrations/                 # Per-service migrations
│   └── seeds/
├── tests/
│   ├── e2e/                        # Playwright
│   ├── performance/                # k6
│   └── contract/                   # Pact
├── docs/
│   ├── 01-business/                # BA, structure, rules
│   ├── 02-architecture/            # Service boundaries, ADR
│   ├── 03-development/             # Workflow, coding standards, testing
│   ├── 04-operations/              # Deployment, monitoring, runbooks
│   └── 05-research/                # 3 papers
├── scripts/                        # DevOps scripts
├── .env.example
├── Makefile
├── README.md
└── pom.xml                         # Maven parent
```

### 4.4 Kafka topic naming convention

Format: `<bounded-context>.<aggregate>.<event-past-tense>`

Ví dụ:
- `auth.user.registered` ✓
- `exam.submission.graded` ✓
- `blockchain.certificate.issued` ✓
- `registerUser` ✗ (không viết hoa, không camelCase)
- `user_registered` ✗ (không snake_case)

### 4.5 Event versioning

- **Backward compatible** (thêm field): bump minor version `v1.0 → v1.1`, không breaking change.
- **Breaking change** (đổi structure): bump major version `v1.0 → v2.0`, dùng event type MỚI.
- **Consumer** phải handle cả v1 lẫn v2 song song trong giai đoạn migration.

### 4.6 Tài liệu liên quan

| Tài liệu | Mục đích |
|---|---|
| [docs/01-business/PROJECT_RULES.md](./docs/01-business/PROJECT_RULES.md) | **Master rules** — bắt buộc đọc |
| [docs/01-business/PROJECT_STRUCTURE.md](./docs/01-business/PROJECT_STRUCTURE.md) | Cấu trúc thư mục |
| [docs/01-business/BA_DOCUMENT.md](./docs/01-business/BA_DOCUMENT.md) | Phân tích yêu cầu nghiệp vụ |
| [docs/02-architecture/service-boundaries.md](./docs/02-architecture/service-boundaries.md) | Quy tắc microservices, event schema, saga |
| [docs/03-development/git-workflow.md](./docs/03-development/git-workflow.md) | GitFlow + Conventional Commits |
| [docs/03-development/testing-strategy.md](./docs/03-development/testing-strategy.md) | Test pyramid + TDD |
| [infrastructure/README.md](./infrastructure/README.md) | Terraform/Helm/MongoDB setup |
| [services/README.md](./services/README.md) | Service overview |

### 4.7 Useful Kafka debugging commands

```bash
# List topics
docker exec -it ioes-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Consume từ 1 topic (debug)
docker exec -it ioes-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic auth.user.registered \
  --from-beginning

# Publish test event
docker exec -it ioes-kafka kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic auth.user.registered

# Check consumer group lag
docker exec -it ioes-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe --group notification-service
```

### 4.8 Useful PostgreSQL queries

```bash
# List databases
docker exec -it ioes-postgres psql -U ioes -d postgres -c '\l'

# Connections per service
docker exec -it ioes-postgres psql -U ioes -d postgres -c \
  "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Table sizes
docker exec -it ioes-postgres psql -U ioes -d ioes_auth -c \
  "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_stat_user_tables;"
```

### 4.9 Useful MongoDB queries

```bash
# Replica set status
docker exec -it ioes-mongodb mongosh -u ioes -p ioes_dev_password \
  --eval 'rs.status()'

# List collections of content-service
docker exec -it ioes-mongodb mongosh "mongodb://ioes_content_user:ioes_content_dev_password@mongodb:27017/ioes_content?replicaSet=rs0&authSource=admin" \
  --eval 'db.getCollectionNames().forEach(n => print(n))'

# Slow queries
docker exec -it ioes-mongodb mongosh -u ioes -p ioes_dev_password \
  --eval 'db.adminCommand({profile: 2}); db.system.profile.find().sort({ts: -1}).limit(5)'
```

### 4.10 Useful Redis commands

```bash
# All keys
docker exec -it ioes-redis redis-cli KEYS '*'

# Memory usage
docker exec -it ioes-redis redis-cli INFO memory

# Clear cache for one service
docker exec -it ioes-redis redis-cli --scan --pattern 'ioes:auth:*' | xargs -r docker exec -i ioes-redis redis-cli DEL
```

---

## 📄 License

Proprietary © 2026 IOES Team. All rights reserved.

<div align="center">

**Made with ❤️ by IOES Team**

</div>
