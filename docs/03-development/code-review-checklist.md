# ✅ Code Review Checklist

> **Áp dụng cho:** Author và Reviewer của mọi Pull Request
> **Owner:** Tech Lead

---

## 📋 CHECKLIST CHO AUTHOR (Trước khi tạo PR)

### Trước khi submit

- [ ] Đã đọc `PROJECT_RULES.md`
- [ ] Code follow coding style guide của ngôn ngữ tương ứng
- [ ] Đã chạy lint locally (`pnpm lint` / `mvn checkstyle:check` / `flake8`)
- [ ] Đã chạy format (`pnpm format` / `mvn spotless:apply` / `black .`)
- [ ] Type check pass (`tsc --noEmit` / `mvn compile` / `mypy .`)
- [ ] Đã viết tests (unit + integration)
- [ ] All tests pass locally
- [ ] Coverage không giảm
- [ ] Đã update documentation (nếu cần)
- [ ] Đã test manual trên local

### PR Description

- [ ] Title theo format: `[PROJ-XXX] <type>(<scope>): <subject>`
- [ ] Link đến Jira ticket
- [ ] Mô tả rõ ràng "what" và "why"
- [ ] List các changes chính
- [ ] Screenshots/videos (nếu có UI changes)
- [ ] Note breaking changes (nếu có)
- [ ] Note migration required (nếu có)
- [ ] Checklist items đã tick

### Git hygiene

- [ ] Commit messages theo Conventional Commits
- [ ] Branch name đúng format
- [ ] Không có commit WIP, debug, console.log
- [ ] Không có secrets, .env files
- [ ] Không có file generated (dist/, node_modules/)
- [ ] Đã rebase với develop mới nhất
- [ ] Không có conflict

---

## 🔍 CHECKLIST CHO REVIEWER

### 1. CODE QUALITY (BẮT BUỘC)

#### 1.1 Style & Convention

- [ ] Naming convention đúng (variables, functions, classes, files)
- [ ] Code formatted (Prettier, Black, Spotless)
- [ ] Không có linter warnings
- [ ] Không có type errors
- [ ] Không có unused imports, variables
- [ ] Không có magic numbers (dùng constants)
- [ ] Comments giải thích "why" không phải "what"

#### 1.2 Readability

- [ ] Function/method < 50 dòng
- [ ] File < 300 dòng
- [ ] Class < 500 dòng
- [ ] Nesting level ≤ 4
- [ ] Code tự giải thích (không cần comment nhiều)
- [ ] Biến có tên có nghĩa (không `x`, `temp`, `data1`)

#### 1.3 SOLID Principles

- [ ] **S** - Single Responsibility: mỗi class/function 1 việc
- [ ] **O** - Open/Closed: mở rộng được, không sửa code cũ
- [ ] **L** - Liskov Substitution: subtype thay thế được base type
- [ ] **I** - Interface Segregation: interface nhỏ, focused
- [ ] **D** - Dependency Inversion: depend on abstractions

#### 1.4 DRY & KISS

- [ ] Không duplicate code
- [ ] Không over-engineer
- [ ] Solution đơn giản nhất có thể

---

### 2. FUNCTIONALITY (BẮT BUỘC)

- [ ] Code thực hiện đúng theo requirement
- [ ] Không có bug logic
- [ ] Edge cases được xử lý
- [ ] Error handling đầy đủ
- [ ] Input validation
- [ ] Output đúng format
- [ ] Happy path hoạt động
- [ ] Unhappy path có thông báo rõ ràng

---

### 3. TESTING (BẮT BUỘC)

- [ ] Unit tests đầy đủ (coverage ≥ target)
- [ ] Test cho happy path
- [ ] Test cho edge cases
- [ ] Test cho error cases
- [ ] Test names mô tả rõ behavior
- [ ] Không có test skip không lý do
- [ ] Integration tests (nếu cần)
- [ ] E2E tests (cho critical flows)
- [ ] Tests chạy nhanh (< 100ms cho unit)

---

### 4. SECURITY (BẮT BUỘC)

- [ ] Không có hardcoded secrets
- [ ] Input sanitization
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (escape output)
- [ ] Authentication check
- [ ] Authorization check (RBAC)
- [ ] CSRF protection (cho form)
- [ ] HTTPS enforced
- [ ] Không log sensitive data (password, token, PII)
- [ ] Rate limiting (cho API public)
- [ ] CORS configured
- [ ] Dependencies không có known vulnerabilities

---

### 5. PERFORMANCE (BẮT BUỘC)

- [ ] Database query optimized (index, N+1)
- [ ] Không có unnecessary DB calls
- [ ] Caching cho data expensive
- [ ] Pagination cho list API
- [ ] Lazy loading cho heavy components
- [ ] Bundle size không tăng quá nhiều
- [ ] Image optimized
- [ ] Không có memory leaks
- [ ] Async cho I/O operations
- [ ] Connection pooling configured

---

### 6. ARCHITECTURE (BẮT BUỘC)

- [ ] Code đúng layer (controller/service/repository)
- [ ] Domain layer không depend framework
- [ ] Service boundaries đúng (không leak giữa services)
- [ ] Communication đúng (REST/Kafka/WebSocket)
- [ ] Database per service (không share)
- [ ] API contract consistent
- [ ] Event schema documented
- [ ] Error handling centralized
- [ ] Logging structured
- [ ] Metrics instrumented

---

### 7. OBSERVABILITY (BẮT BUỘC)

- [ ] Structured logging với context
- [ ] Log level đúng (info/warn/error)
- [ ] Correlation ID propagated
- [ ] Metrics cho important events
- [ ] Tracing cho external calls
- [ ] Health check endpoint (cho services)
- [ ] Alerts configured (cho critical paths)

---

### 8. DOCUMENTATION (BẮT BUỘC)

- [ ] Public APIs có JSDoc/Javadoc/docstring
- [ ] README updated (nếu thêm dependency)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] CHANGELOG updated (cho breaking changes)
- [ ] Inline comments giải thích logic phức tạp
- [ ] Migration guide (nếu có breaking change)

---

### 9. CONFIGURATION (BẮT BUỘC)

- [ ] Config qua env vars (không hardcode)
- [ ] .env.example updated
- [ ] Default values hợp lý
- [ ] Secrets từ Vault/K8s Secrets
- [ ] Feature flags (nếu là feature mới)

---

### 10. DEPLOYMENT (BẮT BUỘC)

- [ ] Migration script (nếu có DB change)
- [ ] Migration backward compatible
- [ ] Helm chart updated (nếu là service)
- [ ] Resource limits set (CPU, memory)
- [ ] Health checks configured
- [ ] Rollback plan documented

---

## 🟢 OPTIONAL CHECKS (Nice to have)

- [ ] Có thêm unit test cho edge cases
- [ ] Có cải thiện documentation
- [ ] Có refactor code cũ liên quan
- [ ] Có update ADRs (nếu architecture thay đổi)
- [ ] Có performance test
- [ ] Có security test

---

## 🚨 RED FLAGS (Phải block PR)

```yaml
CẤM merge nếu:
- ❌ CI/CD fail (lint, test, build)
- ❌ Coverage giảm > 1%
- ❌ Có hardcoded secrets
- ❌ Có console.log / System.out.println / print() trong code
- ❌ Có force push sau khi review
- ❌ Có commit message không theo convention
- ❌ PR > 800 dòng changes (phải chia nhỏ)
- ❌ Có file .env, credentials trong diff
- ❌ Có dependency không có trong .env.example
- ❌ Có breaking change không document
- ❌ Có TODO không có ticket
- ❌ Có bug logic rõ ràng
- ❌ Có security vulnerability
```

---

## 💬 COMMENT GUIDELINES

### Phân loại comment

```markdown
# 🔴 Blocking - Phải fix trước khi merge
"This will cause a race condition in production. Please use a lock."

# 🟡 Suggestion - Nên fix, không block
"Consider extracting this into a helper function for reuse."

# 💡 Question - Cần clarify
"Why are we using this approach instead of X?"

# 💚 Praise - Positive feedback
"Nice use of the Repository pattern here!"

# 📚 Reference - Link to docs
"Per our style guide, we should use X here: [link]"
```

### Tone

- ✅ Constructive: "Could we consider...?"
- ✅ Specific: "Line 42: variable name should be..."
- ✅ Educational: "In this codebase, we use X because..."
- ❌ Demanding: "Change this."
- ❌ Vague: "This is wrong."
- ❌ Personal: "You should know better."

---

## 📊 REVIEW SLAs

| PR Size | Review SLA |
|---------|-----------|
| < 100 dòng | 4 giờ |
| 100-300 dòng | 8 giờ |
| 300-500 dòng | 16 giờ |
| > 500 dòng | 24 giờ (hoặc chia nhỏ) |

---

## 🎯 REVIEW OUTCOMES

### Approve ✅
- Code đạt chuẩn
- Tests pass
- Có thể merge

### Request Changes 🔴
- Có issues blocking
- Author phải fix và re-request review

### Comment 💬
- Có suggestions không blocking
- Author có thể fix hoặc ignore (với lý do)

### Draft PR 🚧
- Code chưa ready
- Để author biết cần thêm gì

---

## 📚 REFERENCE

- [Google Engineering Practices - Code Review](https://google.github.io/eng-practices/review/)
- [Conventional Comments](https://conventionalcomments.org/)
- [Project Rules](../01-business/PROJECT_RULES.md)

---

**Version:** 1.0
**Last updated:** 12/08/2026
