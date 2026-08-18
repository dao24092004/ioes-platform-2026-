# IOES - Services Overview

## 📦 Services đã thiết lập

### 1. **common-library** (Shared Library)
Shared utilities cho tất cả services:
- `ApiResponse<T>` - Standard response wrapper
- `UserPrincipal` - User info từ JWT
- `ApiException` - Custom exceptions
- `GlobalExceptionHandler` - Handle exceptions toàn cục
- `JwtTokenProvider` - Generate/validate JWT tokens

### 2. **discovery-service** (Port 9999)
**Eureka Server** - Service discovery cho toàn bộ microservices.

Khởi động đầu tiên vì các service khác cần register với Eureka.

### 3. **config-server** (Port 8888)
**Spring Cloud Config Server** - Centralized configuration.
Load config từ `classpath:/config/*.yml`.

Các file config đã chuẩn bị:
- `application.yml` - Base config chung
- `auth-service.yml` - Auth riêng
- `content-service.yml` - Content riêng
- `exam-suite.yml` - Exam riêng
- `ai-suite.yml` - AI riêng

### 4. **api-gateway** (Port 8080)
**Spring Cloud Gateway** - Entry point duy nhất cho client.

**Routes đã cấu hình:**
| Path | Service |
|------|---------|
| `/api/auth/**` | auth-service |
| `/api/content/**` | content-service |
| `/api/exam/**` | exam-suite |
| `/api/analytics/**` | analytics-service |
| `/api/notifications/**` | notification-service |
| `/api/blockchain/**` | blockchain-suite |
| `/api/ai/**` | ai-suite |

**Filters:**
- `JwtAuthenticationFilter` - Validate JWT, inject `X-User-*` headers
- Circuit Breaker (Resilience4j)
- Retry, Rate Limit
- CORS

### 5. **auth-service** (Port 9000)
**Authentication & Authorization** với Hexagonal Architecture.

**Endpoints:**
```
POST   /auth/register        - Đăng ký
POST   /auth/login           - Đăng nhập
POST   /auth/refresh         - Refresh token
POST   /auth/logout          - Đăng xuất
GET    /auth/me              - Lấy thông tin user hiện tại
POST   /auth/change-password - Đổi mật khẩu
```

**Cấu trúc:**
```
auth-service/
├── domain/
│   ├── model/        ← User, UserRole, UserStatus
│   ├── port/
│   │   ├── in/       ← AuthUseCase (input port)
│   │   └── out/      ← UserRepositoryPort (output port)
│   └── service/      ← AuthService (business logic)
├── infrastructure/
│   └── persistence/
│       ├── entity/   ← UserEntity (JPA)
│       ├── repository/ ← UserJpaRepository
│       └── adapter/  ← UserRepositoryAdapter (implements port)
└── interfaces/
    └── rest/
        ├── controller/ ← AuthController
        └── dto/        ← Request/Response DTOs
```

### 6. **notification-service** (Port 9009)
**Email/Push/SMS notifications** với Hexagonal Architecture.

**Endpoints:**
```
POST /notifications/send           - Send notification
POST /notifications/send-templated  - Send với template
GET  /notifications/{id}            - Get by ID
GET  /notifications/user/{userId}   - Get user's notifications
```

**Kafka Listeners:**
- `auth.user.registered` → Gửi welcome email
- `exam.submission.graded` → Gửi kết quả thi

**Templates có sẵn:**
- `welcome.html` - Welcome email
- `exam-passed.html` - Thi đậu
- `exam-failed.html` - Thi trượt

---

## 🚀 Cách chạy

### Yêu cầu
- Java 17+
- Maven 3.9+
- Docker + Docker Compose

### Setup

```bash
# 1. Start infrastructure (PostgreSQL, Redis, Kafka, MinIO, v.v.)
cd infrastructure
docker-compose up -d

# 2. Wait cho PostgreSQL ready, sau đó init databases
docker exec -i ioes-postgres psql -U ioes -d postgres < init-scripts/01-init-databases.sh

# 3. Start services theo thứ tự
# Terminal 1 - Discovery Service
cd services/discovery-service
./mvnw spring-boot:run

# Terminal 2 - Config Server
cd services/config-server
./mvnw spring-boot:run

# Terminal 3 - API Gateway
cd services/api-gateway
./mvnw spring-boot:run

# Terminal 4 - Auth Service
cd services/auth-service
./mvnw spring-boot:run

# Terminal 5 - Notification Service
cd services/notification-service
./mvnw spring-boot:run
```

### Kiểm tra

```bash
# Eureka Dashboard
http://localhost:9999

# Config Server
http://localhost:8888/auth-service/local

# API Gateway
curl http://localhost:8080/actuator/health

# Auth Service (qua Gateway)
curl http://localhost:8080/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ioes.com","password":"Password123!"}'

# Notification Service (qua Gateway)
curl http://localhost:8080/api/notifications/send -X POST \
  -H "Content-Type: application/json" \
  -d '{"type":"EMAIL","recipient":"test@example.com","subject":"Test","content":"Hello"}'
```

---

## 🏗️ Kiến trúc Hexagonal

Mỗi service Java theo **Hexagonal Architecture** (Ports & Adapters):

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERFACES LAYER                         │
│  (REST controllers, Kafka listeners, GraphQL resolvers)     │
└──────────────────────┬──────────────────────────────────────┘
                       │ gọi
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Models     │  │ Use Cases   │  │  Ports      │         │
│  │  (Entities) │  │ (Services)  │  │  (In/Out)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                       │                                     │
│                       │ KHÔNG có framework deps             │
└──────────────────────┬──────────────────────────────────────┘
                       │ (Implement)
┌──────────────────────▼──────────────────────────────────────┐
│                INFRASTRUCTURE LAYER                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Persistence │  │   Kafka     │  │   Email     │         │
│  │ (JPA+Adapter)│  │ (Producer)  │  │  (SMTP)     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

**Nguyên tắc:**
- Domain layer **KHÔNG** phụ thuộc framework
- Use cases được định nghĩa bằng Java interfaces (Ports)
- Adapters implement ports
- Dễ dàng swap infrastructure (DB, message broker)

---

## 📝 Tech Stack

| Service | Language | Framework | Database | Port |
|---------|----------|-----------|----------|------|
| discovery-service | Java 17 | Spring Cloud Netflix Eureka | - | 9999 |
| config-server | Java 17 | Spring Cloud Config | - | 8888 |
| api-gateway | Java 17 | Spring Cloud Gateway (WebFlux) | Redis | 8080 |
| auth-service | Java 17 | Spring Boot 3 | PostgreSQL + Redis | 9000 |
| notification-service | Java 17 | Spring Boot 3 | PostgreSQL + Redis | 9009 |

---

## 🧪 Testing

```bash
# Run tests cho một service
cd services/auth-service
./mvnw test

# Run với coverage
./mvnw test -Dcoverage

# Skip integration tests
./mvnw test -DskipITs
```

**Test structure:**
- `AuthServiceTest` - Unit test cho business logic
- `AuthControllerIntegrationTest` - Integration test cho REST API

---

## 🔐 Security

- JWT-based authentication
- BCrypt password hashing (cost 12)
- Token expiry: 15 phút (access) / 7 ngày (refresh)
- Account lockout: 5 failed attempts → lock 15 phút
- API Gateway validates JWT, inject `X-User-*` headers

---

## 📊 Observability

- **Prometheus** metrics: `/actuator/prometheus`
- **Health checks**: `/actuator/health`
- **Distributed tracing** (khi setup Jaeger)

---

## 🔄 Event Flow (Kafka)

```
┌─────────────────┐  publish  ┌──────────┐  consume  ┌─────────────────────┐
│  auth-service   │ ────────► │  Kafka   │ ────────► │ notification-service │
│ user.registered │           │          │           │ → Gửi welcome email │
└─────────────────┘           └──────────┘           └─────────────────────┘
```

---

## 🚧 Cần làm tiếp

Các service **CHƯA CÓ SOURCE CODE** (chỉ có skeleton từ infrastructure setup):

- [ ] `content-service` (Port 9001)
- [ ] `analytics-service` (Port 9004)
- [ ] `exam-suite` (Port 9005) - Node.js NestJS
- [ ] `ai-suite` (Port 9100-9103) - Polyglot
- [ ] `blockchain-suite` (Port 9200) - Node.js NestJS

Dev có thể copy cấu trúc từ `auth-service` và `notification-service` để implement.