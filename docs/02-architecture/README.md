# 🏗️ Architecture Documentation

Tài liệu kiến trúc hệ thống.

## Cấu trúc

| Thư mục | Nội dung |
|---------|----------|
| [adr/](./adr/) | Architecture Decision Records - Lý do các quyết định kiến trúc |
| [diagrams/](./diagrams/) | System diagrams (C4, sequence, ER) |
| [api/](./api/) | API contracts, Gateway routes, Kafka schemas |
| [security/](./security/) | Threat model, security checklist, compliance |
| [performance/](./performance/) | Performance budget, caching strategy |

## ADR Index

| ID | Tiêu đề | Status | Ngày |
|----|---------|--------|------|
| [ADR-001](./adr/ADR-001-use-dgraph-for-question-bank.md) | Use Dgraph cho Question Bank | ✅ Accepted | 12/08/2026 |
| [ADR-002](./adr/ADR-002-resilience-patterns.md) | Resilience Patterns | ✅ Accepted | 12/08/2026 |
| [ADR-003](./adr/ADR-003-observability-three-pillars.md) | Observability 3 Pillars | ✅ Accepted | 12/08/2026 |
| [ADR-004](./adr/ADR-004-idempotency-atomic-claim-outbox.md) | Idempotency: Atomic Claim + Outbox | ✅ Accepted | 18/08/2026 |
| [ADR-005](./adr/ADR-005-cache-strategy.md) | Cache Strategy | ✅ Accepted | 20/08/2026 |
| [ADR-006](./adr/ADR-006-service-integration.md) | Service Integration | ✅ Accepted | 24/08/2026 |
| [ADR-008](./adr/ADR-008-jwt-secret-synchronization.md) | **JWT Secret Synchronization** | ✅ Accepted | 24/08/2026 |
| [ADR-009](./adr/ADR-009-gateway-timeouts-and-circuit-breaker.md) | **Gateway Timeouts & Circuit Breaker** | ✅ Accepted | 24/08/2026 |
| [ADR-010](./adr/ADR-010-resolve-port-8080-conflict.md) | **Resolve Port 8080 Conflict (Dgraph ↔ Gateway)** | ✅ Accepted | 25/08/2026 |
| [ROADMAP-question-bank-dgraph](./adr/ROADMAP-question-bank-dgraph.md) | Roadmap: Question Bank Dgraph | 📋 In progress | — |

> **Đọc trước khi code:** ADR-001, ADR-002, ADR-006, ADR-008, ADR-009, **ADR-010** (port conflict — ảnh hưởng mọi service khi full-stack dev).

## Status

⚠️ _Sẽ được triển khai chi tiết khi bắt đầu dự án._
