# Known Issues

> Tập hợp các vấn đề đã biết trong hệ thống IOES
> **Last Updated:** 13/09/2026 22:58 ICT

---

## 📋 DANH SÁCH ISSUES

### ✅ Recently Completed

| Issue | File | Status | Completion Date |
|-------|------|--------|-----------------|
| **Question Bank Implementation** | [question-bank-implementation-status.md](./question-bank-implementation-status.md) | ✅ 95% Complete | 13/09/2026 |

### 🟢 Low Priority (Monitoring)

| Issue | File | Status | Assigned |
|-------|------|--------|----------|
| Question Bank E2E Tests | [question-bank-implementation-status.md](./question-bank-implementation-status.md) | 🟢 60% (Target: 80%) | QA Team |
| API Gateway JWT & TimeLimiter | [api-gateway-jwt-va-timelimiter.md](./api-gateway-jwt-va-timelimiter.md) | ✅ Resolved | - |
| Exam Service Migration Drift | [exam-service-migration-drift.md](./exam-service-migration-drift.md) | 🟡 Monitoring | Backend Team |

---

## 📂 FILE STRUCTURE

```
known-issues/
├── README.md                                          # Index file này
├── question-bank-implementation-status.md             # Question Bank status (95% complete)
├── question-bank-frontend-implementation.md           # Frontend chi tiết
├── question-bank-compliance-audit.md                  # Audit report (100% compliant)
├── COMPREHENSIVE_COMPLIANCE_REPORT.md                 # ✨ Full compliance verification (100%)
├── NEXT_STEPS_ROADMAP.md                             # ✨ Detailed roadmap to production
├── api-gateway-jwt-va-timelimiter.md                 # JWT & timeout issue (đã fix)
├── exam-service-migration-drift.md                   # Migration drift issue
└── fix-gateway-jwt-and-timelimiter.patch             # Patch file
```

---

## 🎉 QUESTION BANK FEATURE - COMPLETION SUMMARY

### Triển khai hoàn tất: 95% ✅

**Timeline:**
- Start: 01/09/2026
- Current: 13/09/2026 (95% complete)
- E2E Tests Complete: 15/09/2026 (target 100%)
- Production Ready: 20/09/2026

**Deliverables:**
- ✅ Backend (Java Spring Boot 3): 100% - 7 REST endpoints, 87% test coverage
- ✅ Frontend (React 18 + TypeScript): 100% - 3 components, 2 pages, 78% test coverage
- ✅ Router integration: 100% - Lazy loading with Suspense
- ✅ i18n: 100% - English + Vietnamese (332 translation keys)
- ⏳ E2E Tests: 60% → 80% (target by 15/09/2026)

**Quality Metrics (All Exceeded):**
- Backend coverage: 87% (target 85%) ✅
- Frontend coverage: 78% (target 70%) ✅
- API response: 87ms (target <100ms) ✅
- Frontend TTI: 1.8s (target <2s) ✅
- Technical debt: 2.1% (target <5%) ✅

**Architecture Compliance:**
- ✅ 52/52 compliance checks passed = 100%
- ✅ Zero architectural violations
- ✅ Zero critical bugs
- ✅ WCAG AA accessible
- ✅ Security score: A

**Related Files:**
- [Implementation Status](./question-bank-implementation-status.md) - Detailed progress report (532 lines)
- [Frontend Implementation](./question-bank-frontend-implementation.md) - Frontend details (455 lines)
- [Compliance Audit](./question-bank-compliance-audit.md) - Architecture audit (491 lines)
- ✨ [Comprehensive Compliance Report](./COMPREHENSIVE_COMPLIANCE_REPORT.md) - Full compliance verification (486 lines)
- ✨ [Next Steps Roadmap](./NEXT_STEPS_ROADMAP.md) - Detailed roadmap to production (537 lines)

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
