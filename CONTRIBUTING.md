# 🤝 CONTRIBUTING TO IOES

> **Hướng dẫn đóng góp vào dự án IOES** — Áp dụng cho mọi thành viên team

---

## 📋 MỤC LỤC

1. [Quy trình đóng góp](#1-quy-trình-đóng-góp)
2. [Trước khi code](#2-trước-khi-code)
3. [Trong khi code](#3-trong-khi-code)
4. [Tạo Pull Request](#4-tạo-pull-request)
5. [Code Review](#5-code-review)
6. [Sau khi merge](#6-sau-khi-merge)
7. [Quy tắc bắt buộc](#7-quy-tắc-bắt-buộc)

---

## 1. QUY TRÌNH ĐÓNG GÓP

```
1. Đọc [PROJECT_RULES.md](./docs/01-business/PROJECT_RULES.md) ← BẮT BUỘC
2. Pick task từ Jira backlog
3. Tạo branch: feature/PROJ-123-desc
4. Code + Test
5. Tạo Pull Request
6. Review + Approve
7. Merge to develop
```

### 1.1 Vòng đời của 1 feature

```
Jira Ticket → Branch → Code → Test → PR → Review → Merge → Deploy → Monitor
```

---

## 2. TRƯỚC KHI CODE

### 2.1 Đọc tài liệu (BẮT BUỘC)

Tùy theo vai trò, đọc theo [Learning Path trong README.md](./README.md#3-learning-path-theo-vai-trò):

- 🆕 **Developer mới:** Đọc `PROJECT_RULES.md`, `PROJECT_STRUCTURE.md`, style guide của ngôn ngữ bạn
- 🎨 **Frontend:** `frontend-styleguide.md`
- ☕ **Java:** `java-styleguide.md`, `service-boundaries.md`
- 🟢 **Node.js:** `node-styleguide.md`, `service-boundaries.md`
- 🐍 **AI/ML:** `python-styleguide.md`, papers trong `docs/02-architecture/`

### 2.2 Setup môi trường

```bash
# 1. Clone repo
git clone <repo-url>
cd AiProject

# 2. Đọc rules
cat docs/01-business/PROJECT_RULES.md

# 3. Cài deps
pnpm install

# 4. Setup env
cp .env.example .env

# 5. Start Docker services
make setup-dev

# 6. Migrate + seed
make migrate
make seed

# 7. Verify
make dev
make health-check
```

### 2.3 Pick task

```bash
# 1. Đăng nhập Jira
# 2. Vào project IOES board
# 3. Pick task từ "To Do" column
# 4. Assign cho mình
# 5. Move to "In Progress"
```

---

## 3. TRONG KHI CODE

### 3.1 Tạo branch

```bash
# Luôn từ develop
git checkout develop
git pull origin develop

# Tạo branch theo convention
git checkout -b feature/PROJ-123-add-oauth-google
```

**Naming convention:**
- `feature/PROJ-123-desc` - Tính năng mới
- `bugfix/PROJ-456-desc` - Bug fix
- `hotfix/PROJ-789-desc` - Critical hotfix
- `refactor/PROJ-234-desc` - Refactor
- `docs/PROJ-345-desc` - Documentation
- `test/PROJ-456-desc` - Test only
- `chore/PROJ-567-desc` - Build, deps

### 3.2 Code theo standards

```bash
# Trước khi commit
make lint                # Lint
make format              # Format
make type-check          # TypeScript check
make test                # Run tests
```

### 3.3 Commit theo convention

```bash
# Format: <type>(<scope>): <subject>

# ✅ Tốt
git commit -m "feat(auth): add Google OAuth2 login

Implement OAuth2 with Google provider. User can now sign in
with Google account.

- Add OAuth2 flow
- Update LoginUseCase
- Add tests

Refs: PROJ-123"

# ❌ Tệ
git commit -m "update"
git commit -m "fix bug"
git commit -m "WIP"
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

### 3.4 Đồng bộ với develop thường xuyên

```bash
# Trước khi tạo PR
git fetch origin
git rebase origin/develop
# Hoặc
git merge origin/develop
```

---

## 4. TẠO PULL REQUEST

### 4.1 Push branch

```bash
git push -u origin feature/PROJ-123-add-oauth-google
```

### 4.2 Tạo PR trên GitHub

**Title format:**
```
[PROJ-123] feat(auth): add Google OAuth2 login
```

**Description template:**
```markdown
## Jira Ticket
[PROJ-123](https://jira.ioes.com/browse/PROJ-123)

## Type
- [ ] Feature
- [ ] Bugfix
- [ ] Refactor
- [ ] Docs
- [ ] Test
- [ ] Chore

## Breaking Change
- [ ] Yes
- [ ] No

## Description
Brief description of what this PR does.

## Changes
- Change 1
- Change 2
- Change 3

## Screenshots (nếu có UI)

## Testing
- [ ] Unit tests added (coverage ≥ target)
- [ ] Integration tests added
- [ ] E2E tests added (nếu cần)
- [ ] Manual testing done

## Checklist
- [ ] Code follows [style guide](./docs/03-development/coding-standards/)
- [ ] All tests pass locally
- [ ] Coverage not decreased
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tested on multiple browsers (nếu frontend)
- [ ] Backward compatible (hoặc document breaking changes)
```

### 4.3 Assign reviewers

```bash
# Ấn vào "Reviewers" → Chọn:
- 1 Code Owner (cho service đó)
- Tech Lead (cho critical changes)
```

---

## 5. CODE REVIEW

### 5.1 Review SLA

| PR Size | Review SLA |
|---------|-----------|
| < 100 dòng | 4 giờ |
| 100-300 dòng | 8 giờ |
| 300-500 dòng | 16 giờ |
| > 500 dòng | 24 giờ (hoặc chia nhỏ) |

### 5.2 Review checklist

Reviewer dùng [code-review-checklist.md](./docs/03-development/code-review-checklist.md) để review.

**Author PHẢI verify:**
- [ ] Tests pass
- [ ] Coverage ≥ target
- [ ] Lint pass
- [ ] Type check pass
- [ ] No conflict
- [ ] Build pass

### 5.3 Phản hồi review

```bash
# 1. Push fix
git add .
git commit -m "fix(auth): address review comments"
git push

# 2. Trả lời comments trên GitHub
# - Giải thích lý do
# - Hoặc "Done" + link commit

# 3. Re-request review
```

---

## 6. SAU KHI MERGE

### 6.1 Cleanup

```bash
# 1. Pull develop
git checkout develop
git pull origin develop

# 2. Xóa branch local
git branch -d feature/PROJ-123-add-oauth-google

# 3. Xóa remote (nếu chưa auto)
git push origin --delete feature/PROJ-123-add-oauth-google
```

### 6.2 Monitor

- ✅ Check CI/CD pipeline
- ✅ Check deployment logs
- ✅ Test trên staging
- ✅ Update Jira ticket → Done

---

## 7. QUY TẮC BẮT BUỘC

### 7.1 🚨 CẤM

| ❌ CẤM | Lý do |
|---------|-------|
| Commit trực tiếp vào main/develop | Phải qua PR |
| Force push sau khi review started | Mất review history |
| Skip test với lý do không rõ | Coverage giảm |
| Hardcode secrets, URLs | Security risk |
| `console.log` / `System.out.println` / `print()` | Production log |
| `any` type (TypeScript) | Mất type safety |
| Field injection (Java) | Khó test |
| Magic numbers | Khó maintain |
| Code > 500 dòng/file | Phải chia nhỏ |
| Coverage < 80% | Quality issue |
| Reference issue không có | Không trace được |

### 7.2 ✅ BẮT BUỘC

| ✅ BẮT BUỘC | Lý do |
|-------------|-------|
| Đọc PROJECT_RULES.md trước | Hiểu quy tắc |
| Follow coding style guide | Consistency |
| Write tests (≥ 80% coverage) | Quality |
| Update documentation | Knowledge sharing |
| Reference Jira ticket | Traceability |
| Self-review trước khi assign | Reduce review time |
| Address review comments | Collaboration |
| Run linter + format trước commit | Clean code |

---

## 📞 CẦN HỖ TRỢ?

| Vấn đề | Liên hệ |
|---------|---------|
| Không hiểu requirement | Product Owner |
| Câu hỏi về architecture | Tech Lead |
| Lỗi CI/CD | DevOps |
| Lỗi tools/setup | Backend Lead |
| Câu hỏi về coding style | Tech Lead |
| Cần review gấp | Reviewer + Tech Lead |

**Slack channels:**
- `#ioes-dev` - Câu hỏi chung
- `#ioes-help` - Trợ giúp
- `#ioes-alerts` - Production alerts

---

## 📚 TÀI LIỆU LIÊN QUAN

- 📋 [PROJECT_RULES.md](./docs/01-business/PROJECT_RULES.md) - **Master rules**
- 📁 [PROJECT_STRUCTURE.md](./docs/01-business/PROJECT_STRUCTURE.md) - Folder structure
- 🌿 [Git Workflow](./docs/03-development/git-workflow.md) - Chi tiết về Git
- ✅ [Code Review Checklist](./docs/03-development/code-review-checklist.md) - Review guide
- 🧪 [Testing Strategy](./docs/03-development/testing-strategy.md) - Testing guide
- 🎨 [Coding Standards](./docs/03-development/coding-standards/) - Style guides

---

**Version:** 1.0
**Last updated:** 12/08/2026
