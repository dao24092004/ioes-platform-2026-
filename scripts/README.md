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

## Status

⚠️ _Sẽ được triển khai trong Sprint 0._

## Note

File `Makefile` hiện đang ở root của repo và cung cấp shortcut cho các scripts này. Khi triển khai, các scripts shell/Python sẽ được đặt trong các thư mục con tương ứng.
