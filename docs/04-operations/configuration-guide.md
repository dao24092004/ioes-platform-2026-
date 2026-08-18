# IOES Configuration Guide

Hướng dẫn cấu hình cho toàn bộ platform IOES.

## Bản đồ config

```
┌────────────────────────────────────────────────────────────────────────────┐
│  .env (root)        — Infrastructure (DBs, Redis, Kafka, OAuth, LLM, …)    │
├────────────────────────────────────────────────────────────────────────────┤
│  Config Server      — services/config-server/src/main/resources/config/*  │
│                       (Spring Cloud Config — single source of truth)       │
├────────────────────────────────────────────────────────────────────────────┤
│  Per-service configs                                                     │
│  ├── Java:    src/main/resources/application.yml + application-{profile}.yml │
│  ├── Node.js: .env + src/config/app.config.ts                            │
│  └── Python:  .env + src/<svc>/core/config.py (pydantic-settings)         │
└────────────────────────────────────────────────────────────────────────────┘
```

## 1. Root `.env`

`/home/minhdao/projects/team/AiProject/.env` (copy từ `.env.example`).

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

## 3. Node.js services (exam-suite, blockchain-suite, ai-suite/api-gateway)

**Cấu trúc:**

```
.env.example
.env                  # gitignored, dev only
src/config/
├── app.config.ts     # Typed loader (required, int, bool, list)
├── database.config.ts
├── kafka.config.ts
└── ...
```

**Cách dùng:**

```typescript
import { appConfig, dbConfig } from './config/app.config';

await NestFactory.create(AppModule); // somewhere
console.log(`Listening on ${appConfig.port}`);
```

**Loader tự động:**

- Đọc `.env` nếu có (dev)
- Fallback về env vars khi deploy (Kubernetes/Docker)
- Throw error khi production mà thiếu biến required

**Config Server fetch (Node.js):**

Khác với Java, Node.js services **không tự fetch** từ Config Server. Hai lựa chọn:

1. **Mount file YAML qua Volume** (Kubernetes ConfigMap / Secret)
2. **Gọi REST `/actuator/configprops`** lúc boot và parse về

Khuyến nghị cho exam-suite / blockchain-suite: chạy với env vars injected từ Kubernetes Secret, KHÔNG qua Config Server.

## 4. Python services (ml-worker, ocr-service, speech-service)

**Cấu trúc:**

```
.env.example
.env
pyproject.toml
src/<svc>/
├── core/
│   └── config.py        # Pydantic-settings BaseServiceSettings subclass
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

Pydantic-settings tự đọc:
1. Env vars
2. File `.env`
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

## 8. Validation

Mỗi service có `.env.example` ở root của nó:
- `services/auth-service/.env.example` (nếu cần override)
- `services/exam-suite/.env.example`
- `services/blockchain-suite/.env.example`
- `services/ai-suite/ml-worker/.env.example`
- `services/ai-suite/ocr-service/.env.example`
- `services/ai-suite/speech-service/.env.example`

Mỗi Node.js service có **schema validation** trong `app.config.ts` (function `required`, `int`, `bool`, `list`).

Mỗi Python service dùng **pydantic** để validate types.

Java services dùng `@ConfigurationProperties` + `spring-boot-starter-validation` (đã include sẵn qua `common-library`).

## 9. Tóm tắt file đã tạo / cập nhật

### Java
- `services/{auth,notification,api-gateway,discovery,config-server}-service/src/main/resources/application-{local,staging,prod}.yml`
- `libs/common-library/src/main/resources/logback-spring.xml`

### Node.js
- `services/exam-suite/.env.example` + `src/config/app.config.ts`
- `services/blockchain-suite/.env.example` + `src/config/app.config.ts`
- `services/exam-suite/Dockerfile` (đã có sẵn)
- `services/blockchain-suite/Dockerfile` + `.dockerignore`

### Python
- `services/ai-suite/ml-worker/.env.example`
- `services/ai-suite/ml-worker/src/ml_worker/core/config.py` (cập nhật)
- `services/ai-suite/ml-worker/Dockerfile` (cập nhật) + `.dockerignore`
- `services/ai-suite/ocr-service/Dockerfile` + `.dockerignore` + `pyproject.toml`
- `services/ai-suite/speech-service/Dockerfile` + `.dockerignore` + `pyproject.toml`

### Config Server
- `services/config-server/src/main/resources/config/blockchain-suite.yml`
- `services/config-server/src/main/resources/config/{exam-suite,ai-suite,blockchain-suite}-{local,prod}.yml`

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
