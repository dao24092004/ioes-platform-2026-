# Wave 2 — small wins: gateway routes, analytics, notification inbox

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the leaderboard, streak and admin-notification pages serve real data, fix two broken gateway routes, and relocate this project's planning docs into the sanctioned `docs/` tree — without writing any new business domain.

**Architecture:** No new services and no new architecture. Two config fixes in api-gateway, a build-and-run pass over analytics-service, and one real implementation (notification inbox) that gains the same token-validating filter auth-service already uses. Each task ships as its own PR to stay under the 400-line rule.

**Tech Stack:** Spring Boot 3.3 + Spring Security 6 (auth, analytics, notification), Spring Cloud Gateway, React 18 + TanStack Query (web), Flyway, JUnit 5, Vitest.

**Spec:** none — the scope came from `docs/03-development/research/2026-08-31-backend-endpoint-inventory.md`, which is the binding source for what exists.

## Global Constraints

Every task inherits these. They come from `docs/01-business/PROJECT_RULES.md`.

- **Branch:** `<type>/<desc>` off `develop`. The rule wants `<type>/PROJ-<id>-<desc>`; the user decided on 2026-08-31 to work without a Jira id, so every PR must carry that deviation in its description.
- **Commit:** Conventional Commits, subject ≤ 72 characters, imperative, no capital first letter, no trailing period.
- **PR:** under 400 lines of diff. Split rather than exceed. No self-approval.
- **Migrations:** never edit one that has run; add a new `V{n}__{name}.sql` under `database/migrations/{service}-service/`.
- **Tests:** required for every behaviour change. Coverage floors: 95% auth/payment/grading, 85% business logic, 80% controllers, 70% UI.
- **Forbidden and a reviewer will reject on sight:** `any` in TypeScript, class components, Java field injection, `console.log` / `print()` / `System.out.println`, hardcoded secrets or URLs, direct service-to-service REST that bypasses the gateway, one service reading another's database, new directories outside `PROJECT_STRUCTURE.md`.
- **Rate limiting:** the rules require it on new endpoints; the platform has no mechanism at all. The user decided on 2026-08-31 to defer it. Do NOT add one; every PR touching an endpoint records the deviation.
- **Known-good baselines, do not try to fix:** `pnpm type-check` in `apps/web` reports 17 pre-existing errors in five untouched files; `exam.service.spec.ts` has one pre-existing failure (`cancelAttempt › should_cancel_When_ownerAndActive`); the CI pipeline fails at its pnpm setup step on `develop` too.

---

### Task 1: Move planning docs into the sanctioned tree

**Files:**
- Move: `docs/superpowers/specs/2026-08-30-web-exam-profile-real-backend-design.md` → `docs/03-development/specs/`
- Move: `docs/superpowers/plans/2026-08-31-web-exam-profile-real-backend.md` → `docs/03-development/plans/`
- Move: `docs/03-development/research/2026-08-31-backend-endpoint-inventory.md` and `2026-08-31-repo-rules-checklist.md` → `docs/03-development/research/`
- Delete: the now-empty `docs/superpowers/` tree

**Interfaces:** none — documentation only.

- [ ] **Step 1: Move the files with git so history follows**

```bash
cd "D:/EPU/NCKH/1 ti 5/Code"
mkdir -p docs/03-development/specs docs/03-development/plans docs/03-development/research
git mv docs/superpowers/specs/*.md docs/03-development/specs/
git mv docs/superpowers/plans/*.md docs/03-development/plans/
git mv docs/03-development/research/*.md docs/03-development/research/
```

- [ ] **Step 2: Fix every reference to the old paths**

Run `grep -rn "docs/superpowers" --include=*.md . | grep -v node_modules` and update each hit to the new location. The plan and spec cross-reference each other, and this plan file itself names the research doc.

- [ ] **Step 3: Confirm nothing is left behind**

Run: `ls docs/superpowers 2>/dev/null; git status --short`
Expected: the directory is gone, and `git status` shows only renames.

- [ ] **Step 4: Commit**

```bash
git add -A docs
git commit -m "docs: move planning docs under the sanctioned docs tree"
```

---

### Task 2: Fix the two broken gateway routes

**Files:**
- Modify: `services/api-gateway/src/main/resources/application.yml`
- Test: `services/api-gateway/src/test/java/com/ioes/gateway/` — add a routing assertion if the service already has a test for its route table; if it has none, say so in the report rather than scaffolding a new test framework.

**Interfaces:**
- Produces: `/api/certificates/**` reaches blockchain-suite's `certificates` controller instead of 404ing.

- [ ] **Step 1: Correct the certificates route**

The route `Path=/api/blockchain/**,/api/certificates/**` uses `StripPrefix=2`, so `/api/certificates/verify/123` arrives as `/verify/123` while the controller serves `/certificates/verify/123`. Change that route to `StripPrefix=1`.

- [ ] **Step 2: Deal with the `/api/blockchain/**` half of the same predicate**

No controller in `services/blockchain-suite` serves a `blockchain` prefix, so with `StripPrefix=1` that path 404s at the service instead of the gateway. Split it into its own route entry with a comment naming the missing controller, or leave it in place with the comment — pick one, and justify the choice in your report. Do not invent a controller.

- [ ] **Step 3: Rebuild and prove the route with the service down and up**

```bash
cd "D:/EPU/NCKH/1 ti 5/Code/services/api-gateway" && mvn clean package -DskipTests -q
```

Note: `mvn package` without `clean` silently keeps a stale `application.yml` inside the jar — always `clean` here. Restart the gateway, then with blockchain-suite NOT running, `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/certificates/verify/x` must return a gateway fallback (503), not a 404 from a wrong path. Record the actual codes.

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(gateway): route /api/certificates to the prefix the controller exposes"
```

---

### Task 3: Build and run analytics-service, verify the two pages that already call it

**Files:**
- Possibly modify: `services/analytics-service/**` only if it fails to build or boot
- No web changes expected — `student/LeaderboardPage.tsx` and `student/StreakPage.tsx` already call `services/api/analytics.api.ts`

**Interfaces:**
- Consumes: `GET /api/analytics/leaderboard`, `GET /api/analytics/leaderboard/me`, `GET /api/analytics/users/{userId}`
- Produces: nothing new.

- [ ] **Step 1: Build**

```bash
cd "D:/EPU/NCKH/1 ti 5/Code/services/analytics-service" && mvn clean package -DskipTests 2>&1 | tail -20
```

If it fails on a `libs/common-*` symbol, run `mvn install -DskipTests -q` in that lib first — the local `~/.m2` copies go stale and that is what kept api-gateway on a months-old jar.

- [ ] **Step 2: Run it and confirm it registers**

```bash
cd "D:/EPU/NCKH/1 ti 5/Code"
set -a; . ./.env; set +a
java -jar services/analytics-service/target/analytics-service-1.0.0.jar --spring.cloud.config.enabled=false
```

Then check `curl -s http://localhost:9999/eureka/apps/ANALYTICS-SERVICE | grep -o '"instanceId":"[^"]*"'`. A Spring service registers with its hostname; if the gateway cannot reach it, that is the same class of bug as exam-suite's `EUREKA_HOST_NAME`.

- [ ] **Step 3: Exercise both endpoints through the gateway**

```bash
TOK=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"runsmoke2@ioes.local","password":"RunSmoke123!"}' \
  | grep -oE '"accessToken"[ ]*:[ ]*"ey[^"]+"' | sed 's/.*"\(ey[^"]*\)"/\1/')
curl -s -H "Authorization: Bearer $TOK" http://localhost:8080/api/analytics/leaderboard | head -c 300
curl -s -H "Authorization: Bearer $TOK" http://localhost:8080/api/analytics/leaderboard/me | head -c 300
```

Record the real output. An empty leaderboard is a legitimate result — the tables may hold no rows — but a 500, a 404 or a fallback body is a finding.

- [ ] **Step 4: Report what the pages actually render**

State plainly whether `/student/leaderboard` and `/student/streak` now show data, show an empty state, or error. If the service needs seed rows to show anything, say so and propose a seed under `database/seeds/analytics-service/` — do NOT write it in this task.

- [ ] **Step 5: Commit only if you changed code**

If the service built and ran untouched, there is nothing to commit; say so. Otherwise commit the fix with a `fix(analytics)` subject describing what was broken.

---

### Task 4: Secure notification-service and implement the real inbox

**Files:**
- Create: `services/notification-service/src/main/java/com/ioes/notification/config/SecurityConfig.java`
- Create: `services/notification-service/src/main/java/com/ioes/notification/config/JwtAuthenticationFilter.java`
- Modify: `services/notification-service/src/main/java/com/ioes/notification/interfaces/rest/controller/NotificationController.java`
- Modify: the use-case/service class behind `GET /notifications/user/{userId}`
- Test: `services/notification-service/src/test/java/com/ioes/notification/config/JwtAuthenticationFilterTest.java` and a test for the inbox query

**Interfaces:**
- Consumes: `com.ioes.common.security.JwtTokenProvider` from `libs/common-jwt`
- Produces: `GET /notifications/user/{userId}` returning that user's real notifications, refusing to serve one user's notifications to another.

- [ ] **Step 1: Copy the auth pattern that already exists**

Read `services/auth-service/src/main/java/com/ioes/auth/config/JwtAuthenticationFilter.java` and its `SecurityConfig` — they were reviewed and hardened this week. Mirror them: a `OncePerRequestFilter` that validates the bearer token with `JwtTokenProvider`, requires the `type` claim to equal `"access"`, puts the token's subject `UUID` in the `SecurityContext` as the principal with the role as a granted authority, and never throws — an invalid token leaves the context empty so the authorization rules reject the request.

Do not authenticate from the `X-User-Id` header. That header is set by the gateway and a caller on port 9009 can forge it.

- [ ] **Step 2: Add the ownership rule**

The path carries a `{userId}`. A student may read only their own notifications; an admin may read anyone's. Compare the path variable against the authenticated principal, and return 403 when they differ and the caller is not an admin. Write the check in the controller or the use case, not in the filter.

- [ ] **Step 3: Implement the inbox query**

The handler currently returns an empty list. Implement it against the service's own tables, ordered newest first, with a sensible cap (match whatever paging convention the service already uses; if it has none, take the newest 50 and say so in the report).

- [ ] **Step 4: Tests**

Filter tests mirroring auth-service's seven cases (no header, non-Bearer, empty token, bad signature, expired, refresh token, valid). Inbox tests: a user reading their own notifications, a user denied another user's, an admin allowed another user's, and an empty result. Follow the repo's `should_X_When_Y` naming.

Run only this service's tests: `mvn -o test -Dtest='JwtAuthenticationFilterTest,*Notification*Test'`.

- [ ] **Step 5: Verify at runtime**

Rebuild, restart on 9009, and prove all four states with curl: no token, another user's id, own id, admin reading someone else's. Record the real output and the status codes.

- [ ] **Step 6: Commit**

Two commits: `feat(notification): validate the bearer token in the service` and `feat(notification): return the caller's real notifications`.

---

### Task 5: Point the admin notifications page at the real inbox

**Files:**
- Modify: `apps/web/src/pages/admin/NotificationsPage.tsx`
- Modify: `apps/web/src/services/api.ts` — remove `notificationsApi.inbox` and its mock array once nothing calls it
- Test: `apps/web/src/services/api/notification.api.test.ts` if the client changes

**Interfaces:**
- Consumes: `services/api/notification.api.ts` and the endpoint from Task 4.

- [ ] **Step 1: Check what the page already does**

The page imports `services/api/notification.api` already. Read it before changing anything: it may only need the mock fallback removed, or it may still render `notificationsApi.inbox` beside the real call.

- [ ] **Step 2: Wire the inbox, keep the rest**

`notificationsApi.stats` and `notificationsApi.templates` have no endpoint and stay mock. Only the inbox moves. Add loading, error and empty states if the page lacks them — the mock always returned rows, so those branches usually do not exist.

- [ ] **Step 3: Remove the dead mock**

Delete `notificationsApi.inbox` and its data array only after `grep -rn "notificationsApi.inbox" apps/web/src` comes back empty.

- [ ] **Step 4: Verify**

`pnpm type-check` — the same 17 pre-existing errors, nothing new. `pnpm vitest run src/services/api` green. Then load the page against the running stack and report what it renders.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): read admin notifications from notification-service"
```
