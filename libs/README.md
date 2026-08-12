# 📦 Shared Libraries

3 common libraries được share giữa các services.

| Library | Tech | Mục đích | Sử dụng bởi |
|---------|------|----------|-------------|
| [common-library/](./common-library/) | Java 17 + Spring Boot 3 | DTOs, exceptions, JWT, Kafka helpers | Tất cả Java services |
| [common-node/](./common-node/) | Node.js + TypeScript + NestJS | Filters, guards, decorators, Kafka | Tất cả Node.js services |
| [common-python/](./common-python/) | Python 3.11 + Pydantic | Schemas, OpenTelemetry, utils | Tất cả Python services |

## Mục đích

- **DRY:** Tránh duplicate code giữa các services
- **Consistency:** Đảm bảo cùng 1 cách xử lý error, logging, tracing
- **Reusability:** Common utilities tái sử dụng

## Status

⚠️ _Sẽ được triển khai trong Sprint 0-1._
