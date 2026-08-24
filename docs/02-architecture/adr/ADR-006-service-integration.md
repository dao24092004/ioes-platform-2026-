# ADR-006: Service Integration — Discovery, Gateway, Event Bus

> **Status:** Accepted
> **Date:** 24/08/2026
> **Decision Makers:** Backend-Node Lead, Backend-Java Lead, Solution Architect
> **Related Documents:**
> - [BA_DOCUMENT.md](../../01-business/BA_DOCUMENT.md) - §8 Architecture, §10.2 Exam Flow
> - [service-boundaries.md](../service-boundaries.md) - §2 Communication Patterns
> - Supersedes: integration gap (exam-suite standalone, no discovery/auth/events)

---

## 1. Context (Bối cảnh)

### 1.1. Vấn đề phát hiện

Trong Sprint 5 review, phát hiện `exam-suite` đang hoạt động **hoàn toàn cô lập**:

| Integration point | Hiện trạng | Rủi ro |
|-------------------|------------|--------|
| Đăng ký Eureka/Discovery | ❌ KHÔNG có `@nestjs/eureka-client` | API Gateway không tìm thấy `lb://exam-suite` → 503 |
| Gọi `auth-service` qua Gateway | ❌ Service URLs defined nhưng không dùng | User validation sai, không verify token |
| JWT verification với auth-service | ⚠️ Local secret, không đồng bộ | Token từ auth-service không pass |
| Publish events (ExamStarted, ExamGraded) | ❌ KHÔNG publish | blockchain/ai/analytics không nhận |
| Consume `CourseEnrolled`, `UserRegistered` | ❌ KHÔNG consume | User không link được với courses |
| Health check `/health` | ⚠️ Có HealthModule nhưng route không match K8s probe | K8s restart nhầm |
| `/metrics` cho Prometheus | ❌ Chưa expose | SRE không monitor được |

### 1.2. Yêu cầu

Theo BA §8.4 và service-boundaries §2:
- Mọi service PHẢI đăng ký với Eureka
- Mọi inter-service call PHẢI qua Gateway (8080)
- Mọi event phải có consumer + publisher theo schema §3.1
- Mọi service expose `/health` và `/metrics` cho K8s

---

## 2. Decision (Quyết định)

### 2.1. Service Discovery Architecture

```
┌──────────────────────┐
│  exam-suite (NestJS) │
│  port 9005           │
└──────────┬───────────┘
           │ register every 10s
           │ heartbeat 30s
           ▼
┌──────────────────────┐
│  Eureka Server        │  ← discovery-service (Java/Spring Cloud Netflix)
│  port 9999            │     self-register: false
└──────────┬───────────┘
           │ pull registry every 30s
           ▼
┌──────────────────────┐
│  API Gateway          │  ← Spring Cloud Gateway WebFlux
│  port 8080            │     discovery.locator.enabled: true
│  routes:              │     lb://exam-suite for /api/exam/**
└──────────────────────┘
```

### 2.2. Inter-service Communication Pattern

**Quy tắc (service-boundaries §2.2)**:
- Frontend → service: **QUA Gateway** (bắt buộc)
- Service-to-service sync: **QUA Gateway** hoặc direct với service URL
- Service-to-service async: **Kafka**

```
Frontend  ─→  Gateway:8080  ─→  exam-suite:9005
                  │
                  └──→  auth-service:9000
                  └──→  content-service:9001

exam-suite  ─→  Gateway:8080/api/auth/validate  (verify JWT)
            ─→  Kafka topic: exam.events         (publish events)
            ─→  Kafka topic: auth.user.events    (consume user events)
```

### 2.3. JWT Verification Strategy

`auth-service` issue JWT với:
- Algorithm: RS256 (asymmetric)
- Public key endpoint: `GET /api/auth/.well-known/jwks.json`
- Claims: `sub`, `email`, `role`, `tenantId`, `permissions`, `exp`, `iss`, `aud`

`exam-suite` verify:
1. Cache public key từ auth-service (TTL 1h)
2. Verify signature với public key (không dùng local secret)
3. Verify `iss = "ioes-auth"`, `aud = "ioes-exam-suite"`
4. Verify `exp` chưa hết hạn
5. Cache user info từ `sub` (Redis, TTL 5min)

### 2.4. Event Schema (Per BA §10.2 Exam Flow)

**Publish (outbox)**:
| Event | Trigger | Consumers |
|-------|---------|-----------|
| `ExamStarted` | Student bắt đầu làm bài | analytics-service, notification-service |
| `ExamSubmitted` | Student nộp bài | ai-suite (grading), analytics-service |
| `ExamGraded` | Auto/manual grading xong | blockchain-suite (cert), notification-service, analytics-service |
| `QuestionUpdated` | Instructor sửa question | analytics-service |

**Consume**:
| Topic | Source | Purpose |
|-------|--------|---------|
| `auth.user.registered` | auth-service | Tạo UserProfile trong exam DB nếu cần |
| `content.course.enrolled` | content-service | Link user-course cho adaptive learning |

---

## 3. Implementation Plan

### 3.1. Phase 1: Discovery + Gateway (immediate)

1. Add `@nestjs/eureka-client` to exam-suite
2. Register `EXAM-SUITE` với Eureka trên port 9005
3. Update `main.ts` để start eureka client sau khi app ready
4. Verify Gateway có thể route `/api/exam/**` → `lb://exam-suite`

### 3.2. Phase 2: Auth Integration

1. Tạo `AuthClient` trong `common-node` (call Gateway)
2. Method: `verifyToken(token)` → user info
3. Method: `getUserById(userId)` → cached
4. Wire JWT guard qua AuthClient thay vì local secret

### 3.3. Phase 3: Events (Kafka)

1. Define `ExamStarted`, `ExamSubmitted`, `ExamGraded` events trong `common-node`
2. Wire `OutboxWorker` cho exam module (giống question-bank)
3. Tạo `UserEventConsumer` để consume `auth.user.registered`

### 3.4. Phase 4: Health & Metrics

1. `/health` endpoint với K8s probe format (`status`, `dependencies`)
2. Wire `/metrics` controller (đã có Sprint 2)
3. Add liveness/readiness probes config

---

## 4. Alternatives Considered

| Phương án | Lý do loại |
|----------|-----------|
| **Consul** thay Eureka | Toàn bộ Java stack đang dùng Eureka, đổi = breaking |
| **Direct HTTP (không qua Gateway)** | Vi phạm service-boundaries §2.2 |
| **Service mesh (Istio)** | Hạ tầng chưa sẵn sàng |
| **Self-signed JWT shared secret** | Insecure, không scale multi-service |
| **OAuth2 introspection** | Thêm latency, cần auth-service round-trip |

---

## 5. Configuration

```bash
# Eureka
EUREKA_SERVER_URL=http://localhost:9999/eureka/
EUREKA_APP_NAME=exam-suite
EUREKA_HOST_NAME=exam-suite
EUREKA_PORT=9005
EUREKA_HEARTBEAT_INTERVAL=30

# Gateway
API_GATEWAY_URL=http://localhost:8080

# Auth
AUTH_SERVICE_URL=http://localhost:9000
JWT_ISSUER=ioes-auth
JWT_AUDIENCE=ioes-exam-suite
JWT_JWKS_CACHE_TTL=3600

# Kafka (đã có)
KAFKA_BROKERS=localhost:9092
```

---

## 6. Test Strategy

| Test | Coverage |
|------|----------|
| Unit: Eureka registration | Mock eureka client, verify register() called |
| Unit: AuthClient | Mock HTTP, test retry on 503 |
| Integration: Gateway → exam-suite | Start gateway + eureka + exam-suite, hit `/api/exam/health` |
| E2E: Exam submission flow | Full flow: login → start → submit → check events |

---

## 7. Consequences

### 7.1. Positive

- Exam-suite hoạt động như 1 service thực sự trong hệ thống
- Auto-scaling (Eureka + K8s HPA)
- Single entry point qua Gateway → unified auth, rate limit
- Event-driven với các services khác → blockchain tự issue cert khi exam graded

### 7.2. Negative

- Eureka client chưa mature cho NestJS → risk bugs
- Auth call thêm latency (~5-10ms) mỗi request verify
- Cache invalidation JWKS cần careful

### 7.3. Migration plan

1. **Week 1**: Discovery + Gateway integration
2. **Week 2**: Auth integration (JWT verify qua Gateway)
3. **Week 3**: Kafka events (publish + consume)
4. **Week 4**: Testing + monitoring

---

## 8. References

- [NestJS Eureka Client](https://www.npmjs.com/package/@chenxe/nestjs-eureka-client)
- [Spring Cloud Netflix Eureka](https://spring.io/projects/spring-cloud-netflix)
- [Service-boundaries §2.2](../service-boundaries.md)

---

**Version:** 1.0
**Last updated:** 24/08/2026
