# 🔧 DevOps Scripts

Utility scripts cho development và deployment.

## Cấu trúc

| Thư mục | Mục đích |
|---------|----------|
| [setup/](./setup/) | Install dependencies, setup dev env, git hooks |
| [build/](./build/) | Build all, build frontend, build backend, build images |
| [deploy/](./deploy/) | Deploy dev/staging/prod, rollback |
| [monitoring/](./monitoring/) | Health check, tail logs, metrics |
| [data/](./data/) | Backup, restore, migrate, seed |
| [utils/](./utils/) | Port check, clean docker, update deps |

## 🚨 CI Checks (chạy trước khi merge PR)

| Script | Mục đích | Liên quan |
|--------|----------|-----------|
| `ci-check-jwt-secret.sh` | Verify JWT secret sync across services | [ADR-008](../02-architecture/adr/ADR-008-jwt-secret-synchronization.md) |
| `ci-check-gateway-config.sh` | Verify Gateway timeouts + 503 fallback | [ADR-009](../02-architecture/adr/ADR-009-gateway-timeouts-and-circuit-breaker.md) |

```bash
make ci-check-config      # chạy tất cả CI checks
make ci-check-jwt         # chỉ JWT
make ci-check-gateway     # chỉ Gateway
```

## Status

⚠️ _Sẽ được triển khai trong Sprint 0._

## Note

File `Makefile` hiện đang ở root của repo và cung cấp shortcut cho các scripts này. Khi triển khai, các scripts shell/Python sẽ được đặt trong các thư mục con tương ứng.
