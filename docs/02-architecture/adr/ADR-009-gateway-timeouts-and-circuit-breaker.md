# ADR-009: API Gateway Timeouts & Circuit Breaker Policy

> **Status:** Accepted
> **Date:** 24/08/2026
> **Decision Makers:** Backend-Java Lead, SRE, Solution Architect
> **Related Documents:**
> - [BA_DOCUMENT.md §8 Architecture](../../01-business/BA_DOCUMENT.md)
> - [ADR-002 Resilience Patterns](ADR-002-resilience-patterns.md)
> - [ADR-006 Service Integration](ADR-006-service-integration.md)
> - [service-boundaries.md](../service-boundaries.md)
> - **Post-mortem:** Gateway kills requests >1s dù service đã reply (24/08/2026)

---

## 1. Context

### 1.1. Vấn đề phát hiện (Incident 24/08/2026)

Khi test load Gateway + downstream services, phát hiện:

- **Spring Cloud Gateway tự ngắt mọi request chạy > 1 giây**, kể cả khi downstream service đã trả lời xong.
- Response trả về: `"Service temporarily unavailable"` với HTTP 200 (không phải 503).
- Trace logs cho thấy request **KHÔNG bao giờ đến downstream** sau khi circuit breaker mở.

### 1.2. Root Cause Analysis

**File:** `services/api-gateway/src/main/resources/application.yml` (cũ, lines 99-112)

```yaml
spring.cloud.gateway.default-filters:
  - name: CircuitBreaker      # ← GLOBAL filter, applied to ALL routes
    args:
      name: default
      fallbackUri: forward:/fallback
```

Resilience4j CircuitBreaker với **default config**:
- `slidingWindowSize = 100`
- `failureRateThreshold = 50%` → nếu 50/100 requests là failure → OPEN
- `permittedNumberOfCallsInHalfOpenState = 10`
- `waitDurationInOpenState = 60s` → sau 60s mới thử lại
- `minimumNumberOfCalls = 100` (cần 100 calls trước khi tính failure rate)

Khi service downstream phản hồi chậm 1-2 lần (e.g. AI inference, hoặc DB query nặng):
1. Request #1 timeout (~1.5s) → counted as failure
2. Request #2 timeout → counted as failure
3. ... (tiếp tục)
4. Sau khi đạt `failureRateThreshold = 50%` → circuit OPEN
5. **Tất cả requests tiếp theo → immediate fallback `/fallback`** (KHÔNG qua service, ~1ms)
6. `FallbackController.java:16-18` trả về `Mono.just(ApiResponse.error(...))` với HTTP 200 — **client không phân biệt được đây là fallback hay response thật**
7. Service downstream phục hồi ở request #50 nhưng circuit vẫn OPEN
8. Phải chờ 60s mới có half-open trial

**Kết quả:**
- User nhận "Service temporarily unavailable" trong khi service thật ra OK
- Metrics monitoring không phản ánh đúng tình trạng downstream
- Trace logs không show request tới service (vì gateway chặn từ đầu)

### 1.3. Yêu cầu BA

- NFR-004: Availability ≥ 99.5%
- NFR-011: Monitoring với Prometheus + Grafana
- NFR-006: Authentication, không có downtime

→ **Không thể có global circuit breaker "blind"** — phải:
1. Có timeout rõ ràng, configurable per route
2. Circuit breaker chỉ enable khi cần, không phải default
3. Fallback response PHẢI trả HTTP status đúng (503, không phải 200)
4. Metrics phải phân biệt được fallback vs success

---

## 2. Decision

### 2.1. Quy tắc Global

> **KHÔNG bật global `CircuitBreaker` filter trên Gateway. Mỗi route cần resilience PHẢI declare explicit.**

| Concern | Decision |
|---------|----------|
| Global CircuitBreaker | ❌ **TẮT** (default-filters không có) |
| Global Retry | ✅ BẬT (chỉ retry 5xx + Gateway Timeout, tối đa 3 lần, max backoff 500ms) |
| HTTP client connect timeout | ✅ 5s (config rõ ràng) |
| HTTP client response timeout | ✅ 30s (config rõ ràng) |
| Max idle connection | ✅ 60s |
| Per-route circuit breaker | ✅ BẬT riêng cho route có downstream flaky (vd: AI inference) |
| Fallback controller | ✅ Trả 503 Service Unavailable + JSON metadata |

### 2.2. Default Filters (Sau khi fix)

```yaml
# services/api-gateway/src/main/resources/application.yml
spring.cloud.gateway.default-filters:
  - DedupeResponseHeader=Access-Control-Allow-Origin Access-Control-Allow-Credentials, RETAIN_UNIQUE
  - name: Retry
    args:
      retries: 3
      statuses: BAD_GATEWAY,SERVICE_UNAVAILABLE,GATEWAY_TIMEOUT
      backoff:
        firstBackoff: 100ms
        maxBackoff: 500ms
        factor: 2

spring.cloud.gateway.httpclient:
  connect-timeout: 5000
  response-timeout: 30s
  max-idle-time: 60s

spring.codec.max-in-memory-size: 5MB
```

### 2.3. Per-Route Circuit Breaker (khi cần)

Ví dụ cho AI inference routes (flaky, GPU-bound):

```yaml
routes:
  - id: ai-suite-inference
    uri: lb://ai-suite
    predicates:
      - Path=/api/ai/inference/**
    filters:
      - StripPrefix=2
      - name: CircuitBreaker
        args:
          name: aiInference
          fallbackUri: forward:/fallback
      - name: Retry
        args:
          retries: 2
          statuses: BAD_GATEWAY,SERVICE_UNAVAILABLE
          backoff:
            firstBackoff: 200ms
            maxBackoff: 2s
            factor: 2

resilience4j.circuitbreaker:
  instances:
    aiInference:
      sliding-window-size: 20
      failure-rate-threshold: 50
      wait-duration-in-open-state: 30s
      permitted-number-of-calls-in-half-open-state: 5
```

### 2.4. Fallback Controller Contract

```java
@GetMapping
public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> fallback() {
    return Mono.just(ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .contentType(MediaType.APPLICATION_JSON)
        .body(/* ApiResponse với reason + timestamp */));
}
```

**Bắt buộc:**
- HTTP status = `503 Service Unavailable`
- Body JSON chứa `reason` và `timestamp`
- `Content-Type: application/json`

### 2.5. Metrics & Alerts

Prometheus metrics exposed tại `/actuator/prometheus`:

| Metric | Alert khi |
|--------|-----------|
| `gateway_requests_seconds_count{status="503"}` > 10% trong 5m | Service downstream hoặc gateway có vấn đề |
| `resilience4j_circuitbreaker_state{name="X", state="open"}` == 1 | Circuit X đang OPEN, cần investigate |
| `gateway_requests_seconds_bucket{quantile="0.95"}` > 2s | Response time chậm bất thường |

---

## 3. Implementation Plan

### 3.1. Done (24/08/2026)

| File | Change |
|------|--------|
| `services/api-gateway/src/main/resources/application.yml` | Bỏ global CircuitBreaker, thêm `httpclient.{connect,response}-timeout` |
| `services/api-gateway/src/main/java/com/ioes/gateway/controller/FallbackController.java` | Trả 503 thay vì 200, thêm metadata |
| `libs/common-core/src/main/java/com/ioes/common/dto/ApiResponse.java` | `@Builder(toBuilder = true)` để FallbackController dùng |

### 3.2. Pending (Sprint 8-9)

| Task | Owner | Sprint |
|------|-------|--------|
| Per-route CircuitBreaker cho `/api/ai/**` (AI inference chậm) | Java Lead | Sprint 8 |
| Per-route CircuitBreaker cho `/api/blockchain/**` (Web3 RPC chậm) | Java Lead | Sprint 8 |
| Grafana dashboard cho Gateway metrics | SRE | Sprint 8 |
| Alert rule: `gateway_503_rate > 10%` | SRE | Sprint 8 |
| Load test (k6) verify response time < 2s cho 95%ile | QA | Sprint 9 |
| Document cho từng service route nào cần/per-route CB | Backend-Node Lead | Sprint 9 |

---

## 4. Alternatives Considered

| Phương án | Lý do loại |
|----------|-----------|
| **Keep global CircuitBreaker, fix default config** | Vẫn ảnh hưởng routes không cần CB (vd: auth, content — đã stable) |
| **Disable fallback entirely, fail open** | Mất UX tốt khi downstream down |
| **Istio service mesh** | Hạ tầng chưa sẵn sàng, Phase 2 research |
| **Set `response-timeout: 1s`** | Quá ngắn, false-positive nhiều |
| **Custom WebFilter thay Resilience4j** | Reimplement wheel, không có state machine đã test |

---

## 5. Test Strategy

| Test | Type | Tool |
|------|------|------|
| Gateway with slow downstream (3s response) → expect 200 trong < 30s | Integration | Testcontainers |
| Gateway with completely down service → expect 503 + JSON metadata | Integration | Testcontainers |
| Load test 100 RPS, p95 < 2s | Performance | k6 |
| Circuit breaker opens after 50% failures in 20 calls | Integration | Testcontainers + delay injection |
| Fallback body shape: `success=false, data.reason, data.timestamp` | Unit | Jest |

CI gate (must-pass):
```bash
# 1. application.yml KHÔNG có global CircuitBreaker
# 2. application.yml CÓ httpclient.response-timeout >= 10s
# 3. FallbackController trả 503
```

---

## 6. Consequences

### 6.1. Positive

- Mỗi route có thể config resilience riêng (phù hợp với risk profile khác nhau)
- Metrics chính xác hơn (không "đè" fallback lên success)
- Downstream ổn định (auth, content) không bị ảnh hưởng bởi CB của route khác
- Response timeout rõ ràng → SRE monitor được

### 6.2. Negative

- Phải config per-route → nhiều config hơn → cần review kỹ khi thêm route mới
- Per-route CB phức tạp hơn global CB → cần documentation tốt

### 6.3. Risks

- **Quên set per-route CB cho route mới flaky** → SRE monitor + alert rule để detect
- **Timeout quá dài (30s) → user experience kém** → có retry + backoff để mitigate

---

## 7. References

- [Spring Cloud Gateway — HttpClient Properties](https://docs.spring.io/spring-cloud-gateway/docs/current/reference/html/#httpclient)
- [Resilience4j — CircuitBreaker](https://resilience4j.readme.io/docs/circuitbreaker)
- [BA §8 Architecture — API Gateway](../../01-business/BA_DOCUMENT.md)
- [ADR-002 Resilience Patterns](ADR-002-resilience-patterns.md)
- [ADR-006 Service Integration](ADR-006-service-integration.md)

---

**Version:** 1.0
**Last updated:** 24/08/2026