# 📋 Operations Post-mortems

Tài liệu ghi nhận và phân tích các sự cố production/staging.

## Quy trình

1. **Phát hiện sự cố** → Tạo file `YYYY-MM-DD-<short-name>.md` trong folder này
2. **Phân tích root cause** → Liên kết tới ADR (Architecture Decision Record) nếu cần
3. **Fix** → Áp dụng theo ADR, update CI checks nếu có thể lặp lại
4. **Document** → Cập nhật PROJECT_RULES, configuration-guide

## Files

| File | Severity | Ngày | Status |
|------|----------|------|--------|
| [2026-08-24-gateway-jwt-and-timeout.md](./2026-08-24-gateway-jwt-and-timeout.md) | P0 | 24/08/2026 | ✅ Resolved |

## Template

```markdown
# 🚨 Operations Post-mortem #NNN — <short title>

> **Ngày:** YYYY-MM-DD
> **Severity:** P0 | P1 | P2 | P3
> **Detection:** Ai phát hiện / Cách phát hiện
> **Root cause:** Tóm tắt 1-2 câu
> **Resolution:** YYYY-MM-DD — đã fix và document ADR-NNN

## TL;DR
| # | Lỗi | Triệu chứng | Impact |
|---|------|-------------|--------|

## Lỗi #1: <title>
### Mô tả
### Timeline
### Root cause
### Tại sao chưa ai phát hiện?
### Fix
### Lessons learned
### Action items

## Tác động (trước/sau)

## Phòng ngừa
## Đối tượng cần đọc
```

## Liên quan

- [configuration-guide.md](../configuration-guide.md)
- [PROJECT_RULES](../../01-business/PROJECT_RULES.md)
- [ADR Index](../../02-architecture/README.md)