# ADR-008: JWT Secret Synchronization — Shared Secret Rule

> **Status:** Accepted
> **Date:** 24/08/2026
> **Updated:**
> - v1.1 (24/08/2026) — Added **NO DEFAULT FALLBACK** rule
> - v1.2 (24/08/2026) — Added **SINGLE SOURCE OF TRUTH** rule (root `.env.example` only)
> - v1.3 (24/08/2026) — Added **Java auto-load** via `MonorepoDotEnvInitializer` in `common-core`
> **Decision Makers:** Backend-Java Lead, Backend-Node Lead, Solution Architect
> **Related Documents:**
> - [BA_DOCUMENT.md §3.1.1](../../01-business/BA_DOCUMENT.md) — Auth module, FR-AUTH-003
> - [ADR-006 Service Integration](ADR-006-service-integration.md)
> - [configuration-guide.md](../../04-operations/configuration-guide.md)
> - **Post-mortem for incident:** Gateway silently rejects all valid tokens (24/08/2026)

---

## 1. Context

### 1.1. Vấn đề phát hiện (Incident 24/08/2026 — 3 lần fix)

**Lần 1 — Secret mismatch:**
- `auth-service` issue token với secret = `ioes-jwt-secret-key-must-be-at-least-256-bits-long-for-hs256-signing-algorithm`
- `api-gateway` fallback default khác → reject mọi token hợp lệ với 401.

**Lần 2 — Security risk còn lại sau fix v1:**
- Fix v1: đổi default fallback cho `JwtTokenProvider` thành cùng secret với auth-service.
- **Vấn đề:** default fallback vẫn nằm trong source code. Nếu repo leak (git push nhầm branch, source bị đánh cắp, ...) → attacker có ngay secret của tất cả dev/staging instances → có thể scan production.
- **Đặc biệt nguy hiểm:** nếu 1 service quên override default và dùng default cũ (`change-me-...`) → secret thực sự được sử dụng = default cũ + default mới phụ thuộc vào service. Rất khó debug.

**Lần 3 — Service-level `.env.example` proliferation:**
- Sau khi consolidate JWT_SECRET xong, phát hiện mỗi service có file `.env.example` riêng trong `services/<svc>/.env.example`.
- **Vấn đề:**
  - Trùng lặp: JWT_SECRET xuất hiện ở 4 file (root + 3 services). Đổi secret ở root mà quên 1 service → mismatch.
  - Không đồng bộ: dev nào đó tự thêm biến "chỉ cho service X" mà quên notify team. CI phát hiện → block merge, phí thời gian.
  - Khó audit: khi rotate secret, phải sửa nhiều file, dễ quên.
- **Final fix (v1.2):** Loại bỏ tất cả `services/<svc>/.env.example` và `services/<svc>/.env`. Mọi service PHẢI load root `.env` qua `findMonorepoRoot()` / `_find_monorepo_root()`.

### 1.2. Phạm vi ảnh hưởng

Bất kỳ service nào verify JWT (HS256 hoặc bất kỳ shared-secret algorithm nào) PHẢI dùng cùng secret với `auth-service`. Trong hệ thống hiện tại:

| Service | Role | Verify JWT? | Cần fix? |
|---------|------|-------------|----------|
| `api-gateway` | Validate tất cả request | ✅ | ✅ (đã fix) |
| `auth-service` | Issue + self-validate | ✅ | N/A (issuer) |
| `exam-suite` (Node.js) | Validate từ `JwtAuthGuard` | ✅ | ✅ (đã fix) |
| `content-service` | Validate từ Spring Security filter | ✅ | ⏳ Verify |
| `notification-service` | Service-to-service, không verify | ❌ | N/A |
| `analytics-service` | Event consumer, không verify HTTP | ❌ | N/A |
| `blockchain-suite` | Validate? | TBD | ✅ (đã fix) |
| `ai-suite/*` (Python) | Validate qua BaseServiceSettings | ✅ | ✅ (đã fix) |

### 1.3. Yêu cầu

Theo BA §3.1.1 (FR-AUTH-003) và NFR-006:
- Access token 15 phút (900000 ms)
- Refresh token 7 ngày (604800000 ms)
- Algorithm: HS256 (current implementation; future: RS256 with JWKS per ADR-006 §2.3)
- **Mọi service verify PHẢI dùng cùng secret.**
- **Mọi secret PHẢI load qua env, KHÔNG có default fallback trong code.**

---

## 2. Decision

### 2.1. ⛔ Quy tắc vàng: NO DEFAULT FALLBACK

> **Mọi secret (JWT_SECRET, POSTGRES_PASSWORD, API keys, ...) PHẢI load trực tiếp từ biến môi trường. KHÔNG ĐƯỢC phép default fallback trong code/config.**

**Lý do:**
1. **Security:** default trong source = leak qua git. Kẻ tấn công có thể dùng default để forge token.
2. **Cross-service consistency:** nếu 2 service có default khác nhau → silent bug (incident #1). Nếu 2 service có default giống nhau → vẫn risk khi default leaked.
3. **Fail-fast principle:** thiếu config = fail rõ ràng tại startup, dễ debug hơn silent bug tại runtime.

### 2.2. ⛔ Quy tắc vàng (v1.2): SINGLE SOURCE OF TRUTH

> **`.env.example` ở ROOT là single source of truth duy nhất. KHÔNG ĐƯỢC tạo `services/<svc>/.env.example` hoặc `services/<svc>/.env` riêng.**

**Lý do:**
1. **Không trùng lặp:** JWT_SECRET chỉ define 1 lần ở root. Đổi 1 lần → mọi service tự động pick up.
2. **Không drift:** dev không thể tự ý thêm biến "chỉ cho service X" mà quên notify team.
3. **Dễ tìm:** grep một biến → biết ngay nó define ở đâu. Không phải grep nhiều files.
4. **Audit 1 chỗ:** khi rotate secret, chỉ sửa 1 file.

### 2.3. Auto-detect root `.env`

Mọi service (Node.js, Python, **Java**) PHẢI dùng auto-detect pattern:

**Node.js (`services/<svc>/src/config/app.config.ts`):**
```typescript
function findMonorepoRoot(startDir: string): string {
  let dir = startDir;
  while (true) {
    if (existsSync(resolve(dir, '.env.example'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return startDir;
    dir = parent;
  }
}
```

**Python (`libs/common-python/src/ioes_common/config.py`):**
```python
def _find_monorepo_root() -> Path:
    cwd = Path.cwd()
    for parent in [cwd, *cwd.parents]:
        if (parent / ".env.example").exists():
            return parent
    return cwd
```

**Java (`libs/common-core/src/main/java/com/ioes/common/config/MonorepoDotEnvInitializer.java`):**
```java
@Slf4j
public class MonorepoDotEnvInitializer
        implements ApplicationContextInitializer<ConfigurableApplicationContext> {
    @Override
    public void initialize(ConfigurableApplicationContext ctx) {
        Path root = findMonorepoRoot();           // walk up tìm .env.example
        Path dotEnv = root.resolve(".env");
        if (!Files.isRegularFile(dotEnv)) return;

        Map<String, Object> props = parseFile(dotEnv);
        ctx.getEnvironment().getPropertySources().addLast(
                new MapPropertySource("monorepoDotEnv", props));
    }
}
```
Registered via `META-INF/spring.factories` + `META-INF/spring/...imports`
(cả 2 SPI cho cả Spring Boot 2.x và 3.x). Mọi service depend `common-core`
(api-gateway, auth-service, content-service, notification-service,
analytics-service, config-server) auto pick up — **không cần edit `main` class**.

Honors parsing rules:
- `KEY=value`, `KEY="value"`, `KEY='value'`
- inline comments: `KEY=value # comment` → strip phần sau `#`
- quoted hash giữ nguyên: `KEY="value#literal"`
- empty lines / lines chỉ có comment → skip

OS env / JVM sysprop luôn thắng — file `.env` chỉ fill in cho các biến
chưa được set.

### 2.4. Service-specific env vars (pattern `<SERVICE>_*`)

Root `.env.example` có thể chứa biến riêng cho từng service. Pattern:

```
# -------- Exam Suite (Node.js, port 9005) --------
EXAM_SERVICE_PORT=9005
EXAM_STORAGE_ENDPOINT=http://localhost:9002
# -------- Blockchain Suite (Node.js, port 9200) --------
BLOCKCHAIN_PRIVATE_KEY=
# ...
```

Service dùng helper `prefixed()` để đọc (Node.js):
```typescript
function prefixed(prefix: string, key: string, fallback?: string): string {
  return process.env[`${prefix}_${key}`] ?? process.env[key] ?? fallback;
}

// Usage:
port: prefixedInt('EXAM', 'APP_PORT', 9005),
```

### 2.5. Setup workflows

**Workflow dev:**
1. `cp .env.example .env` ở root (chỉ cần làm 1 lần)
2. Mọi service (Node.js + Python + Java) tự động load root `.env`
3. Đổi biến nào → sửa 1 file `.env` ở root

**Workflow prod:**
- Inject qua Kubernetes Secret / Vault → env vars cho Pod.
- KHÔNG commit file `.env` thật vào git (`.gitignore` đã ignore).

### 2.3. Cấu trúc cấu hình

#### Java services (auth-service, api-gateway, content-service, notification-service, analytics-service)

Mọi service PHẢI có block `jwt:` trong `application.yml` với **KHÔNG default**:

```yaml
jwt:
  secret: ${JWT_SECRET}                        # ← BẮT BUỘC, không default
  access-token-expiration: ${JWT_ACCESS_TOKEN_EXPIRATION:900000}   # default OK cho config không phải secret
  refresh-token-expiration: ${JWT_REFRESH_TOKEN_EXPIRATION:604800000}
  issuer: ${JWT_ISSUER:ioes-platform}          # default OK cho config không phải secret
```

**Phân biệt:**
- `secret` (BẮT BUỘC, không default) — là secret
- `access-token-expiration`, `issuer` (CÓ default OK) — không phải secret, default an toàn

#### Backend library (common-jwt)

`libs/common-jwt/src/main/java/com/ioes/common/security/JwtTokenProvider.java`:

```java
@Value("${jwt.secret}")        // ← BẮT BUỘC, không default
private String jwtSecret;
```

Nếu `JWT_SECRET` không set → Spring throw `IllegalArgumentException: Could not resolve placeholder 'jwt.secret'` tại startup → app fail ngay. Developer sẽ thấy lỗi rõ ràng.

#### Python services (ai-suite/ml-worker, ocr-service, speech-service)

`libs/common-python/src/ioes_common/config.py`:

```python
jwt_secret: str = Field(...)   # ← BẮT BUỘC, không default
```

Pydantic sẽ throw `ValidationError` tại load nếu không có `JWT_SECRET` env var.

#### Node.js services (exam-suite, blockchain-suite)

Mọi Node.js service PHẢI dùng helper `requiredSecret()`:

```typescript
// services/exam-suite/src/config/app.config.ts

function requiredSecret(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`❌ Missing required secret: ${key}`);
  }
  return value;
}

export const jwtConfig = {
  secret: requiredSecret('JWT_SECRET'),  // ← BẮT BUỘC, không default
  // ...
};
```

#### Các secret khác (KHÔNG chỉ JWT)

| Secret | Java/Node pattern | Lý do |
|--------|-------------------|-------|
| `JWT_SECRET` | `requiredSecret` / `${JWT_SECRET}` | Critical, shared |
| `POSTGRES_PASSWORD` | `requiredSecret` / `${POSTGRES_PASSWORD}` | DB access |
| `REDIS_PASSWORD` | optional (Redis có thể chạy không auth trong dev) | Optional |
| `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` | `requiredSecret` / `${...}` | S3/MinIO access |
| `OPENAI_API_KEY` | optional (tùy service có dùng LLM không) | Optional |
| `BLOCKCHAIN_PRIVATE_KEY` | `requiredSecret` / `${...}` | Critical, blockchain access |

### 2.4. Validation pattern (CI check)

CI script `scripts/ci-check-jwt-secret.sh` (đã implement) enforce:

1. **Java services:** `${JWT_SECRET}` KHÔNG có `:` default fallback
2. **`JwtTokenProvider.java`:** `@Value("${jwt.secret}")` KHÔNG có default
3. **Python `BaseServiceSettings`:** `jwt_secret: str = Field(...)` (no default)
4. **Node.js services:** dùng `requiredSecret('JWT_SECRET')` (no default)
5. **Cross-service value match:** tất cả `.env*` files có cùng `JWT_SECRET`

### 2.5. Secret rotation strategy

Theo BA NFR-005 + PROJECT_RULES §12.2:
- **Mỗi 90 ngày** rotate secret
- Khi rotate:
  1. Update K8s Secret `ioes-jwt-secret` với giá trị mới
  2. Restart theo thứ tự: `auth-service` → `api-gateway` → downstream services
  3. Verify với integration test (`tests/integration/jwt-secret-rotation.spec.ts`)
  4. Old secret vẫn valid trong 1h (grace period) cho in-flight tokens

---

## 3. Implementation Plan

### 3.1. Done (24/08/2026 — Fix v1: sync secret)

| File | Change |
|------|--------|
| `services/api-gateway/src/main/resources/application.yml` | Thêm block `jwt.secret` reference `${JWT_SECRET}` |
| `libs/common-jwt/src/main/java/com/ioes/common/security/JwtTokenProvider.java` | Đổi default từ placeholder cũ → giống auth-service |
| `libs/common-jwt/src/main/java/com/ioes/common/security/JwtTokenProvider.java` | Thêm Javadoc cảnh báo PHẢI sync với auth-service |

### 3.2. Done (24/08/2026 — Fix v2: NO DEFAULT FALLBACK)

| File | Change |
|------|--------|
| `.env.example`, `.env` | Set `JWT_SECRET=conghoaxahoichunghiavietnamdoclaptudohanhphuc-2-9-1975` (54 chars, 432 bits > 256 bits) |
| `libs/common-jwt/.../JwtTokenProvider.java` | `@Value("${jwt.secret}")` (no default) |
| `libs/common-python/.../config.py` | `jwt_secret: str = Field(...)` (no default) |
| `services/auth-service/application-local.yml` | `secret: ${JWT_SECRET}` (no default) |
| `services/api-gateway/application.yml` | `secret: ${JWT_SECRET}` (no default) |
| `services/exam-suite/src/config/app.config.ts` | `secret: requiredSecret('JWT_SECRET')` (no default) |
| `services/blockchain-suite/src/config/app.config.ts` | `secret: requiredSecret('JWT_SECRET')` (no default) |
| `services/exam-suite/.env.example`, `blockchain-suite/.env.example`, `ai-suite/ml-worker/.env.example` | Update `JWT_SECRET` khớp với root `.env.example` |
| `scripts/ci-check-jwt-secret.sh` | Refactor: enforce NO DEFAULT FALLBACK + cross-service value match |

### 3.3. Done (24/08/2026 — Fix v3: SINGLE SOURCE OF TRUTH)

| File | Change |
|------|--------|
| `services/exam-suite/.env.example` | ❌ **Removed** |
| `services/blockchain-suite/.env.example` | ❌ **Removed** |
| `services/ai-suite/ml-worker/.env.example` | ❌ **Removed** |
| `.env.example` (root) | ✅ Thêm per-service vars (EXAM_*, BLOCKCHAIN_*, ML_*, ...) |
| `.env` (root) | ✅ Sync với `.env.example` |
| `services/exam-suite/src/config/app.config.ts` | ✅ `findMonorepoRoot()` helper + `prefixed()` helper |
| `services/blockchain-suite/src/config/app.config.ts` | ✅ `findMonorepoRoot()` helper + `prefixed()` helper |
| `libs/common-python/src/ioes_common/config.py` | ✅ `_find_monorepo_root()` helper |
| `.gitignore` | ✅ Ignore `services/**/.env*` |
| `scripts/ci-check-jwt-secret.sh` | ✅ Check NO service-level `.env*` |

### 3.4. Done (24/08/2026 — Fix v3.1: Java auto-load root `.env`)

| File | Change |
|------|--------|
| `libs/common-core/.../MonorepoDotEnvInitializer.java` | ✅ MỚI — `ApplicationContextInitializer` walk-up tìm `.env.example`, parse `.env`, push vào Spring env |
| `libs/common-core/src/main/resources/META-INF/spring.factories` | ✅ MỚI — Spring Boot 2.x SPI |
| `libs/common-core/src/main/resources/META-INF/spring/...imports` | ✅ MỚI — Spring Boot 3.x SPI |
| `libs/common-core/pom.xml` | ✅ Thêm `spring-boot` (optional) |

**Verify:** `mvn -pl services/api-gateway spring-boot:run` → log
```
c.i.c.config.MonorepoDotEnvInitializer : Loaded 170 entries from monorepo .env (root: /home/minhdao/projects/team/AiProject). PropertySource: monorepoDotEnv.
```
→ `Started ApiGatewayApplication in 2.367 seconds` ✅

### 3.5. Pending (Sprint tiếp theo)

| Task | Owner | Sprint |
|------|-------|--------|
| Verify `content-service`, `notification-service`, `analytics-service` không tạo `.env` riêng | Java Lead | Sprint 8 |
| Apply `requiredSecret` cho `POSTGRES_PASSWORD`, `STORAGE_*_KEY` ở tất cả Node.js services | Node Lead | Sprint 8 |
| Thêm CI check cho tất cả secrets khác (không chỉ JWT) | DevOps | Sprint 9 |
| Integration test gateway ↔ auth-service (Testcontainers) | QA | Sprint 8 |
| Migrate HS256 → RS256 với JWKS (per ADR-006 §2.3) | Auth Lead | Sprint 10 |

---

## 4. Alternatives Considered

| Phương án | Lý do loại |
|----------|-----------|
| **Mỗi service random secret + asymmetric (RS256)** | Đúng long-term nhưng chưa đủ bandwidth Sprint 8. HS256 vẫn OK cho giai đoạn MVP. |
| **JWT_SECRET hard-coded trong source** | Insecure, vi phạm NFR-005 |
| **Default fallback với warning comment** | Vẫn leak qua source. Incident v1 đã chứng minh. |
| **JWT introspection (gọi auth-service mỗi request)** | Thêm latency, vi phạm NFR-004 (availability) |

---

## 5. Test Strategy

| Test | Purpose |
|------|---------|
| **Unit: app start với thiếu `JWT_SECRET` env** | Expect throw rõ ràng (fail-fast) |
| **Integration: auth-service → gateway** | Issue token ở auth-service, gọi qua gateway, expect 200 |
| **Integration: gateway với wrong secret** | Verify reject 401 |
| **E2E: full exam flow** | Login (auth) → call exam endpoint (gateway) → 200 |
| **CI gate `ci-check-jwt-secret.sh`** | Block merge nếu có default fallback hoặc secret mismatch |

CI gate (must-pass):
```bash
# 1. Không service nào có default fallback cho jwt.secret
# 2. Tất cả services load từ ${JWT_SECRET} hoặc requiredSecret('JWT_SECRET')
# 3. Tất cả .env* files có cùng JWT_SECRET value
# 4. env JWT_SECRET là set trong CI cho integration tests
```

---

## 6. Consequences

### 6.1. Positive

- **Không có default fallback = không có leak qua source**
- Mọi service verify JWT thành công với cùng secret
- Rotation dễ dàng qua K8s Secret
- Fail-fast: thiếu config = lỗi rõ ràng tại startup, không silent bug

### 6.2. Negative

- **Dev phải copy `.env.example` → `.env` trước khi chạy local.** Có thể gây friction cho dev mới.
- Nếu secret leak → mọi service compromised (mitigation: rotate mỗi 90 ngày, RS256 trong tương lai)
- HS256 không scale cho multi-tenant hoặc cross-org (RS256 sẽ fix)

### 6.3. Risks

- **Dev quên copy `.env`** → app fail tại startup với lỗi rõ ràng → dễ fix.
- **CI/CD quên inject secret** → integration test fail → dễ phát hiện.
- **Một service override default khác** → BLOCKED bởi CI script.

---

## 7. References

- [BA §3.1.1 — Auth Module](../../01-business/BA_DOCUMENT.md)
- [BA §7.4 — Security Requirements](../../01-business/BA_DOCUMENT.md)
- [PROJECT_RULES.md §6.1.1 — JWT Secret Synchronization](../../01-business/PROJECT_RULES.md)
- [configuration-guide.md §7.5 — Shared Secrets](../../04-operations/configuration-guide.md)
- [Post-mortem 2026-08-24](../../04-operations/post-mortems/2026-08-24-gateway-jwt-and-timeout.md)
- [Spring Boot Externalized Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
- [12-Factor App: Config](https://12factor.net/config)

---

**Version:** 1.1
**Last updated:** 24/08/2026 (v1.1: NO DEFAULT FALLBACK rule)