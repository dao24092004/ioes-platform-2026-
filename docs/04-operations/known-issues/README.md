# Known Issues

> Tập hợp các vấn đề đã biết trong hệ thống IOES
> **Last Updated:** 13/09/2026

---

## 📋 DANH SÁCH ISSUES

### 🔴 Critical (Blocking Production)

| Issue | File | Status | Assigned |
|-------|------|--------|----------|
| **Question Bank Frontend Missing** | [question-bank-implementation-status.md](./question-bank-implementation-status.md) | 🔴 Open | Frontend Team |

### 🟡 Medium (Technical Debt)

| Issue | File | Status | Assigned |
|-------|------|--------|----------|
| API Gateway JWT & TimeLimiter | [api-gateway-jwt-va-timelimiter.md](./api-gateway-jwt-va-timelimiter.md) | ✅ Resolved | - |
| Exam Service Migration Drift | [exam-service-migration-drift.md](./exam-service-migration-drift.md) | 🟡 Monitoring | Backend Team |

---

## 📂 FILE STRUCTURE

```
known-issues/
├── README.md                                    # Index file này
├── question-bank-implementation-status.md       # Question Bank triển khai status (~75%)
├── api-gateway-jwt-va-timelimiter.md           # JWT & timeout issue (đã fix)
├── exam-service-migration-drift.md             # Migration drift issue
└── fix-gateway-jwt-and-timelimiter.patch       # Patch file
```

---

## 🎯 CÁC LOẠI ISSUES

### 1. Implementation Status Reports
Báo cáo tiến độ triển khai các feature lớn chưa hoàn thành 100%

**Format:** `{feature-name}-implementation-status.md`

**Example:**
- `question-bank-implementation-status.md` - Question Bank với Dgraph (75% done)

### 2. Known Bugs
Bugs đã phát hiện, đang theo dõi hoặc đã fix

**Format:** `{service-name}-{bug-description}.md`

**Example:**
- `api-gateway-jwt-va-timelimiter.md`
- `exam-service-migration-drift.md`

### 3. Technical Debt
Nợ kỹ thuật cần refactor/cải thiện

**Format:** `{component}-technical-debt.md`

---

## 📝 TEMPLATE

Khi tạo issue mới, sử dụng template sau:

```markdown
# Issue: [Tên issue ngắn gọn]

> **Severity:** 🔴 Critical | 🟡 Medium | 🟢 Low
> **Status:** Open | In Progress | Resolved | Monitoring
> **Reported:** DD/MM/YYYY
> **Assigned:** Team/Person

---

## 🎯 TÓM TẮT

[Mô tả ngắn gọn issue]

---

## 📋 CHI TIẾT

### Hiện trạng
[Tình trạng hiện tại]

### Tác động
[Tác động đến hệ thống]

### Root Cause
[Nguyên nhân gốc rễ]

---

## ✅ GIẢI PHÁP

### Đề xuất
[Các giải pháp đề xuất]

### Action Items
- [ ] Task 1
- [ ] Task 2

---

## 📚 TÀI LIỆU LIÊN QUAN

- [Link 1]
- [Link 2]
```

---

## 🔗 LIÊN HỆ

- **Ops Team:** ops@ioes.com
- **Tech Lead:** tech-lead@ioes.com
- **Slack:** #ioes-ops-issues

---

**Maintained by:** Operations Team
