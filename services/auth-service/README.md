# 🔐 Auth Service

> **Authentication & Authorization service cho IOES**
> Tech: Java 17 + Spring Boot 3 + JWT + OAuth2

## 📋 TỔNG QUAN Nhanh

**Auth Service** chịu trách nhiệm:
- Đăng ký / Đăng nhập user
- JWT token generation & validation
- OAuth2 (Google, GitHub, Microsoft)
- Role-based access control (RBAC)
- Password reset & MFA
- Session management

**Port:** 9000
**Database:** PostgreSQL (`ioes_auth`)
**Owner:** `backend-java@ioes.com`

## 🏗️ KIẾN TRÚC (Hexagonal)

```
auth-service/
├── src/main/java/com/ioes/auth/
│   ├── domain/              # Pure business logic
│   │   ├── model/           # User, Role, Permission, Session
│   │   ├── event/           # UserRegistered, UserLoggedIn
│   │   └── exception/       # InvalidCredentials, UserBanned
│   │
│   ├── application/         # Use cases
│   │   ├── usecase/         # LoginUseCase, RegisterUseCase
│   │   ├── port/            # UserRepository, TokenService
│   │   └── dto/             # LoginRequest, AuthResponse
│   │
│   ├── infrastructure/      # Adapters
│   │   ├── persistence/     # JPA repositories
│   │   ├── security/        # JWT, OAuth2 providers
│   │   └── kafka/           # Event publisher
│   │
│   ├── interfaces/          # Inbound
│   │   └── rest/            # AuthController, UserController
│   │
│   └── config/              # Spring config
│
├── src/main/resources/
│   ├── application.yml
│   └── db/migration/        # Flyway migrations
│
└── src/test/java/           # Tests
```

## 🚀 QUICK START

```bash
# Prerequisites
- Java 17
- Docker (for PostgreSQL)

# 1. Start dependencies
docker-compose up -d postgres redis kafka

# 2. Run migrations
make migrate-auth

# 3. Start service
cd services/auth-service
mvn spring-boot:run

# 4. Verify
curl http://localhost:9000/actuator/health
# → {"status":"UP"}

# 5. API docs
open http://localhost:9000/swagger-ui.html
```

## 📡 API ENDPOINTS

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/v1/auth/register` | ❌ | Đăng ký tài khoản |
| `POST` | `/api/v1/auth/login` | ❌ | Đăng nhập |
| `POST` | `/api/v1/auth/refresh` | Refresh Token | Refresh access token |
| `POST` | `/api/v1/auth/logout` | Access Token | Đăng xuất |
| `POST` | `/api/v1/auth/forgot-password` | ❌ | Quên mật khẩu |
| `POST` | `/api/v1/auth/reset-password` | Reset Token | Reset mật khẩu |
| `GET`  | `/api/v1/auth/oauth/{provider}` | ❌ | OAuth2 login redirect |
| `GET`  | `/api/v1/auth/me` | Access Token | Thông tin user hiện tại |
| `POST` | `/api/v1/auth/enable-mfa` | Access Token | Bật MFA |
| `POST` | `/api/v1/auth/verify-mfa` | Access Token | Verify MFA code |

**Swagger:** http://localhost:9000/swagger-ui.html

## 📚 TÀI LIỆU QUAN TRỌNG

| Tài liệu | Mục đích |
|----------|----------|
| [Java Style Guide](../../docs/03-development/coding-standards/java-styleguide.md) | **BẮT BUỘC đọc** |
| [Service Boundaries](../../docs/02-architecture/service-boundaries.md) | Quy tắc microservices |
| [PROJECT_RULES.md](../../docs/01-business/PROJECT_RULES.md) | Master rules |
| [Testing Strategy](../../docs/03-development/testing-strategy.md) | Test pyramid |

## ⚙️ ENVIRONMENT VARIABLES

```bash
# Required
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ioes_auth
DB_USER=ioes
DB_PASSWORD=secret

JWT_SECRET=your-256-bit-secret
JWT_ACCESS_TTL=900              # 15 minutes
JWT_REFRESH_TTL=604800          # 7 days

# OAuth2
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Kafka
KAFKA_BROKERS=localhost:9092

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

Xem tất cả: [`.env.example`](../../.env.example)

## 🧪 TESTING

```bash
# Unit tests
mvn test

# Integration tests (Testcontainers)
mvn verify

# Coverage report
mvn test jacoco:report
open target/site/jacoco/index.html
```

**Coverage target:** 95% (critical path)

## 🐛 TROUBLESHOOTING

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| `JWT signature does not match` | JWT_SECRET thay đổi | Restart service sau khi set env |
| `Connection refused: 5432` | Postgres chưa chạy | `docker-compose up -d postgres` |
| `Migration failed` | Schema conflict | Check `database/migrations/auth/` |
| `OAuth2 redirect failed` | Callback URL sai | Check `application.yml` |

## 📞 LIÊN HỆ

- **Owner:** Backend Java Lead
- **Slack:** `#ioes-dev`
- **Email:** `backend-java@ioes.com`

---

**Version:** 0.1.0
**Last updated:** 12/08/2026
