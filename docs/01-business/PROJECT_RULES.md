# 📜 PROJECT RULES — IOES
# Quy tắc bắt buộc tuân thủ cho toàn bộ team

> **Phiên bản:** 1.0
> **Ngày:** 12/08/2026
> **Trạng thái:** 🔴 BẮT BUỘC — Mọi thành viên phải đọc và tuân thủ
> **Owner:** Tech Lead + Project Manager

---

## 🚨 NGUYÊN TẮC VÀNG (Golden Rules)

### Rule 1: KHÔNG ĐƯỢC LÀM LAN MAN
> **Mọi thứ phải theo đúng tài liệu đã được phê duyệt**

| Tài liệu gốc | Mục đích | Không tự ý |
|--------------|----------|-----------|
| `BA_DOCUMENT.md` | Business logic | Thêm/sửa yêu cầu business |
| `PROJECT_MANAGEMENT_PLAN.md` | Sprint, deadline | Thay đổi scope/timeline |
| `PROJECT_STRUCTURE.md` | Cấu trúc thư mục | Tạo thư mục ngoài cấu trúc |
| `PROJECT_RULES.md` | Quy tắc code | Bỏ qua coding standards |

### Rule 2: KHÔNG TỰ Ý THAY ĐỔI KIẾN TRÚC
- Mọi thay đổi kiến trúc **PHẢI** được tạo **ADR** (Architecture Decision Record) trong `docs/02-architecture/adr/`
- Mọi thay đổi **PHẢI** được **Tech Lead review** trước khi code
- Mọi thay đổi breaking **PHẢI** thông báo **PO + PM**

### Rule 3: LUÔN CÓ TEST
- Không PR nào được merge nếu thiếu test
- Coverage tối thiểu **80%** cho business logic
- Critical paths (auth, payment, grading) **PHẢI** đạt **95%+**

---

## 📂 I. CẤU TRÚC THƯ MỤC — BẮT BUỘC

### 1.1 Nguyên tắc
- ✅ Mỗi file phải nằm đúng vị trí quy định trong `PROJECT_STRUCTURE.md`
- ✅ KHÔNG tự ý tạo thư mục mới ngoài cấu trúc
- ✅ KHÔNG để file rác (file test, debug, draft) trong code

### 1.2 Quy tắc cụ thể

| Loại file | Vị trí bắt buộc |
|-----------|----------------|
| React component | `apps/web/src/components/{domain}/` |
| React page | `apps/web/src/pages/{role}/` |
| API client | `apps/web/src/services/api/{resource}.api.ts` |
| Java class | `services/{service}/src/main/java/com/ioes/{service}/{layer}/` |
| Java test | `services/{service}/src/test/java/` |
| Node module | `services/{service}/src/modules/{feature}/` |
| Python module | `services/ai-suite/{service}/src/{module}/` |
| Smart contract | `services/blockchain-suite/src/contracts/` |
| Migration | `database/migrations/{service}/V{n}__{name}.sql` |
| Helm chart | `infrastructure/helm/charts/{service}/` |
| Terraform | `infrastructure/terraform/modules/{component}/` |
| Test E2E | `tests/e2e/specs/{feature}.spec.ts` |

### 1.3 Cấm
- ❌ KHÔNG tạo file `.js` (chỉ dùng `.ts` / `.tsx`)
- ❌ KHÔNG tạo file `.java` ngoài package `com.ioes.*`
- ❌ KHÔNG tạo file `.py` ở root của service
- ❌ KHÔNG hardcode credentials, secrets, URLs
- ❌ KHÔNG commit file `.env` thật
- ❌ KHÔNG để `console.log`, `System.out.println`, `print()` trong code production

---

## 🌿 II. GIT WORKFLOW — BẮT BUỘC

### 2.1 GitFlow

```
main (production)
  │
  ├── develop (integration)
  │     │
  │     ├── feature/PROJ-123-add-login
  │     ├── feature/PROJ-124-course-crud
  │     └── bugfix/PROJ-456-fix-timer
  │
  ├── release/v1.2.0
  │
  └── hotfix/PROJ-789-critical-fix
```

### 2.2 Branch Naming (BẮT BUỘC)

```bash
# Format: <type>/<jira-id>-<short-desc>

feature/PROJ-123-add-login            # Feature mới
bugfix/PROJ-456-fix-exam-timer       # Bug fix
hotfix/PROJ-789-critical-fix         # Critical production fix
refactor/PROJ-234-cleanup-orders     # Refactor code
docs/PROJ-345-update-readme          # Documentation only
test/PROJ-456-add-e2e                # Test only
chore/PROJ-567-update-deps           # Build/tooling
```

❌ **SAI:** `feature/login`, `my-branch`, `fix`, `test-branch`

### 2.3 Commit Message — Conventional Commits (BẮT BUỘC)

```bash
# Format: <type>(<scope>): <subject>

feat(auth): add OAuth2 Google login
fix(exam): correct timer countdown when tab is inactive
docs(readme): update setup instructions
test(auth): add unit test for JWT validation
refactor(content): extract file upload service
perf(analytics): add Redis cache for dashboard
chore(deps): upgrade Spring Boot to 3.3.0
style(web): fix eslint warnings
ci(github): add E2E workflow
```

**Types:**
| Type | Mục đích |
|------|----------|
| `feat` | Tính năng mới |
| `fix` | Bug fix |
| `docs` | Tài liệu |
| `style` | Format code (không thay đổi logic) |
| `refactor` | Refactor code |
| `perf` | Performance improvement |
| `test` | Thêm/sửa test |
| `chore` | Build, tools, deps |
| `ci` | CI/CD |

**Rules:**
- Subject ≤ 72 ký tự
- Không viết hoa chữ cái đầu subject
- Không có dấu chấm cuối subject
- Body wrap ở 100 ký tự
- Dùng imperative mood ("add" không phải "added")

❌ **SAI:** `update code`, `fix bug`, `Login feature added`

### 2.4 Pull Request Rules

```bash
# Mỗi PR PHẢI:
- [ ] Title theo format: [PROJ-XXX] feat(scope): subject
- [ ] Mô tả đầy đủ (template)
- [ ] Liên kết Jira ticket
- [ ] Tests pass (CI xanh)
- [ ] Lint pass (CI xanh)
- [ ] Coverage không giảm
- [ ] Có ít nhất 1 approval từ reviewer
- [ ] Không có conflict với develop/main
```

❌ **SAI:** `PR title: "update"`, `Mô tả: ""`, `Tự approve`

---

## 💻 III. CODING STANDARDS

### 3.1 TypeScript / React (Frontend)

**Naming:**
```typescript
// ✅ Component - PascalCase
export const LoginForm = () => {}

// ✅ Hook - camelCase, prefix 'use'
export const useAuth = () => {}

// ✅ Constant - UPPER_SNAKE_CASE
export const MAX_FILE_SIZE = 1024

// ✅ Function/Variable - camelCase
const handleSubmit = () => {}
const userName = 'John'

// ✅ Type/Interface - PascalCase
interface UserProfile {}
type ExamStatus = 'draft' | 'published'

// ✅ File - PascalCase cho component, camelCase cho utility
LoginForm.tsx
useAuth.ts
examService.ts
```

**Component structure:**
```typescript
// ✅ Import order: external → internal → types
import { useState } from 'react'                          // External
import { useQuery } from '@tanstack/react-query'         // External
import { Button } from '@ioes/ui-kit'                    // Internal
import { useAuth } from '@/hooks/useAuth'                // Internal
import type { LoginFormProps } from './LoginForm.types'  // Types
import './LoginForm.css'                                  // Styles

// ✅ Component - functional, có TypeScript
interface LoginFormProps {
  onSuccess: (token: string) => void
  onError?: (error: Error) => void
}

export const LoginForm = ({ onSuccess, onError }: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // ...
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  )
}
```

**❌ CẤM trong React:**
- Class components (chỉ dùng functional + hooks)
- `any` type (dùng `unknown` + type guards)
- Inline styles cho complex UI (dùng Tailwind)
- `console.log` (dùng logger)
- Direct DOM manipulation

### 3.2 Java / Spring Boot

**Naming:**
```java
// ✅ Class - PascalCase
public class UserController {}

// ✅ Method/Variable - camelCase
public void createUser(String userName) {}
private int maxRetryCount = 3;

// ✅ Constant - UPPER_SNAKE_CASE
public static final int MAX_FILE_SIZE = 1024;

// ✅ Package - lowercase, dot-separated
package com.ioes.auth.interfaces.rest;
```

**Layer Structure (Hexagonal):**
```java
// ✅ Domain - Pure business logic, no framework
package com.ioes.auth.domain;
public class User {
  private String email;
  private String passwordHash;
  public boolean isActive() { /* ... */ }
}

// ✅ Application - Use cases
package com.ioes.auth.application.usecase;
public class LoginUseCase {
  public Token execute(LoginCommand cmd) { /* ... */ }
}

// ✅ Infrastructure - Framework, DB, external
package com.ioes.auth.infrastructure.persistence;

// ✅ Interfaces - REST controllers, event handlers
package com.ioes.auth.interfaces.rest;
@RestController
public class AuthController {}
```

**❌ CẤM trong Java:**
- Field injection (`@Autowired` trên field), dùng constructor injection
- `System.out.println`, dùng SLF4J logger
- Raw `List`/`Map` (dùng generics)
- `Optional.get()` không check isPresent
- Magic numbers (đặt thành constants)

### 3.3 Node.js / NestJS

**Module Structure:**
```typescript
// ✅ Module organization
modules/
  exam/
    exam.module.ts           // Module definition
    exam.controller.ts       // HTTP routes
    exam.service.ts          // Business logic
    exam.repository.ts       // Data access
    entities/                // TypeORM entities
    dto/                     // Data transfer objects
    guards/                  // Module-specific guards
    exam.controller.spec.ts  // Controller test
    exam.service.spec.ts     // Service test
```

**Naming:**
```typescript
// ✅ Class - PascalCase + suffix
@Module({}) class ExamModule {}
@Controller() class ExamController {}
@Service() class ExamService {}
@Entity() class Exam {}

// ✅ File - kebab-case hoặc dot.notation
exam.module.ts
exam.controller.ts
create-exam.dto.ts
```

### 3.4 Python / FastAPI

**Naming:**
```python
# ✅ Class - PascalCase
class UserService:
    pass

# ✅ Function/Variable - snake_case
def get_user_by_id(user_id: str) -> User:
    pass

# ✅ Constant - UPPER_SNAKE_CASE
MAX_FILE_SIZE = 1024
DEFAULT_TIMEOUT = 30

# ✅ Module - snake_case
# user_service.py
```

**Type hints BẮT BUỘC:**
```python
# ✅ Type hints everywhere
async def create_user(data: UserCreate) -> User:
    return await self.repo.save(data)

# ✅ Pydantic models for validation
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
```

---

## 🏗️ IV. ARCHITECTURE RULES

### 4.1 Service Boundaries

```yaml
# Mỗi microservice là một bounded context độc lập

auth-service:
  owns: [User, Role, Permission, Session]
  publishes: [UserRegistered, UserLoggedIn, PasswordReset]
  consumes: [OAuthUserInfo]

content-service:
  owns: [Course, Lesson, Chapter, Category, Review]
  publishes: [CourseCreated, CoursePublished, CourseEnrolled]
  consumes: [UserRegistered, PaymentCompleted]

exam-suite:
  owns: [Exam, Question, Submission, Attempt, ProctoringSession]
  publishes: [ExamStarted, ExamSubmitted, ExamGraded, ProctorAlert]
  consumes: [CourseEnrolled, UserLoggedIn]

# ❌ CẤM: Service A truy cập trực tiếp database của Service B
# ✅ ĐÚNG: Service A gọi API Service B qua API Gateway hoặc Kafka events
```

### 4.2 Communication Rules

| Loại giao tiếp | Khi nào dùng |
|----------------|--------------|
| **Synchronous REST** | Query dữ liệu real-time cần ngay (vd: lấy thông tin user) |
| **Async Kafka** | Event không cần response ngay (vd: gửi email, cập nhật analytics) |
| **WebSocket** | Real-time push (vd: timer, notifications, live proctoring) |
| **gRPC** | Internal service-to-service high-perf (optional) |

❌ **CẤM:**
- Gọi REST trực tiếp giữa các service (phải qua API Gateway)
- Shared database giữa 2 services
- Sync call trong vòng lặp (dùng batch hoặc async)

### 4.3 Database Rules

```sql
-- ✅ BẮT BUỘC
- Mỗi service có database riêng (Database per Service)
- Không dùng foreign key giữa các services
- Mọi migration phải có version V{n}__{name}.sql
- Migration chỉ chạy 1 chiều (không sửa file đã chạy)
- Rollback script cho mỗi migration quan trọng
- Soft delete với deleted_at, KHÔNG xóa cứng
- Audit fields: created_at, updated_at, created_by, updated_by
- UUID v7 cho primary key (không dùng auto-increment nếu có thể)
```

---

## 🧪 V. TESTING STANDARDS

### 5.1 Test Pyramid (BẮT BUỘC)

```
        ╱╲
       ╱  ╲         E2E Tests (5-10%)
      ╱ 5% ╲        - Critical user flows only
     ╱──────╲
    ╱        ╲      Integration Tests (20-30%)
   ╱  25%    ╲     - API endpoints, DB, Kafka
  ╱────────────╲
 ╱              ╲   Unit Tests (60-75%)
╱      70%       ╲  - Pure logic, no IO
─────────────────
```

### 5.2 Coverage Requirements

| Layer | Minimum Coverage |
|-------|-----------------|
| Critical (auth, payment, grading) | **95%** |
| Business logic (services, use cases) | **85%** |
| Controllers / API layer | **80%** |
| Utils / helpers | **90%** |
| UI components | **70%** |
| Configuration | **50%** |

### 5.3 Test Naming Convention

```typescript
// Java - JUnit
@Test
void should_ReturnToken_When_LoginWithValidCredentials() {}

// TypeScript - Jest/Vitest
describe('LoginUseCase', () => {
  it('should return token when credentials are valid', () => {})
  it('should throw error when password is wrong', () => {})
  it('should throw error when user not found', () => {})
})

// Python - pytest
def test_login_returns_token_when_credentials_valid():
def test_login_raises_error_when_password_wrong():
```

### 5.4 Test Rules

- ✅ Mỗi bug fix phải có test reproducing bug trước
- ✅ Mỗi feature phải có test trước khi merge (TDD encouraged)
- ✅ Test phải độc lập (không phụ thuộc thứ tự)
- ✅ Test phải nhanh (unit test < 100ms)
- ✅ Không test implementation details (chỉ test behavior)
- ❌ KHÔNG skip test (`it.skip`) không có lý do
- ❌ KHÔNG mock quá nhiều (test phải thực sự verify behavior)

---

## 🔐 VI. SECURITY RULES

### 6.1 Secrets Management

```bash
# ❌ CẤM
- Commit file .env, credentials.json, *.pem, *.key
- Hardcode password, API key trong code
- Lưu secret trong config file

# ✅ ĐÚNG
- Dùng AWS Secrets Manager / HashiCorp Vault / K8s Secrets
- Lấy secret qua env var lúc runtime
- Rotate secret mỗi 90 ngày
```

### 6.2 API Security

```yaml
# BẮT BUỘC cho mọi endpoint
- Authentication (JWT/OAuth2)
- Authorization (RBAC check)
- Input validation (Zod/Bean Validation)
- Rate limiting (theo IP + user)
- HTTPS only
- CORS whitelist
- Request size limit
- SQL injection prevention (dùng ORM parameterized query)
- XSS prevention (escape output)
- CSRF token cho form
- Audit log cho action quan trọng
```

### 6.3 OWASP Top 10 Checklist

- [ ] A01: Broken Access Control → RBAC + ABAC
- [ ] A02: Cryptographic Failures → TLS 1.3, bcrypt password
- [ ] A03: Injection → Parameterized query, ORM
- [ ] A04: Insecure Design → Threat modeling
- [ ] A05: Security Misconfiguration → Hardened images
- [ ] A06: Vulnerable Components → Dependabot + Snyk
- [ ] A07: Auth Failures → MFA, JWT rotation
- [ ] A08: Data Integrity → Signature, audit log
- [ ] A09: Logging Failures → Centralized logging
- [ ] A10: SSRF → URL validation, network policy

---

## 📦 VII. DEPENDENCY MANAGEMENT

### 7.1 Quy tắc thêm dependency

```bash
# 1. PHẢI check trước khi thêm:
- Dependency có thực sự cần thiết không?
- Có thư viện nào đã có trong stack làm được không?
- License có OK không? (MIT, Apache 2.0, BSD)
- Còn được maintain không? (last commit < 6 months)
- Số stars, downloads có uy tín không?
- Có lỗ hổng bảo mật không?

# 2. PHẢI document trong PR description lý do thêm
```

### 7.2 Version Pinning

```json
// ✅ Pin exact version cho critical deps
{
  "dependencies": {
    "react": "18.3.1",           // Exact
    "spring-boot": "3.3.4",      // Exact
    "fastapi": "0.111.0"         // Exact
  }
}

// ✅ Caret/tilde cho utility deps
{
  "devDependencies": {
    "eslint": "^9.0.0",          // Minor updates OK
    "prettier": "~3.1.0"         // Patch only
  }
}
```

---

## 🚀 VIII. CI/CD RULES

### 8.1 CI Pipeline (MỖI PR)

```yaml
# Pipeline PHẢI chạy:
1. Lint (eslint, checkstyle, flake8)
2. Type check (tsc, mypy)
3. Unit tests
4. Integration tests
5. Build (compile, bundle)
6. Security scan (Trivy, Snyk)
7. Coverage report (must not decrease)
```

### 8.2 CD Pipeline

```yaml
# Branch mapping:
- feature/* → Auto deploy to dev environment
- develop → Auto deploy to staging
- main → Manual approval → Deploy to production
- hotfix/* → Manual approval → Deploy to production

# Rollback tự động nếu:
- Health check fail sau 5 phút
- Error rate > 1%
- Latency p99 > 2x baseline
```

---

## 📊 IX. OBSERVABILITY RULES

### 9.1 Logging

```java
// ✅ BẮT BUỘC - Structured logging với correlation ID
log.info("User logged in", kv("userId", userId), kv("ip", ipAddress));

// ❌ CẤM
log.info("User " + userId + " logged in from " + ip);  // String concat
log.info("Something happened");  // Không có context
```

```typescript
// ✅ Log levels
logger.debug('Detailed info for debugging')
logger.info('Important business events')
logger.warn('Warning but not error')
logger.error('Error that needs attention')

// ❌ CẤM
console.log('test')              // Production
logger.info(secretData)         // Log secrets
logger.info(password)           // Log PII
```

### 9.2 Metrics (BẮT BUỘC)

```yaml
# Mỗi service PHẢI expose:
- http_requests_total{method, path, status}
- http_request_duration_seconds{method, path}
- http_requests_in_flight
- jvm_memory_used_bytes (Java)
- nodejs_heap_size_used_bytes (Node)
- process_cpu_seconds_total

# Custom business metrics:
- exam_submissions_total
- grading_duration_seconds
- proctoring_alerts_total{type}
- ai_inference_duration_seconds{model}
```

### 9.3 Tracing

```typescript
// ✅ BẮT BUỘC
- Trace ID truyền qua HTTP header (X-Trace-Id, traceparent)
- Mọi external call phải được trace
- Span cho mỗi business operation
- Error phải có stack trace + context
```

---

## 🎨 X. UI/UX RULES

### 10.1 Design System

```typescript
// ✅ Dùng design tokens, KHÔNG hardcode
// Color: dùng theme.color.primary, KHÔNG dùng #1890ff
// Spacing: dùng theme.spacing.md, KHÔNG dùng '16px'
// Font size: dùng theme.fontSize.lg, KHÔNG dùng '18px'
```

### 10.2 Component Rules

```typescript
// ✅ PHẢI
- Component < 300 dòng (chia nhỏ nếu dài hơn)
- Một component làm một việc (Single Responsibility)
- Props có TypeScript interface rõ ràng
- Có default props hoặc required props
- Có accessibility (aria-label, role, keyboard support)

// ❌ CẤM
- Inline styles cho phức tạp
- Magic numbers
- Untyped props
- Direct DOM manipulation
```

### 10.3 Responsive Design

```typescript
// ✅ Mobile-first
// Breakpoints:
// sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px

// Test trên:
// - Mobile (375px, 414px)
// - Tablet (768px, 1024px)
// - Desktop (1280px, 1920px)
```

---

## 📝 XI. DOCUMENTATION RULES

### 11.1 Code Documentation

```typescript
/**
 * Tính điểm cuối cùng của bài thi sau khi áp dụng các quy tắc grading.
 *
 * @param submission - Bài làm của học viên
 * @param exam - Bài thi với config grading
 * @returns Điểm cuối cùng (0-100) và feedback
 *
 * @example
 * const { score, feedback } = calculateFinalScore(submission, exam)
 *
 * @throws {InvalidSubmissionError} Khi submission không hợp lệ
 */
export function calculateFinalScore(
  submission: Submission,
  exam: Exam
): GradingResult {
  // ...
}
```

### 11.2 README Rules

```markdown
# Mỗi service PHẢI có README.md gồm:
- Tên + mô tả ngắn
- Tech stack
- Cấu trúc thư mục (1-2 levels)
- Cách chạy local (commands)
- Cách test
- API endpoints (link Swagger)
- Environment variables
- Liên hệ (owner, slack channel)
```

---

## ⚡ XII. PERFORMANCE RULES

### 12.1 Frontend Performance

```yaml
BUNDLE SIZE:
- Initial bundle < 250KB (gzipped)
- Lazy load tất cả routes
- Lazy load heavy components (charts, editor)
- Code splitting per feature
- Tree-shaking enabled

RENDERING:
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Lighthouse score > 90
- Use React.memo, useMemo, useCallback đúng chỗ
- Virtual scrolling cho list > 100 items

IMAGES:
- Dùng WebP, AVIF
- Lazy load images
- CDN with cache headers
- Responsive images (srcset)
```

### 12.2 Backend Performance

```yaml
DATABASE:
- Query < 100ms (p95)
- Index cho mọi WHERE, ORDER BY
- Connection pooling (HikariCP)
- N+1 query detection
- Read replica cho query nặng

CACHE:
- Redis cho hot data
- CDN cho static assets
- HTTP cache headers
- Cache invalidation strategy

API:
- Response < 200ms (p95)
- Pagination cho list API
- GraphQL/Dataloader cho batch
- Async cho heavy operation
```

---

## 🔄 XIII. DEPLOYMENT RULES

### 13.1 Pre-deployment Checklist

```bash
# Trước khi deploy production, PHẢI verify:
- [ ] All tests pass (CI xanh)
- [ ] Coverage ≥ target
- [ ] Security scan pass
- [ ] Performance test pass
- [ ] Staging deployed & verified
- [ ] Database migration tested
- [ ] Rollback plan documented
- [ ] Feature flag configured
- [ ] Monitoring & alerts configured
- [ ] Stakeholders notified
```

### 13.2 Deployment Strategy

```yaml
DEFAULT: Blue-Green
- Deploy version mới song song
- Switch traffic sau khi health check OK
- Giữ version cũ 24h để rollback

CRITICAL SERVICES: Canary
- Deploy 5% traffic trước
- Monitor 30 phút
- Tăng dần 25% → 50% → 100%

DATABASE MIGRATION:
- Backward compatible migrations only
- Long migration chạy async
- Test trên staging với data size thật
```

---

## 📋 XIV. VI PHẠM & XỬ LÝ

### 14.1 Severity Levels

| Level | Mô tả | Xử lý |
|-------|--------|-------|
| 🔴 **Critical** | Lộ secret, xóa data prod, security breach | Hotfix ngay, post-mortem |
| 🟠 **High** | Code không theo architecture, thiếu test critical | Fix trong sprint hiện tại |
| 🟡 **Medium** | Convention chưa đúng, coverage thấp | Fix trong PR tiếp theo |
| 🟢 **Low** | Style, comment, naming | Note trong review |

### 14.2 Quy trình xử lý

```
1. Violation detected → Tech Lead review
2. Severity assessment → Communicate to author
3. Fix required → Track in Jira
4. Post-mortem (for Critical) → Document & share
```

---

## 🤝 XV. TEAM ROLES & RESPONSIBILITIES

| Role | Trách nhiệm |
|------|------------|
| **Project Manager** | Timeline, scope, stakeholder |
| **Product Owner** | Requirements, priority, acceptance |
| **Tech Lead** | Architecture, code quality, technical decisions |
| **Dev Team** | Implement theo standards, tests, docs |
| **DevOps** | CI/CD, infra, monitoring, security |
| **QA** | Test strategy, E2E, performance test |
| **Researcher** | Papers, models, experiments |

### Review Chain

```
Developer → Self-review → PR → Code Owner → Tech Lead (nếu critical) → Merge
```

---

## 📚 XVI. REFERENCE

### Bắt buộc đọc
1. [BA_DOCUMENT.md](../01-business/BA_DOCUMENT.md)
2. [PROJECT_MANAGEMENT_PLAN.md](../01-business/PROJECT_MANAGEMENT_PLAN.md)
3. [PROJECT_STRUCTURE.md](../01-business/PROJECT_STRUCTURE.md)

### Coding Standards chi tiết
- [Frontend Style Guide](../03-development/coding-standards/frontend-styleguide.md)
- [Java Style Guide](../03-development/coding-standards/java-styleguide.md)
- [Node Style Guide](../03-development/coding-standards/node-styleguide.md)
- [Python Style Guide](../03-development/coding-standards/python-styleguide.md)

### Workflow
- [Git Workflow](../03-development/git-workflow.md)
- [Code Review Checklist](../03-development/code-review-checklist.md)
- [Testing Strategy](../03-development/testing-strategy.md)

---

## ✍️ COMMITMENT

Mỗi thành viên khi join dự án **PHẢI:**
1. ✅ Đọc toàn bộ file này
2. ✅ Đọc BA_DOCUMENT.md và PROJECT_MANAGEMENT_PLAN.md
3. ✅ Setup local dev thành công
4. ✅ Pass coding quiz (Tech Lead sẽ test)
5. ✅ Sign-off vào [PROJECT_RULES.md](../01-business/PROJECT_RULES.md) trong Slack #ioes-rules channel

---

**Version Control:**
- v1.0 (12/08/2026) - Initial release
- Thay đổi phải được Tech Lead + PM approve

**END OF DOCUMENT**
