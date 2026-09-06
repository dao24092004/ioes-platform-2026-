# Repo Rules Checklist — for the "remove mock data from apps/web" wave

Sources read: `docs/01-business/PROJECT_RULES.md` (authority), `docs/01-business/PROJECT_STRUCTURE.md`,
`CONTRIBUTING.md`, `ONBOARDING.md`, `.cursor/rules/*.mdc` (00–08), `docs/02-architecture/adr/*`,
`docs/03-development/git-workflow.md`, `docs/03-development/testing-strategy.md`,
`docs/03-development/code-review-checklist.md`, `docs/03-development/coding-standards/*.md`.

Compiled 2026-08-31. Read-only research; nothing was modified.

---

## 1. Branch, commit, PR

### Branch naming (PROJECT_RULES.md §II.2.2, git-workflow.md §1.3, .cursor/rules/05-git-commits.mdc)
Format: `<type>/PROJ-<id>-<short-desc>`, always cut from `develop` (except `hotfix/*` from `main`).
Types: `feature`, `bugfix`, `hotfix`, `refactor`, `docs`, `test`, `chore`.

- ✅ Correct: `feature/PROJ-123-add-oauth-google`
- ❌ Incorrect: `feature/login` (no Jira id), `my-branch`, `fix`, `test-branch`

### Commit message — Conventional Commits (PROJECT_RULES.md §II.2.3, git-workflow.md §3)
Format: `<type>(<scope>): <subject>` + optional body (wrap 100 chars) + footer `Refs: PROJ-123`.
Rules: subject ≤ 72 chars, imperative mood, no capital first letter, no trailing period.
Scope = service/module name (`auth`, `exam`, `content`, `ai`, `blockchain`, `analytics`, `notification`, `web`/`frontend`, `deps`, `ci`).

- ✅ Correct: `feat(auth): add OAuth2 Google login`
- ❌ Incorrect: `update code`, `fix bug`, `Login feature added`, `WIP`

### Pull Request (PROJECT_RULES.md §II.2.4, CONTRIBUTING.md §4, git-workflow.md §4)
- Title: `[PROJ-XXX] <type>(<scope>): <subject>` — e.g. `[PROJ-123] feat(auth): add Google OAuth2 login`
- ❌ Incorrect: `PR title: "update"`, empty description
- Must: full description via template, linked Jira ticket, CI green (lint+tests), coverage not decreased, ≥1 reviewer approval, no conflicts with develop/main
- ❌ **CẤM: self-approve** ("Tự approve" is explicitly listed as SAI)
- Required reviewers: **1+ Code Owner** for the touched service, **+ Tech Lead approval for critical/breaking changes**
- Size guidance: PR < 400 changed lines (split if larger); no direct commits to main/develop; no force-push once review has started
- Review SLA scales with size (4h/<100 lines up to 24h/>500 lines)

## 2. When an ADR is required

Rule quoted (PROJECT_RULES.md §Golden Rule 2 / §IV):
> "Mọi thay đổi kiến trúc **PHẢI** được tạo **ADR** ... trong `docs/02-architecture/adr/`" and "Mọi thay đổi **PHẢI** được **Tech Lead review** trước khi code."

What counts as an architecture change (inferred from existing ADRs' scope): choice/swap of a datastore or DB technology (ADR-001, dgraph), cross-cutting resilience patterns (ADR-002 retry/circuit-breaker), observability strategy (ADR-003), event-processing semantics (ADR-004), caching strategy (ADR-005), service discovery/gateway/event-bus wiring (ADR-006), shared-secret/config handling across services (ADR-008), gateway timeout/circuit-breaker policy (ADR-009), infra port conflicts (ADR-010), schema evolution of a shared store (ADR-011), moving domain ownership between services (ADR-012). **New backend endpoints and DB migrations for this wave are architecture-relevant if they change service boundaries, add cross-service coupling, or introduce a new datastore/pattern — plain CRUD additions inside an existing service's existing layers likely do not need one, but ambiguous cases should default to writing an ADR per Rule 2's Tech-Lead-review requirement.**

- **Location:** `docs/02-architecture/adr/`
- **Naming/numbering:** `ADR-{NNN}-{kebab-title}.md`, zero-padded 3 digits, strictly incrementing. **Note: the sequence currently jumps ADR-006 → ADR-008 (ADR-007 is missing/skipped).** The next new ADR must be **ADR-013**, not 007.
- **Required content**, based on existing ADRs (all follow the same template, e.g. ADR-008):
  - Header block: title, `> Status:` (Proposed / Accepted / Draft), `> Date:`, `> Decision Makers:`, `> Related Documents:` (with links back to PROJECT_RULES.md Rule 2, service-boundaries.md, BA_DOCUMENT.md, PROJECT_STRUCTURE.md as applicable)
  - `## 1. Context` (with subsections for the problem/incident, scope of impact, requirements)
  - `## 2. Decision` (the rule/golden rule adopted, config/implementation pattern, workflow)
  - `## 3. Implementation Plan` (Done/Pending items, dated)
  - `## 4. Alternatives Considered`
  - `## 5. Test Strategy`
  - `## 6. Consequences` (Positive / Negative / Risks subsections)
  - `## 7. References`

## 3. Database

- **Migration naming:** `V{n}__{name}.sql`, in `database/migrations/{service}/` (PROJECT_RULES.md §I.2, §IV.4.3; PROJECT_STRUCTURE.md naming table). Sequential integer version, no gaps expected (existing exam-service goes V1→V4).
- **⚠️ Directory-naming inconsistency found:** the rule's placeholder is `{service}`, but actual migration files live under **`{service}-service`** folders (`auth-service/`, `content-service/`, `exam-service/`, `notification-service/`) while the short-named folders (`auth/`, `content/`, `exam/`, `analytics/`, `blockchain/`) exist only as empty `.gitkeep` placeholders. New migrations for this wave should follow the **existing precedent** (`{service}-service/`) over the literal rule text, and this should be flagged to the Tech Lead rather than silently picking one.
- **No editing applied migrations:** "Migration chỉ chạy 1 chiều (không sửa file đã chạy)" — never edit a migration once it has run; write a new one.
- **Rollback:** "Rollback script cho mỗi migration quan trọng" is required by the rules, but **no rollback scripts exist anywhere in `database/` today** — this is pre-existing unenforced debt, not a green precedent to copy.
- **Seed placement:** `database/seeds/{service}/*.sql` (existing precedent: `database/seeds/exam-service/dev-seed.sql`).
- **Foreign keys:** ❌ no FKs across service databases (database-per-service; Rule/§IV.1, §IV.4.3) — this applies to new backend endpoints too if they touch multiple services' data.
- **Soft delete:** mandatory `deleted_at` column, never hard-delete; plus mandatory audit fields `created_at, updated_at, created_by, updated_by`; **UUID v7 preferred for PKs** over auto-increment.

## 4–7 condensed: items that would get a PR rejected outright

**Testing (would reject, not just annoy):**
- No PR merges without tests at all (Golden Rule 3).
- Coverage floors are hard gates: **95% critical paths (auth/payment/grading)**, 85% business logic, 80% controllers, 70% UI components — "coverage không giảm" (must not regress) is a required CI/PR checklist item, and "coverage < 80%" overall is explicitly listed as a ❌ CẤM item in CONTRIBUTING.md §7.1.
- Test files must be co-located per language convention (`*.spec.ts`/`*.e2e-spec.ts` for Node, `src/test/java/...` mirroring package for Java, `tests/` for Python) — CI enforces this indirectly via coverage tooling paths.
- `it.skip`/skipped tests without justification are forbidden.

**File/directory placement (would reject):**
- React page → `apps/web/src/pages/{role}/`; component → `apps/web/src/components/{domain}/`; API client → `apps/web/src/services/api/{resource}.api.ts`. Any new doc for this wave must go under the existing `docs/` numbered subtree (e.g. an ADR under `02-architecture/adr/`, not a new top-level docs folder) — creating a directory outside `PROJECT_STRUCTURE.md` is explicitly ❌ CẤM ("KHÔNG tạo thư mục ngoài cấu trúc"), which is exactly what putting this very research file under `docs/superpowers/research/` does — **flag this to the user**: `docs/superpowers/` is not in `PROJECT_STRUCTURE.md`'s documented tree (`01-business` … `06-user`) and violates §I.1/§I.3 of PROJECT_RULES.md and Q7 of ONBOARDING.md ("không được tự tạo thư mục mới trừ khi Tech Lead approve").
- ❌ CẤM outright: `.js` files (TS/TSX only), Java files outside `com.ioes.*`, Python files at a service root, hardcoded secrets/URLs, committed `.env`, `console.log`/`System.out.println`/`print()` in production code.

**Coding standards that get PRs rejected:**
- React: class components, `any` type, inline styles for complex UI, direct DOM manipulation — all ❌ CẤM.
- Java: field injection (`@Autowired` on fields — must be constructor injection), `System.out.println`, unchecked `Optional.get()`, raw `List`/`Map`, magic numbers.
- Node/NestJS: `any` type, `console.log`, business logic in controllers, empty catch blocks, `.js` files.
- Python: missing type hints, mutable default args, bare `except`, wildcard imports, `Any` type, `print()`.
- Universal: file > 500 lines, method > 50 lines must split (CONTRIBUTING.md/checklist).

**Security (would reject):**
- No hardcoded credentials/secrets/URLs anywhere; no `.env`/`.pem`/`.key` committed.
- **JWT_SECRET must load from env with NO default fallback** in any language (Java `${JWT_SECRET}` no `:default`, Node `requiredSecret('JWT_SECRET')`, Python `Field(...)` no default) — this is a post-mortem-driven rule (ADR-008) with a CI gate script `scripts/ci-check-jwt-secret.sh` that blocks merge on failure.
- Every new endpoint must have: authentication (JWT/OAuth2), authorization (RBAC), input validation, rate limiting, no logged secrets/PII/passwords/tokens.
- Architecture: ❌ CẤM direct REST between services (must go through API Gateway) and ❌ CẤM shared databases/cross-service FKs — relevant since this wave may add new endpoints.
