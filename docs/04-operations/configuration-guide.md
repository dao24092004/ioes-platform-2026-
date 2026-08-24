# IOES Configuration Guide

Hướng dẫn cấu hình cho toàn bộ platform IOES.

> **🚨 QUY TẮC BẮT BUỘC (24/08/2026 — ADR-008 v1.2):**
> **.env.example ở ROOT là SINGLE SOURCE OF TRUTH duy nhất.**
> KHÔNG ĐƯỢC tạo `services/<svc>/.env.example` riêng.
> Mọi service (Java, Node.js, Python) PHẢI load từ root `.env`.

## Bản đồ config

```
┌────────────────────────────────────────────────────────────────────────────┐
│  .env.example (root)        — SINGLE SOURCE OF TRUTH (commit vào repo)     │
│  .env (root)                — Local dev (gitignored, copy từ .env.example) │
├────────────────────────────────────────────────────────────────────────────┤
│  Config Server (Java)       — services/config-server/src/main/resources/*  │
│                                (Spring Cloud Config cho Java services)     │
├────────────────────────────────────────────────────────────────────────────┤
│  Per-service code (KHÔNG có .env riêng)                                    │
│  ├── Java:    application.yml + application-{profile}.yml  (ref env)       │
│  ├── Node.js: src/config/app.config.ts (auto-detect root .env)             │
│  └── Python:  src/<svc>/core/config.py (pydantic-settings, env_file=root) │
└────────────────────────────────────────────────────────────────────────────┘
```

## 1. Root `.env` (single source of truth)

`/home/minhdao/projects/team/AiProject/.env.example` (commit) → copy thành `.env` (gitignored).

Dùng cho:
- `docker-compose up` (postgres, redis, kafka, mailhog, jaeger, prometheus…)
- Bash scripts (seed DB, migration)
- Đọc bởi các service qua `${VAR_NAME}` trong `application.yml`

Phân nhóm biến trong `.env.example`:

| Nhóm | Mục đích |
|---|---|
| `POSTGRES_*`, `AUTH_DB_NAME`, … | DB per-service |
| `REDIS_*` | Redis cache / lock |
| `KAFKA_*` | Kafka broker + topic names |
| `MINIO_*` | Object storage (S3-compatible) |
| `MILVUS_*` | Vector DB cho AI |
| `JWT_*` | JWT secret + TTL |
| `OAUTH2_*` | OAuth providers |
| `MAIL_*` | SMTP |
| `LLM_*`, `OPENAI_*`, `AZURE_OPENAI_*` | AI provider |
| `BLOCKCHAIN_*`, `IPFS_*` | Web3 |
| `CORS_*`, `API_GATEWAY_*` | Cross-cutting |

## 2. Java services (auth, content, notification, analytics, exam-service Java nếu có)

**Cấu trúc:**

```
src/main/resources/
├── application.yml             # Default — common base
├── application-local.yml       # Local dev overrides
├── application-staging.yml     # Staging
└── application-prod.yml        # Production
```

**Kích hoạt profile:**

```bash
# Local
java -jar auth-service.jar --spring.profiles.active=local

# Staging
java -jar auth-service.jar --spring.profiles.active=staging

# Production
java -jar auth-service.jar --spring.profiles.active=prod
```

Khi `spring.profiles.active` set, file tương ứng được load **đè lên** `application.yml`.

**Config Server (Spring Cloud Config):**

Trong `application.yml`:

```yaml
spring:
  cloud:
    config:
      uri: http://config-server:8888
      name: auth-service
      profile: ${spring.profiles.active}
      fail-fast: false
```

Service tự fetch file `<name>-<profile>.yml` từ Config Server.

Service đặt **default** trong `application.yml` và **override** trong `application-{profile}.yml`.

## 3. Node.js services (exam-suite, blockchain-suite)

> **🚨 KHÔNG tạo `services/<svc>/.env` hoặc `.env.example` riêng (24/08/2026 — ADR-008).**
> Tất cả config ở root `.env.example` (single source of truth).

**Cấu trúc:**

```
# KHÔNG CÓ .env.example trong services/<svc>/
# Mọi config đặt ở root .env.example

services/<svc>/
├── src/
│   ├── main.ts
│   └── config/
│       └── app.config.ts     # Auto-detect root .env (findMonorepoRoot)
└── ...
```

**Cách dùng:**

```typescript
// services/exam-suite/src/config/app.config.ts
// Auto-loads root .env via findMonorepoRoot()

import { jwtConfig, dbConfig } from './config/app.config';
console.log(`Listening on ${appConfig.port}`);
```

**Loader tự động (24/08/2026 v1.2):**

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

function loadDotEnv(): void {
  const monorepoRoot = findMonorepoRoot(process.cwd());
  const envPath = resolve(monorepoRoot, '.env');
  // Load envPath content vào process.env (existing env wins)
}
```

Resolution order (priority cao → thấp):
1. Existing env var (set bởi orchestrator/K8s)
2. Root `.env` (load lúc startup)
3. Fallback trong code (cho non-secret values)

**Config Server fetch (Node.js):**

Khác với Java, Node.js services **không tự fetch** từ Config Server. Hai lựa chọn:

1. **Mount file YAML qua Volume** (Kubernetes ConfigMap / Secret)
2. **Gọi REST `/actuator/configprops`** lúc boot và parse về

Khuyến nghị cho exam-suite / blockchain-suite: chạy với env vars injected từ K8s Secret hoặc load từ root `.env` qua docker-compose, KHÔNG qua Config Server.

## 4. Java services (api-gateway, auth-service, content-service, notification-service, analytics-service)

> **🚨 KHÔNG tạo `services/<svc>/.env` riêng.** Tất cả ở root `.env.example`.

### 4.1. Auto-load root `.env` qua MonorepoDotEnvInitializer

Java services không tự load `.env` (không như Node.js / Python). Để giữ
**single source of truth** thống nhất với các stack khác, mọi service Java
mà depend `libs/common-core` đều pick up một `ApplicationContextInitializer`:

```java
// libs/common-core/src/main/java/com/ioes/common/config/MonorepoDotEnvInitializer.java
public class MonorepoDotEnvInitializer
        implements ApplicationContextInitializer<ConfigurableApplicationContext> {
    // Walk up từ user.dir tìm .env.example → monorepo root
    // Đọc <root>/.env và push vào Spring Environment
    // Honor OS env / JVM sysprop precedence (không overwrite)
}
```

**Registration qua SPI (auto-pickup, không cần edit main):**
```
libs/common-core/src/main/resources/
├── META-INF/spring.factories
│   org.springframework.context.ApplicationContextInitializer=\
│   com.ioes.common.config.MonorepoDotEnvInitializer
└── META-INF/spring/org.springframework.context.ApplicationContextInitializer.imports
    com.ioes.common.config.MonorepoDotEnvInitializer
```

### 4.2. Parsing rules (mirror `dotenv` package)

| Pattern | Result |
|---------|--------|
| `KEY=value` | `value` |
| `KEY="value"` | `value` (strip quotes) |
| `KEY='value'` | `value` (strip quotes) |
| `KEY=value # comment` | `value` (strip inline comment) |
| `KEY="value#literal"` | `value#literal` (don't strip inside quotes) |
| ` # comment line` | skip |
| empty line | skip |
| `=` without key | skip |
| `JWT_SECRET=...` (already in OS env) | use OS env, don't file |

### 4.3. Cách dùng

Trong `application.yml` reference env var như bình thường:

```yaml
jwt:
  secret: ${JWT_SECRET}
```

Initializer đã load `JWT_SECRET` từ root `.env` trước khi Spring resolve placeholder.
KHÔNG cần restart workflow nào; chỉ cần `cp .env.example .env` ở root 1 lần.

### 4.4. Production (Kubernetes / Vault)

In production, orchestrator inject env vars trực tiếp vào JVM
(`K8s Secret → env → Pod`). Initializer phát hiện đã có env var → skip file
→ không overwrite. Giữ precedence an toàn.

### 4.5. Production override

Nếu cần force một giá trị cụ thể cho 1 service:

```bash
JWT_SECRET=override_value mvn spring-boot:run
# → Initializer thấy System.getenv("JWT_SECRET") != null
# → không load từ .env
# → Spring đọc "override_value"
```

## 5. Python services (ml-worker, ocr-service, speech-service)

> **🚨 KHÔNG tạo `services/ai-suite/<svc>/.env` riêng.** Tất cả ở root `.env.example`.

**Cấu trúc:**

```
services/ai-suite/<svc>/
├── pyproject.toml
└── src/<svc>/
    ├── core/
    │   └── config.py   # Pydantic-settings, auto-load root .env
    └── main.py
```

**Cách dùng:**

```python
from functools import lru_cache
from ioes_common.config import BaseServiceSettings

class MLSettings(BaseServiceSettings):
    model_device: str = "cpu"
    batch_size: int = 32

@lru_cache
def get_settings() -> MLSettings:
    return MLSettings()
```

**Pydantic-settings tự đọc (24/08/2026 v1.2):**

```python
# libs/common-python/src/ioes_common/config.py
def _find_monorepo_root() -> Path:
    """Find monorepo root by looking for .env.example going up the tree."""
    cwd = Path.cwd()
    for parent in [cwd, *cwd.parents]:
        if (parent / ".env.example").exists():
            return parent
    return cwd

MONOREPO_ROOT = _find_monorepo_root()
ROOT_ENV_FILE = MONOREPO_ROOT / ".env"

class BaseServiceSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_ENV_FILE) if ROOT_ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        ...
    )
```

Resolution order:
1. Env vars (highest priority)
2. Root `.env` (auto-detected)
3. Defaults trong class

## 5. Logging

| Stack | Format | Config |
|---|---|---|
| Java | PatternLayout (có traceId) | `libs/common-library/src/main/resources/logback-spring.xml` |
| Node.js | JSON (pino) hoặc Console | `services/<svc>/src/logging.ts` |
| Python | JSON (structlog) | `ioes_common.logging.configure_logging` |

Override level qua `LOG_LEVEL=DEBUG|INFO|WARNING|ERROR`.

## 6. Health endpoints

Mỗi service expose `/health` (hoặc `/actuator/health`):

```yaml
# Java
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      probes:
        enabled: true
```

Docker HEALTHCHECK dùng `wget --spider http://localhost:<port>/health`.

Kubernetes livenessProbe / readinessProbe:

```yaml
livenessProbe:
  httpGet: { path: /actuator/health/liveness, port: 9000 }
  initialDelaySeconds: 30
  periodSeconds: 10
readinessProbe:
  httpGet: { path: /actuator/health/readiness, port: 9000 }
  initialDelaySeconds: 10
  periodSeconds: 5
```

## 7. Secrets management

**Không commit secrets thật vào git.**

Development:
- Lưu trong `.env` (gitignored)
- Mỗi service có `.env.example` liệt kê key + placeholder

Production:
- Kubernetes: dùng Sealed Secrets / External Secrets Operator / HashiCorp Vault
- Inject vào Pod qua `envFrom: secretRef:`

## 7.5. 🚨 Shared Secrets (JWT) — BẮT BUỘC đồng bộ

> **Tại sao section này quan trọng:** Incident ngày 24/08/2026 cho thấy `api-gateway` và `auth-service` đang dùng 2 secret khác nhau → mọi request cần token đi qua gateway đều bị reject. Fix v1 đồng bộ default fallback nhưng vẫn leak secret qua source. **Fix v2 (24/08/2026):** loại bỏ hoàn toàn default fallback. Chi tiết trong [ADR-008](../02-architecture/adr/ADR-008-jwt-secret-synchronization.md).

**Quy tắc vàng (NO DEFAULT FALLBACK):**

> **Mọi secret (JWT_SECRET, password, API keys) PHẢI load trực tiếp từ biến môi trường. KHÔNG ĐƯỢC phép default fallback trong code/config.**

**Lý do:**
1. **Security:** default trong source = leak qua git. Attacker có thể scan public repo hoặc internal repo bị compromised.
2. **Cross-service consistency:** nếu 2 service có default khác nhau → silent bug (incident #1).
3. **Fail-fast principle:** thiếu config = lỗi rõ ràng tại startup, dễ debug hơn silent bug tại runtime.

### Setup `.env` ở root (single source of truth)

Mọi biến secret được define ở `.env.example` (root):

```bash
# .env.example (root)
JWT_SECRET=conghoaxahoichunghiavietnamdoclaptudohanhphuc-2-9-1975
POSTGRES_PASSWORD=your_db_password_here
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
# ...
```

**Workflow dev:**
1. `cp .env.example .env` ở root (chỉ cần làm 1 lần)
2. Mọi service (Node.js + Python + Java) tự động load root `.env` qua:
   - Node.js: `findMonorepoRoot()` trong `src/config/app.config.ts`
   - Python: `MONOREPO_ROOT = _find_monorepo_root()` trong `libs/common-python/.../config.py`
   - Java: Spring Boot tự đọc env vars (không cần file `.env` riêng)

**Workflow prod:**
- Inject qua Kubernetes Secret / Vault → env vars cho Pod.
- KHÔNG commit file `.env` thật vào git (đã có `.gitignore` ignore).

### Java services (auth-service, api-gateway, content-service, notification-service, analytics-service)

Mọi service PHẢI có block sau trong `application.yml`:

```yaml
jwt:
  # NO DEFAULT FALLBACK — must be provided via JWT_SECRET env
  secret: ${JWT_SECRET}
  access-token-expiration: ${JWT_ACCESS_TOKEN_EXPIRATION:900000}
  refresh-token-expiration: ${JWT_REFRESH_TOKEN_EXPIRATION:604800000}
  issuer: ${JWT_ISSUER:ioes-platform}
```

**Quan trọng:** `${JWT_SECRET}` KHÔNG có `:` default. Nếu env var không set → Spring throw `IllegalArgumentException: Could not resolve placeholder 'jwt.secret'` tại startup.

### Java backend library (`libs/common-jwt`)

`JwtTokenProvider.java` PHẢI dùng:

```java
@Value("${jwt.secret}")  // ← NO DEFAULT
private String jwtSecret;
```

### Node.js services (exam-suite, blockchain-suite)

Tạo helper `requiredSecret()` trong `src/config/app.config.ts`:

```typescript
function requiredSecret(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(
      `❌ Missing required secret: ${key}\n` +
      `Set it in .env (dev) hoặc K8s Secret / Vault (prod).`
    );
  }
  return value;
}

export const jwtConfig = {
  secret: requiredSecret('JWT_SECRET'),  // ← NO DEFAULT
  algorithm: required('JWT_ALGORITHM', 'HS256'),  // default OK (not secret)
  expireMinutes: int('JWT_EXPIRE_MINUTES', 60),
};

// Cũng apply cho các secret khác:
export const dbConfig = {
  // ...
  password: requiredSecret('POSTGRES_PASSWORD'),  // ← NO DEFAULT
};

export const storageConfig = {
  // ...
  accessKey: requiredSecret('STORAGE_ACCESS_KEY'),  // ← NO DEFAULT
  secretKey: requiredSecret('STORAGE_SECRET_KEY'),  // ← NO DEFAULT
};
```

### Python services (ai-suite/ml-worker, ocr-service, speech-service)

`libs/common-python/src/ioes_common/config.py` dùng `Field(...)`:

```python
class BaseServiceSettings(BaseSettings):
    # NO DEFAULT — must be provided via JWT_SECRET env
    jwt_secret: str = Field(...)  # required
    jwt_algorithm: str = "HS256"  # default OK (not secret)
```

### Production checklist

Trước khi deploy:
- [ ] `JWT_SECRET` được set qua K8s Secret/Vault với giá trị KHÁC default (KHÔNG dùng `conghoaxahoichunghiavietnamdoclaptudohanhphuc-2-9-1975`)
- [ ] Tất cả services restart theo thứ tự: `auth-service` → `api-gateway` → downstream
- [ ] Integration test `gateway ↔ auth-service` pass
- [ ] Prometheus alert `jwt_secret_mismatch` không trigger

### CI check (block merge nếu fail)

```bash
make ci-check-jwt
# = scripts/ci-check-jwt-secret.sh
```

CI script enforce:
- Tất cả Java services: `${JWT_SECRET}` KHÔNG có `:default`
- `JwtTokenProvider.java`: `@Value("${jwt.secret}")` KHÔNG có default
- Python `BaseServiceSettings`: `jwt_secret: str = Field(...)`
- Node.js services: `requiredSecret('JWT_SECRET')`
- Tất cả `.env*` files có cùng `JWT_SECRET` value

## 7.6. 🚨 API Gateway Timeouts & Circuit Breaker

> **Tại sao section này quan trọng:** Incident 24/08/2026 — global `CircuitBreaker` filter trên gateway tự ngắt mọi request > 1s dù downstream đã reply OK. Chi tiết trong [ADR-009](../02-architecture/adr/ADR-009-gateway-timeouts-and-circuit-breaker.md).

**Quy tắc vàng:**
> **KHÔNG bật global `CircuitBreaker` filter trên Gateway. Mỗi route cần resilience PHẢI declare explicit.**

### Gateway defaults (đã fix ngày 24/08/2026)

```yaml
# services/api-gateway/src/main/resources/application.yml
spring.cloud.gateway.httpclient:
  connect-timeout: 5000   # 5s
  response-timeout: 30s   # 30s (không để mặc định = unlimited)
  max-idle-time: 60s

spring.cloud.gateway.default-filters:
  - DedupeResponseHeader=Access-Control-Allow-Origin Access-Control-Allow-Credentials, RETAIN_UNIQUE
  - name: Retry             # ← CHỈ Retry, KHÔNG CircuitBreaker global
    args:
      retries: 3
      statuses: BAD_GATEWAY,SERVICE_UNAVAILABLE,GATEWAY_TIMEOUT
      backoff:
        firstBackoff: 100ms
        maxBackoff: 500ms
        factor: 2
```

### Per-route Circuit Breaker (khi cần)

Chỉ bật cho routes có downstream flaky (vd: AI inference, blockchain RPC):

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
```

### Fallback response contract

`FallbackController` PHẢI trả:
- HTTP status `503 Service Unavailable` (KHÔNG 200)
- Body JSON: `{ success: false, message: "...", data: { reason, timestamp }, timestamp }`
- `Content-Type: application/json`

### Checklist khi thêm route mới vào gateway

- [ ] Có config `connect-timeout` / `response-timeout` ở route-level nếu cần custom
- [ ] Nếu downstream flaky → thêm per-route `CircuitBreaker` với `failureRateThreshold` rõ ràng
- [ ] Nếu có per-route CB → update Grafana dashboard
- [ ] Test với slow downstream (3s response) → expect 200 (không phải 503)
- [ ] Test với down downstream → expect 503 + JSON metadata

## 8. Validation

> **🚨 Từ 24/08/2026 (ADR-008 v1.2):** KHÔNG có `.env.example` trong từng service. Tất cả ở root `.env.example`.

**Quy tắc SINGLE SOURCE OF TRUTH:**

| Stack | Validation source |
|-------|-------------------|
| **Java** | `application.yml` + `application-{profile}.yml` (ref env vars). KHÔNG cần `.env`. |
| **Node.js** | `src/config/app.config.ts` — typed loader (`required`, `requiredSecret`, `int`, `bool`, `list`, `prefixed`) |
| **Python** | Pydantic-settings trong `libs/common-python/.../config.py` — auto load root `.env` |

**Schema validation:**
- Node.js: helpers `required`, `requiredSecret` (ADR-008 — no default), `int`, `bool`, `list`, `prefixed` trong `app.config.ts`
- Python: Pydantic `Field(...)` cho required fields
- Java: `@Value("${...}")` với no default; throw nếu env missing

**Auto-detect root `.env`:**
- Node.js: `findMonorepoRoot()` đi lên cây thư mục tìm `.env.example`
- Python: `_find_monorepo_root()` cùng logic

**Mọi thay đổi config:**
- Sửa `.env.example` ở root
- Sửa `.env` ở root (copy từ `.env.example`)
- KHÔNG tạo file ở `services/<svc>/.env*`

Java services dùng `@ConfigurationProperties` + `spring-boot-starter-validation` (đã include sẵn qua `common-library`).

## 9. Tóm tắt file đã tạo / cập nhật

### Root `.env.example` (single source of truth)

> **🚨 KHÔNG tạo `services/<svc>/.env` hoặc `.env.example`. Mọi thứ ở đây.**

- `.env.example` (root) — template (commit)
- `.env` (root) — dev override (gitignored)

### Java
- `services/{auth,notification,api-gateway,discovery,config-server}-service/src/main/resources/application-{local,staging,prod}.yml`
- `libs/common-library/src/main/resources/logback-spring.xml`

### Node.js
- `services/exam-suite/src/config/app.config.ts` (auto-detect root `.env`)
- `services/blockchain-suite/src/config/app.config.ts` (auto-detect root `.env`)
- `services/exam-suite/Dockerfile` (đã có sẵn)
- `services/blockchain-suite/Dockerfile` + `.dockerignore`

### Python
- `services/ai-suite/ml-worker/src/ml_worker/core/config.py` (auto-detect root `.env` qua `libs/common-python/.../config.py`)
- `services/ai-suite/ml-worker/Dockerfile` (cập nhật) + `.dockerignore`
- `services/ai-suite/ocr-service/Dockerfile` + `.dockerignore` + `pyproject.toml`
- `services/ai-suite/speech-service/Dockerfile` + `.dockerignore` + `pyproject.toml`

### Config Server
- `services/config-server/src/main/resources/config/blockchain-suite.yml`
- `services/config-server/src/main/resources/config/{exam-suite,ai-suite,blockchain-suite}-{local,prod}.yml`

### 24/08/2026 — Cleanup (ADR-008 v1.2)
- ❌ Removed: `services/exam-suite/.env.example`
- ❌ Removed: `services/blockchain-suite/.env.example`
- ❌ Removed: `services/ai-suite/ml-worker/.env.example`
- ✅ Updated: `.env.example` thêm per-service vars (EXAM_*, BLOCKCHAIN_*, ML_*, ...)
- ✅ Updated: `app.config.ts` (Node.js) — dùng `prefixed()` helper cho `<SERVICE>_*` keys
- ✅ Updated: `config.py` (Python common) — auto-detect root `.env`
- ✅ Updated: `.gitignore` — ignore `services/**/.env*`

## 10. Lệnh khởi động nhanh

```bash
# 1. Copy env
make .env

# 2. Start infra
make docker-up

# 3. Run common library tests
mvn -pl libs/common-library -am test

# 4. Run a service
cd services/auth-service
mvn spring-boot:run -Dspring-boot.run.profiles=local

# 5. Run exam-suite
cd services/exam-suite && pnpm dev

# 6. Run ml-worker
cd services/ai-suite/ml-worker && poetry run uvicorn src.ml_worker.main:app --reload
```

Xem chi tiết tại `Makefile` (`make help`).
