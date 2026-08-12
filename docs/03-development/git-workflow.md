# 🌿 Git Workflow Guide
## GitFlow + Conventional Commits cho IOES

> **Áp dụng cho:** Toàn bộ team
> **Owner:** Tech Lead + Dev Team

---

## 1. GITFLOW BRANCHING MODEL

### 1.1 Branch Structure

```
┌─────────────────────────────────────────────────────┐
│ main (production)                                    │
│ - Luôn stable, đã qua test                         │
│ - Mỗi commit = 1 release version                   │
│ - Tag theo semantic versioning                      │
└────────────────────┬────────────────────────────────┘
                     │ merge PR (release)
                     ↓
┌─────────────────────────────────────────────────────┐
│ develop (integration)                                │
│ - Branch chính cho development                     │
│ - Tất cả feature branch merge vào đây              │
│ - Auto deploy to staging                            │
└────┬────────┬────────┬────────┬─────────────────────┘
     │        │        │        │
     ↓        ↓        ↓        ↓
┌─────────┐ ┌──────┐ ┌──────┐ ┌────────────┐
│feature/ │ │bugfix│ │hotfix│ │ release/   │
│PROJ-123│ │/PROJ │ │/PROJ │ │ v1.2.0     │
└─────────┘ └──────┘ └──────┘ └────────────┘
```

### 1.2 Branch Types

| Branch | Từ | Merge vào | Mục đích | Naming |
|--------|----|-----------| ---------|--------|
| `main` | — | — | Production code | `main` |
| `develop` | `main` | `main` (qua release) | Integration | `develop` |
| `feature/*` | `develop` | `develop` | Tính năng mới | `feature/PROJ-123-desc` |
| `bugfix/*` | `develop` | `develop` | Bug fix trong dev | `bugfix/PROJ-456-desc` |
| `hotfix/*` | `main` | `main` + `develop` | Critical fix production | `hotfix/PROJ-789-desc` |
| `release/*` | `develop` | `main` + `develop` | Chuẩn bị release | `release/v1.2.0` |
| `refactor/*` | `develop` | `develop` | Refactor code | `refactor/PROJ-234-desc` |
| `docs/*` | `develop` | `develop` | Documentation | `docs/PROJ-345-desc` |
| `test/*` | `develop` | `develop` | Test only | `test/PROJ-456-desc` |
| `chore/*` | `develop` | `develop` | Build, deps | `chore/PROJ-567-desc` |

### 1.3 Naming Convention (BẮT BUỘC)

```bash
# ✅ ĐÚNG
feature/PROJ-123-add-oauth-google
feature/PROJ-124-implement-exam-timer
bugfix/PROJ-456-fix-timer-countdown
hotfix/PROJ-789-critical-auth-bypass
refactor/PROJ-234-extract-user-service
docs/PROJ-345-update-setup-readme

# ❌ SAI
feature/login                  # Thiếu Jira ID
feature/PROJ-123              # Thiếu description
login-feature                 # Sai format
PROJ-123-add-login            # Thiếu type
```

---

## 2. WORKFLOW CHO DEVELOPER

### 2.1 Bắt đầu task mới

```bash
# 1. Cập nhật develop branch
git checkout develop
git pull origin develop

# 2. Tạo feature branch mới
git checkout -b feature/PROJ-123-add-oauth-google

# 3. Code, commit, push
git add .
git commit -m "feat(auth): add Google OAuth2 login"
git push -u origin feature/PROJ-123-add-oauth-google

# 4. Tạo Pull Request trên GitHub
# - Title: [PROJ-123] feat(auth): add Google OAuth2 login
# - Link to Jira ticket
# - Fill PR template
# - Request reviewers
```

### 2.2 Trong quá trình code

```bash
# Đồng bộ với develop thường xuyên
git fetch origin
git rebase origin/develop  # Hoặc merge

# Hoặc merge develop vào feature branch
git merge origin/develop
```

### 2.3 Sau khi PR được merge

```bash
# 1. Pull develop mới nhất
git checkout develop
git pull origin develop

# 2. Xóa feature branch local
git branch -d feature/PROJ-123-add-oauth-google

# 3. Xóa remote branch (đã auto nếu dùng GitHub PR)
git push origin --delete feature/PROJ-123-add-oauth-google
```

---

## 3. CONVENTIONAL COMMITS

### 3.1 Format (BẮT BUỘC)

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 3.2 Types

| Type | Mục đích | Ví dụ |
|------|----------|-------|
| `feat` | Tính năng mới | `feat(auth): add OAuth2 Google login` |
| `fix` | Bug fix | `fix(exam): correct timer when tab inactive` |
| `docs` | Tài liệu | `docs(readme): update setup guide` |
| `style` | Format code | `style(web): fix eslint warnings` |
| `refactor` | Refactor (không đổi behavior) | `refactor(content): extract file upload service` |
| `perf` | Performance | `perf(analytics): add Redis cache for dashboard` |
| `test` | Thêm/sửa test | `test(auth): add unit test for JWT validation` |
| `chore` | Build, deps, tooling | `chore(deps): upgrade Spring Boot to 3.3.0` |
| `ci` | CI/CD | `ci(github): add E2E workflow` |
| `revert` | Revert commit | `revert: feat(auth): add OAuth2` |

### 3.3 Scope

Scope phải là **service name** hoặc **module name**:

```
(auth)            → auth-service
(exam)            → exam-suite
(content)         → content-service
(ai)              → ai-suite
(blockchain)      → blockchain-suite
(analytics)       → analytics-service
(notification)    → notification-service
(frontend/web)    → apps/web
(deps)            → Dependencies
(ci)              → CI/CD
```

### 3.4 Rules

```bash
# ✅ Subject rules
- Dùng imperative mood: "add" KHÔNG phải "added" hay "adds"
- Không viết hoa chữ cái đầu
- Không có dấu chấm cuối
- Tối đa 72 ký tự
- Giải thích "what" và "why", không phải "how"

# ✅ Body rules (optional)
- Wrap ở 100 ký tự
- Giải thích motivation cho change
- Contrast với previous behavior

# ✅ Footer rules
- Reference Jira: PROJ-123
- Breaking changes: BREAKING CHANGE: ...
```

### 3.5 Examples

```bash
# ✅ Tốt
git commit -m "feat(auth): add JWT refresh token rotation

Implement automatic refresh token rotation to improve security.
When access token expires, the system now automatically uses
refresh token to get a new access token without user re-login.

- Add RefreshToken entity with TTL
- Update AuthService to handle rotation
- Add tests for token rotation flow

Refs: PROJ-123"

# ✅ Đơn giản
git commit -m "fix(exam): correct timer countdown when tab is inactive

Refs: PROJ-456"

# ✅ Breaking change
git commit -m "feat(api)!: change authentication endpoint path

BREAKING CHANGE: The /auth/login endpoint has been renamed to
/api/v1/auth/login. Update all client applications.

Refs: PROJ-789"

# ❌ SAI
git commit -m "update"
git commit -m "Fixed bug"
git commit -m "Added new feature"
git commit -m "feat: stuff"
git commit -m "feat(auth): add login. (missing details, trailing dot)"
```

---

## 4. PULL REQUEST PROCESS

### 4.1 Tạo PR

```markdown
## PR Title Format
[PROJ-XXX] <type>(<scope>): <subject>

## PR Template
**Jira Ticket:** [PROJ-123](link)
**Type:** Feature | Bugfix | Refactor | Docs | Test
**Breaking Change:** Yes | No

### Description
Brief description of what this PR does.

### Changes
- Change 1
- Change 2
- Change 3

### Screenshots (nếu có UI changes)

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing done

### Checklist
- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Coverage not decreased
```

### 4.2 Review Process

```bash
# 1. Auto checks (CI)
- Lint pass
- Tests pass
- Build pass
- Coverage check

# 2. Required reviewers
- 1+ Code Owner approval
- Tech Lead approval (choặc critical changes)

# 3. Rules
- PR < 400 dòng changes (nếu nhiều hơn, chia nhỏ)
- Tối đa 2-3 commits per PR (squash nếu nhiều)
- Resolve tất cả comments
- Không force-push sau khi review
```

### 4.3 Merge Strategy

```yaml
# Squash merge (cho feature branches)
- 1 commit = 1 feature
- Dễ revert
- History clean

# Merge commit (cho release branches)
- Preserve full history
- Dùng cho release và hotfix

# Rebase merge
- Linear history
- Dùng cho small fixes
```

---

## 5. RELEASE PROCESS

### 5.1 Tạo release

```bash
# 1. Tạo release branch từ develop
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# 2. Update version
# - package.json
# - pom.xml
# - pyproject.toml
# - CHANGELOG.md

# 3. Final testing & bug fixes
git commit -m "chore(release): bump version to 1.2.0"

# 4. Merge vào main
git checkout main
git merge --no-ff release/v1.2.0
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin main --tags

# 5. Merge ngược vào develop
git checkout develop
git merge --no-ff release/v1.2.0
git push origin develop

# 6. Xóa release branch
git branch -d release/v1.2.0
git push origin --delete release/v1.2.0
```

### 5.2 Hotfix

```bash
# 1. Tạo hotfix branch từ main
git checkout main
git checkout -b hotfix/PROJ-789-critical-fix

# 2. Fix bug
git commit -m "fix(auth): patch critical security vulnerability"

# 3. Merge vào main
git checkout main
git merge --no-ff hotfix/PROJ-789-critical-fix
git tag -a v1.2.1 -m "Hotfix 1.2.1"
git push origin main --tags

# 4. Merge vào develop
git checkout develop
git merge --no-ff hotfix/PROJ-789-critical-fix
git push origin develop

# 5. Xóa hotfix branch
git branch -d hotfix/PROJ-789-critical-fix
```

---

## 6. SEMANTIC VERSIONING

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes
MINOR: New features (backward compatible)
PATCH: Bug fixes (backward compatible)

Examples:
1.0.0 → Initial release
1.0.1 → Bug fix
1.1.0 → New feature
2.0.0 → Breaking change
```

---

## 7. COMMIT HYGIENE

### 7.1 DO

```bash
# ✅ Atomic commits (1 commit = 1 logical change)
git commit -m "feat(auth): add user registration endpoint"
git commit -m "test(auth): add tests for registration"
git commit -m "docs(api): update auth API documentation"

# ✅ Reference issues
git commit -m "fix(exam): correct scoring logic

The previous scoring was off by one for multi-choice questions.
This was due to incorrect index handling.

Fixes: PROJ-456"
```

### 7.2 DON'T

```bash
# ❌ Mixed concerns
git commit -m "fix auth and update dashboard and add new feature"

# ❌ WIP commits (dùng --amend hoặc rebase)
git commit -m "WIP"
git commit -m "TODO: fix later"

# ❌ Secrets in commits
git commit -m "add config"
# file chứa: API_KEY=sk-xxxxx

# ❌ Generated files
git add dist/
git add node_modules/
```

### 7.3 Undo commits

```bash
# Undo commit cuối (giữ changes)
git reset --soft HEAD~1

# Undo commit cuối (xóa changes)
git reset --hard HEAD~1

# Revert 1 commit (tạo commit mới đảo ngược)
git revert <commit-hash>

# Amend commit cuối
git commit --amend -m "feat(auth): add OAuth2 login (corrected)"
```

---

## 8. .GITIGNORE QUAN TRỌNG

Đảm bảo `.gitignore` đã có:

```gitignore
# Secrets
.env
*.pem
*.key
secrets/

# Build outputs
dist/
build/
target/
node_modules/

# IDE
.idea/
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Test artifacts
coverage/
.nyc_output/

# Dependency locks (nếu dùng pnpm/npm workspaces)
# pnpm-lock.yaml
# package-lock.json
```

---

## 9. GIT HOOKS (Husky)

### 9.1 Pre-commit

```bash
#!/bin/sh
# .husky/pre-commit

# Lint
pnpm lint-staged

# Type check
pnpm exec tsc --noEmit

# Tests for changed files
pnpm exec jest --related
```

### 9.2 Commit-msg

```bash
#!/bin/sh
# .husky/commit-msg

# Validate commit message format
pnpm exec commitlint --edit "$1"
```

### 9.3 Pre-push

```bash
#!/bin/sh
# .husky/pre-push

# Run full test suite
pnpm test

# Build check
pnpm build
```

---

## 10. CODE OF CONDUCT

```yaml
# Git Etiquette
- Respect review comments
- Respond to PR reviews within 24h
- Mark conversations as resolved
- Don't force-push after review started
- Use draft PR for WIP
- Tag reviewers appropriately
- Don't commit directly to main/develop
- Always rebase before merge
```

---

## 📚 REFERENCE

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitFlow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Semantic Versioning](https://semver.org/)
- [Project Rules](../01-business/PROJECT_RULES.md)

---

**Version:** 1.0
**Last updated:** 12/08/2026
