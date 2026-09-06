# 📊 Business Documentation

Tài liệu liên quan đến business và quản lý dự án.

## Files

| File | Mô tả |
|------|--------|
| [BA_DOCUMENT.md](./BA_DOCUMENT.md) | Business Analysis Document v1.1 - Phân tích yêu cầu nghiệp vụ |
| [PROJECT_MANAGEMENT_PLAN.md](./PROJECT_MANAGEMENT_PLAN.md) | Kế hoạch quản lý dự án - 16 tuần, RACI, milestones, risks |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | Khung cấu trúc thư mục dự án (Monorepo) |
| **[PROJECT_RULES.md](./PROJECT_RULES.md)** | **📜 Quy tắc bắt buộc — PHẢI đọc trước khi code** |

## ⚠️ Rules bắt buộc nổi bật (PROJECT_RULES.md)

| Quy tắc | Mục đích | Liên quan |
|---------|----------|-----------|
| **§6.1.1 JWT Secret Synchronization** | Tất cả service verify JWT dùng cùng secret | [ADR-008](../02-architecture/adr/ADR-008-jwt-secret-synchronization.md) |
| **§6.1.2 API Gateway Resilience** | Không global CircuitBreaker, per-route CB | [ADR-009](../02-architecture/adr/ADR-009-gateway-timeouts-and-circuit-breaker.md) |
| **§6.3 OWASP Top 10** | Security checklist mọi PR | [BA §7.4 Security](./BA_DOCUMENT.md) |
| **§I Folder Structure** | Đặt file đúng vị trí | [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) |
| **§II Git Workflow** | Conventional Commits + branch naming | [Git Workflow](../03-development/git-workflow.md) |

## Liên kết

- [Architecture Documentation](../02-architecture/)
- [Development Guide](../03-development/)
- [Operations Guide](../04-operations/configuration-guide.md)
