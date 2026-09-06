# 🚨 Operations Post-mortem #001 — Gateway silently rejects valid tokens / 1s timeout

> **Ngày:** 24/08/2026
> **Severity:** P0 (Silent failure, chưa có user impact vì chưa ai gọi qua gateway)
> **Detection:** Tech Lead review trước Phase 2 sprint
> **Root cause:** Sai config trong `api-gateway` + `auth-service` (2 lỗi độc lập)
> **Resolution:** 24/08/2026 — đã fix và document ADR-008 + ADR-009

---

## TL;DR

| # | Lỗi | Triệu chứng | Impact |
|---|------|-------------|--------|
| **1** | JWT secret mismatch giữa `api-gateway` và `auth-service` | Tất cả request có token đi qua port 8080 bị 401 | **P0** — chưa ai gọi qua gateway nên chưa lộ |
| **2** | Global `CircuitBreaker` + không có `response-timeout` | Gateway tự ngắt mọi request > 1s, fallback trả 200 OK thay vì 503 | **P0** — kể cả khi service đã reply OK |

Cả 2 lỗi đều được fix ngày 24/08/2026. Xem [ADR-008](../02-architecture/adr/ADR-008-jwt-secret-synchronization.md) và [ADR-009](../02-architecture/adr/ADR-009-gateway-timeouts-and-circuit-breaker.md).

---

## Lỗi #1: JWT Secret mismatch

### Mô tả

Khi test integration `auth-service` → `api-gateway`, phát hiện gateway reject mọi token hợp lệ với 401.

### Timeline

- **12/08/2026:** auth-service và api-gateway được tạo (Sprint 0). Mỗi service tự config JWT secret.
- **12–24/08/2026:** Dev chạy local từng service riêng → không phát hiện vì không có integration test.
- **24/08/2026:** Sprint 8 review Phase 2 (Upload + Dgraph) → Tech Lead test integration lần đầu → phát hiện.

### Root cause

| File | Secret thực tế dùng |
|------|---------------------|
| `services/auth-service/src/main/resources/application.yml:71` | `ioes-jwt-secret-key-must-be-at-least-256-bits-long-for-hs256-signing-algorithm` |
| `services/auth-service/src/main/resources/application-local.yml:24` | `ioes-jwt-secret-key-must-be-at-least-256-bits-long-for-hs256-signing-algorithm` |
| `services/api-gateway/src/main/resources/application.yml` | **KHÔNG CÓ block `jwt.secret`** → fallback mặc định |
| `libs/common-jwt/src/main/java/com/ioes/common/security/JwtTokenProvider.java:26` (default cũ) | `change-me-in-production-use-at-least-256-bits-key-here` |

→ 2 secret khác nhau → `io.jsonwebtoken` signature mismatch → reject.

### Tại sao chưa ai phát hiện?

1. **Không có integration test gateway ↔ auth-service** trong CI
2. **Frontend đang gọi trực tiếp `auth-service:9000`**, không qua gateway
3. **Test local từng service** trên mỗi dev máy → secret default chưng không match nhưng 2 service riêng lẻ vẫn work

### Fix

**Fix v1 (24/08/2026, ban đầu):**

| File | Change |
|------|--------|
| `services/api-gateway/src/main/resources/application.yml` | Thêm block `jwt.secret: ${JWT_SECRET:...}` (line 34-38) |
| `libs/common-jwt/src/main/java/com/ioes/common/security/JwtTokenProvider.java` | Đổi default từ placeholder cũ → giống auth-service |
| `services/auth-service/src/main/resources/application-local.yml` | Wrap secret trong `${JWT_SECRET:...}` |
| `services/exam-suite/src/config/app.config.ts` | Thêm default fallback cho dev |
| `scripts/ci-check-jwt-secret.sh` (mới) | CI gate enforce secret sync |

**Fix v2 (24/08/2026, cùng ngày — NO DEFAULT FALLBACK):**

Phát hiện fix v1 vẫn có vấn đề: default fallback trong code = leak qua source. Nếu repo bị leak (git push nhầm, source bị đánh cắp) → attacker có ngay secret của tất cả dev/staging instances → có thể scan thử production. Ngoài ra, nếu dev mới quên set env → silently dùng default cũ (chưa đồng bộ) → vẫn có thể mismatch.

**Quy tắc mới:** KHÔNG default fallback trong code. Mọi secret load trực tiếp từ env, thiếu → app fail-fast.

| File | Change |
|------|--------|
| `.env`, `.env.example` | Set `JWT_SECRET=conghoaxahoichunghiavietnamdoclaptudohanhphuc-2-9-1975` (54 chars, 432 bits) |
| `libs/common-jwt/.../JwtTokenProvider.java` | `@Value("${jwt.secret}")` — NO DEFAULT |
| `libs/common-python/.../config.py` | `jwt_secret: str = Field(...)` — NO DEFAULT |
| `services/auth-service/application-local.yml` | `secret: ${JWT_SECRET}` — NO DEFAULT |
| `services/api-gateway/application.yml` | `secret: ${JWT_SECRET}` — NO DEFAULT |
| `services/exam-suite/src/config/app.config.ts` | Helper `requiredSecret('JWT_SECRET')` — NO DEFAULT |
| `services/blockchain-suite/src/config/app.config.ts` | Helper `requiredSecret('JWT_SECRET')` — NO DEFAULT |
| Tất cả `.env.example` của services | Update `JWT_SECRET` khớp với root `.env.example` |
| `scripts/ci-check-jwt-secret.sh` | Refactor: enforce NO DEFAULT FALLBACK + cross-service value match |

### Lessons learned

1. **Mọi service verify JWT PHẢI reference cùng secret.** Nếu default khác nhau → bug chỉ lộ khi integrate.
2. **CI gate quan trọng hơn unit test** cho config-driven bugs.
3. **Default fallback trong source = SECURITY RISK** — luôn load từ env, fail-fast nếu thiếu.
4. **Single source of truth**: `.env.example` ở root, các service copy giá trị từ đó.

### Action items

- [x] Fix v1: sync default fallback giữa services (Sprint 8)
- [x] Fix v2: loại bỏ hoàn toàn default fallback (Sprint 8)
- [x] CI check `ci-check-jwt-secret.sh` (block merge nếu vi phạm)
- [ ] Apply `requiredSecret` cho tất cả secrets khác (DB password, storage keys) — Sprint 9
- [ ] Integration test `gateway ↔ auth-service` (Sprint 8, owner: QA)
- [ ] Migrate HS256 → RS256 với JWKS (Sprint 10, owner: Auth Lead)

---

## Lỗi #2: Gateway tự ngắt request > 1s

### Mô tả

Khi load test gateway với downstream services, phát hiện:

- Mọi request chạy > 1 giây bị gateway tự ngắt
- Response: `"Service temporarily unavailable"` với HTTP **200** (KHÔNG phải 503)
- Trace logs cho thấy request **KHÔNG BAO GIỜ** đến downstream

### Timeline

- **12/08/2026:** api-gateway config global `CircuitBreaker` filter (theo Spring Cloud Gateway default).
- **24/08/2026:** Tech Lead phát hiện khi test integration với `content-service`.

### Root cause

`application.yml` (cũ):

```yaml
spring.cloud.gateway.default-filters:
  - name: CircuitBreaker      # ← GLOBAL filter
    args:
      name: default
      fallbackUri: forward:/fallback
```

Resilience4j CircuitBreaker với **default config**:
- `slidingWindowSize = 100`
- `failureRateThreshold = 50%`
- `waitDurationInOpenState = 60s`

Khi downstream phản hồi chậm 1-2 lần → counted as failure → circuit OPEN → **forward fallback ngay lập tức** (~1ms, KHÔNG gọi service).

`FallbackController.java:16-18` (cũ):
```java
return Mono.just(ApiResponse.error("Service temporarily unavailable..."));
```
→ Trả HTTP 200 với body là ApiResponse. **Client không phân biệt được fallback vs success.**

### Tại sao chưa ai phát hiện?

1. Chưa ai test gateway với downstream thật
2. Circuit breaker default threshold (50%) yêu cầu 50 failures/100 calls → cần load test
3. Fallback 200 OK trông giống success response

### Fix

| File | Change |
|------|--------|
| `services/api-gateway/src/main/resources/application.yml` | Bỏ global `CircuitBreaker`, thêm `httpclient.{connect,response}-timeout` |
| `services/api-gateway/src/main/java/com/ioes/gateway/controller/FallbackController.java` | Trả 503 + JSON metadata |
| `libs/common-core/src/main/java/com/ioes/common/dto/ApiResponse.java` | Thêm `@Builder(toBuilder = true)` |
| `scripts/ci-check-gateway-config.sh` (mới) | CI gate enforce timeout + 503 fallback |

### Lessons learned

1. **Global circuit breaker = nặu cho mọi route.** Phải opt-in per route.
2. **HTTP 200 cho fallback = trap.** Phải dùng 5xx để client distinguish.
3. **Default timeout unlimited = risk.** Luôn set rõ ràng.

### Action items

- [x] Bỏ global CB + set timeout (Sprint 8)
- [x] CI check `ci-check-gateway-config.sh`
- [ ] Per-route CB cho AI inference, blockchain RPC (Sprint 8, owner: Java Lead)
- [ ] Grafana dashboard cho Gateway metrics (Sprint 8, owner: SRE)
- [ ] k6 load test verify p95 < 2s (Sprint 9, owner: QA)

---

## Tác động

### Trước fix

```
auth-service (port 9000)
  ├── issue token với secret A
  └── self-validate OK với secret A

api-gateway (port 8080)
  ├── validate token với secret B  ← MISMATCH
  └── reject mọi request có token → 401
```

```
Frontend → Gateway (8080)
                 │
                 ├── timeout > 1s? → fallback 200 OK
                 │              → user thấy "Service temporarily unavailable"
                 │              → KHÔNG BAO GIỜ tới downstream service
                 │
                 └── < 1s? → forward downstream
                                → response thật (OK hoặc 5xx)
```

### Sau fix

```
auth-service ↔ api-gateway: CÙNG secret → verify OK ✅

Gateway:
  ├── connect-timeout: 5s
  ├── response-timeout: 30s
  └── retry: 3 lần với 5xx/timeout

  Nếu downstream fail / timeout / down:
    → FallbackController trả 503 + JSON metadata
    → Client biết là fallback, retry được
```

---

## Phòng ngừa (Preventive measures)

### 1. CI gates (đã implement)

```bash
# Trước mỗi PR merge
make ci-check-config
# = scripts/ci-check-jwt-secret.sh + scripts/ci-check-gateway-config.sh
```

### 2. Integration tests (TODO Sprint 8)

- `tests/integration/gateway-auth-jwt.spec.ts` — issue token ở auth-service, gọi qua gateway
- `tests/integration/gateway-timeout.spec.ts` — slow downstream → expect 200 trong < 30s
- `tests/integration/gateway-fallback.spec.ts` — down downstream → expect 503

### 3. Monitoring (TODO Sprint 8)

- Grafana dashboard cho `/actuator/prometheus` của gateway
- Alert: `gateway_5xx_rate > 10%` → page on-call
- Alert: `jwt_secret_mismatch` (custom metric qua integration test)

### 4. Documentation (đã làm)

- [ADR-008](../02-architecture/adr/ADR-008-jwt-secret-synchronization.md) — JWT secret rule
- [ADR-009](../02-architecture/adr/ADR-009-gateway-timeouts-and-circuit-breaker.md) — Gateway resilience rule
- [PROJECT_RULES §6.1.1, §6.1.2](../01-business/PROJECT_RULES.md) — bắt buộc đọc
- [configuration-guide §7.5, §7.6](../04-operations/configuration-guide.md) — config examples

---

## Đối tượng cần đọc

| Role | Đọc gì |
|------|--------|
| **Backend Java Lead** | ADR-008, ADR-009, configuration-guide §7.5-7.6 |
| **Backend Node Lead** | ADR-008 §2.2.2 (Node.js config), PROJECT_RULES §6.1.1 |
| **DevOps / SRE** | CI scripts (`ci-check-*.sh`), Grafana setup |
| **QA** | Integration tests Sprint 8 |
| **Tech Lead / PM** | Full post-mortem (file này) |

---

**Owner:** Backend-Java Lead + SRE
**Review date:** Sau Sprint 8 (verify fixes trong production)
**Next post-mortem:** Khi có incident tiếp theo