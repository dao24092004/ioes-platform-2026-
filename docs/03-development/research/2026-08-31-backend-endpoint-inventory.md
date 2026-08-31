# Backend endpoint inventory for `apps/web/src/services/api.ts` mocks

Date: 2026-08-31. Read-only research, no builds run, no services started/stopped.

## Method

1. Listed every `async` method in each of the 11 mock groups in `apps/web/src/services/api.ts`.
2. Grepped `apps/web/src/pages` for `<group>.<method>` calls to find which mocks are actually wired to a page (skipped unused ones: `usersApi.getById`, `usersApi.create`, `coursesApi.getApproval`, `studentApi.leaderboard`, `studentApi.courseLessons`, `studentApi.practiceQuestions` — no page calls them).
3. Read every controller in `services/auth-service`, `services/content-service`, `services/analytics-service`, `services/notification-service` (Java/Spring), `services/exam-suite`, `services/blockchain-suite`, `services/ai-suite/api-gateway` (NestJS), `services/ai-suite/ml-worker` (FastAPI).
4. Read `services/api-gateway/src/main/resources/application.yml` for the routing table.
5. Checked `target/*.jar` / `dist/` freshness for build status, plus `docker ps` and `netstat -ano` (cross-referenced PIDs via `Get-Process`) for what's actually running right now. No process was started or stopped.

## Backend endpoint inventory

### auth-service (Java, port 9000) — `AuthController`, `@RequestMapping("")`
Gateway: `Path=/api/auth/**`, `StripPrefix=2` → forwards to service root. Matches.
- `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `GET /me`, `POST /change-password`
- **No admin user-management endpoints exist** (no list/search/update-role/update-status/delete/getById for users). This is the only controller in the service.
- Build: `target/auth-service-1.0.0.jar` exists, no src newer than jar. **Running now** (java.exe, PID 20084, listening on 9000).

### content-service (Java, port 9001) — `TopicController`, `@RequestMapping("/api/v1/topics")`
- `POST /api/v1/topics`, `GET /api/v1/topics`, `GET /api/v1/topics/{id}`, `GET /api/v1/topics/{id}/children`, `GET /api/v1/topics/{id}/exists`, `PATCH /api/v1/topics/{id}`, `DELETE /api/v1/topics/{id}`
- **This is the only controller.** There is no course/lesson controller anywhere in the service (confirmed by repo-wide grep for `CourseController` / `@Controller("courses")` / `RequestMapping("/courses"` — zero hits outside `apps/web`).
- Gateway: route `content-service` matches `/api/content/**,/api/courses/**,/api/lessons/**,/api/topics/**,/api/v1/topics/**` with **`StripPrefix=2`**. For `/api/v1/topics/**` that strips `api` and `v1`, forwarding `/topics/**` to a controller mapped at `/api/v1/topics` — **mismatch, this route is broken** even ignoring the missing course endpoints. (`/api/topics/**` has the same problem: strips to `/topics/**`, controller wants `/api/v1/topics/...`.)
- Build/boot: jar exists (`target/content-service-1.0.0.jar`, Aug 30), no src newer than jar, so it packages. But it will **not boot**: `TopicEventPublisher` autowires `KafkaTemplate<String, String>` (line 22) while `libs/common-kafka/.../KafkaConfig.java` only provides a bean of type `KafkaTemplate<String, EventEnvelope<?>>` (line 59) — no matching bean, Spring context fails to start. Separately, `Topic.java` maps `path` as a plain `String` column (line 49-50, no `columnDefinition`) while `V2__topics.sql` declares `path LTREE` (line 14) and `spring.jpa.hibernate.ddl-auto: validate` is set — schema validation will also fail at boot. Two independent boot blockers, both still present in current code.
- Not currently running (port 9001 on this host is docker's minio publishing, not content-service; no java process for it was found listening).

### analytics-service (Java, port 9004) — `AnalyticsController` (`/analytics`), `AnalyticsInternalController` (`/analytics/internal`)
- `GET /analytics/leaderboard`, `GET /analytics/leaderboard/me`, `GET /analytics/users/{userId}`, `POST /analytics/leaderboard/{period}/reset`, `POST /analytics/internal/streak`, `POST /analytics/internal/course-enrolled`
- Gateway: `Path=/api/analytics/**`, `StripPrefix=1` → forwards `/analytics/**`. Matches correctly.
- Build: `target/classes` is up to date with `src` (compiles), but **no `target/*.jar` exists** — never packaged into a runnable artifact. Not running (port 9004 not listening).
- Shape mismatch: nothing here returns admin KPI aggregates (active users, signups, enrollments, exam submits, tokens issued, role distribution, top courses) — only leaderboard rows and per-user exam/streak analytics.

### notification-service (Java, port 9009) — `NotificationController`, `@RequestMapping("/notifications")`
- `POST /send`, `POST /send-templated`, `GET /user/{userId}` (placeholder — comment says "need to add this method to use case", always returns `[]`), `GET /{id}` (placeholder, always returns `null`)
- Gateway: `Path=/api/notifications/**`, `StripPrefix=1` → forwards `/notifications/**`. Matches.
- Build: `target/notification-service-1.0.0.jar` exists (Aug 23) but several `src` files (including `application.yml`, a migration, and `NotificationEventListener.java`) are newer than the jar — **jar is stale**, would need a rebuild to know if it still packages. Not running (port 9009 not listening).
- No stats/inbox-listing/template-listing endpoints exist; the two `GET` routes are unimplemented placeholders, not real data sources.

### exam-suite (NestJS, port 9005) — `ExamController` (`exams`, `attempts`), `ExamSessionController` (`api/v1/exam-attempts`), `QuestionBankController` (`question-bank`), `SubmissionController` (`exams/:examId/submissions`)
- `GET /exams`, `GET /exams/:id`, `POST /exams/:id/start`, `GET /attempts`, `GET /attempts/:id`, `POST /attempts/:id/cancel`
- `POST /api/v1/exam-attempts`, `GET /api/v1/exam-attempts/:id`, `POST /api/v1/exam-attempts/:id/submit`, `POST /api/v1/exam-attempts/:id/answers`, `GET /api/v1/exam-attempts/instructor/exams/:examId/active-attempts`, `GET /api/v1/exam-attempts/:id/proctoring-report`
- `GET /question-bank/questions/search`, `GET /question-bank/questions/:id`, `GET /question-bank/questions/:id/similar`, `GET /question-bank/topics`, `GET /question-bank/topics/:topicId/practice`, `POST /question-bank/questions`, `PATCH /question-bank/questions/:id`, `DELETE /question-bank/questions/:id`, `POST /question-bank/questions/:id/publish`
- `POST /exams/:examId/submissions`, `POST /exams/:examId/submissions/:attemptId/grade`
- Gateway: `exam-suite` route `Path=/api/exams/**,/api/attempts/**` `StripPrefix=1` → matches. `exam-session` route `Path=/api/v1/exam-attempts/**` no strip → matches (controller already carries the `api/v1` prefix). `question-bank` route `Path=/api/question-bank/**` `StripPrefix=1` → matches. All three routes are correctly aligned with the controllers.
- `ExamController.list()` (exam.service.ts:57-66): `INSTRUCTOR` → own exams; everyone else (including ADMIN) → `findPractice()`. No admin-oversight query, no `stats()` endpoint, and the `Exam` entity has no `participants/avg_score/flagged/instructor_name/course_name` fields (those are cross-user aggregates, not present anywhere).
- `SubmissionController.grade()` is a single-submission action, not a listing of pending/flagged grading sessions.
- Build: `dist/` is stale vs `src` (many files newer, e.g. `app.module.ts`, `main.ts`) — the service that's actually listening on 9005 (node.exe PID 15932) is presumably running via `nest start --watch`/ts-node, not the stale `dist`. **Currently running.**

### blockchain-suite (NestJS, configured port 9200) — `CertificateController` (`certificates`)
- `POST /certificates`, `GET /certificates/verify/:tokenId`
- No token-supply/contract/transaction/reward endpoints exist anywhere in the service.
- Gateway: `Path=/api/blockchain/**,/api/certificates/**`, `StripPrefix=2`. For `/api/certificates/verify/123`, stripping 2 segments (`api`,`certificates`) forwards `/verify/123` — but the controller needs `/certificates/verify/123`. **Broken StripPrefix (should be 1).** `/api/blockchain/**` has no controller to land on at all.
- Not running (port 9200 not listening).

### ai-suite/api-gateway (NestJS, port 9100) — `ChatController` (`chat`), `QuestionsController` (`questions`)
- `POST /chat`, `GET /chat/sessions`, `GET /chat/:sessionId`, `POST /questions/generate`
- Gateway: `Path=/api/ai/**,/api/learning-path/**,/api/recommendations/**`, `StripPrefix=2`. `/api/ai/chat/**` strips to `/chat/**` — matches. `/api/learning-path/**` and `/api/recommendations/**` strip to paths with no matching controller — **no backend for those two path families**, but nothing in the mock inventory maps to them anyway.
- Currently running (node.exe PID 11104, listening on 9100). Not relevant to any of the 53 mock functions below (matches US-017 chatbot only).

### ai-suite/ml-worker (FastAPI) — `questions.py` (`/v1/questions/generate`), `rag.py` (`/v1/rag/query`, `/v1/rag/ingest`, `/v1/rag/status`), `main.py` (`/health`, `/v1/embeddings`)
Not relevant to any of the 53 mock functions below.

### What's actually running right now (`docker ps` + `netstat`/`Get-Process`, read-only check)
- Infra containers only: kafka, postgres (5433), redis, mongodb, milvus, zookeeper, etcd, minio, kafka-connect/ui, pgadmin, redis-commander, mongo-express — no application service runs in Docker.
- Native processes: **api-gateway** (java, 8080), **discovery-service/Eureka** (java, 9999), **auth-service** (java, 9000), **exam-suite** (node, 9005), **ai-suite/api-gateway** (node, 9100).
- Not running: content-service, analytics-service, notification-service, blockchain-suite, config-server (8888), ml-worker.

## Mock function → page → endpoint → state

| mock function | pages using it | matching endpoint (method + gateway path) | state |
|---|---|---|---|
| usersApi.list | admin/AdminDashboardPage.tsx, admin/UserManagementPage.tsx | none — auth-service has no user-list endpoint | missing |
| usersApi.stats | admin/AdminDashboardPage.tsx, admin/UserManagementPage.tsx | none | missing |
| usersApi.updateStatus | admin/UserManagementPage.tsx | none | missing |
| usersApi.updateRole | admin/UserManagementPage.tsx | none | missing |
| usersApi.delete | admin/UserManagementPage.tsx | none | missing |
| coursesApi.list | admin/CourseApprovalPage.tsx | none — content-service only has `/api/v1/topics` | missing |
| coursesApi.stats | admin/AdminDashboardPage.tsx, admin/CourseApprovalPage.tsx | none | missing |
| coursesApi.approve | admin/CourseApprovalPage.tsx | none | missing |
| coursesApi.reject | admin/CourseApprovalPage.tsx | none | missing |
| coursesApi.approvalStatus | admin/CourseApprovalPage.tsx | none | missing |
| coursesApi.approvalReason | admin/CourseApprovalPage.tsx | none | missing |
| systemApi.services | admin/AdminDashboardPage.tsx | none — no cross-service health aggregation endpoint (only per-service actuator `/health`) | missing |
| activityApi.recent | admin/AdminDashboardPage.tsx | none — no activity-feed endpoint anywhere | missing |
| adminAnalyticsMockApi.kpi | admin/AnalyticsPage.tsx | none — analytics-service has leaderboard/user-analytics only, no KPI aggregate | missing |
| adminAnalyticsMockApi.userGrowth | admin/AnalyticsPage.tsx | none | missing |
| adminAnalyticsMockApi.enrollments | admin/AnalyticsPage.tsx | none | missing |
| adminAnalyticsMockApi.examCompletion | admin/AnalyticsPage.tsx | none | missing |
| adminAnalyticsMockApi.passRate | admin/AnalyticsPage.tsx | none | missing |
| adminAnalyticsMockApi.topCourses | admin/AnalyticsPage.tsx | none | missing |
| adminAnalyticsMockApi.roleDistribution | admin/AnalyticsPage.tsx | none | missing |
| adminExamMockApi.list | admin/ExamManagementPage.tsx | close-but-no: `GET /api/exams` (StripPrefix=1 → exam-suite `GET /exams`) exists and runs, but returns student/instructor exam rows, not admin-oversight rows (no participants/avg_score/flagged/instructor/course fields) | missing |
| adminExamMockApi.stats | admin/ExamManagementPage.tsx | none — no stats endpoint in exam-suite at all | missing |
| blockchainApi.tokenStats | admin/BlockchainPage.tsx | none — blockchain-suite only has certificate mint/verify | missing |
| blockchainApi.contract | admin/BlockchainPage.tsx | none | missing |
| blockchainApi.transactions | admin/BlockchainPage.tsx | none | missing |
| blockchainApi.weeklyRewards | admin/BlockchainPage.tsx | none | missing |
| securityApi.stats | admin/SecurityPage.tsx | none — no security/audit-log service or endpoint exists anywhere | missing |
| securityApi.events | admin/SecurityPage.tsx | none | missing |
| securityApi.auditLog | admin/SecurityPage.tsx, admin/AuditLogPage.tsx | none | missing |
| notificationsApi.stats | admin/NotificationsPage.tsx | none | missing |
| notificationsApi.inbox | admin/NotificationsPage.tsx | closest is `GET /api/notifications/user/{userId}` (StripPrefix=1 → notification-service `/notifications/user/{userId}`), but it's an unimplemented placeholder that always returns `[]` | missing |
| notificationsApi.templates | admin/NotificationsPage.tsx | none | missing |
| instructorApi.dashboardStats | instructor/AnalyticsPage.tsx, instructor/DashboardPage.tsx | none | missing |
| instructorApi.myCourses | instructor/AnalyticsPage.tsx, instructor/CourseEditPage.tsx, instructor/DashboardPage.tsx, instructor/CoursesPage.tsx, instructor/ExamCreatePage.tsx | none — no course domain exists | missing |
| instructorApi.upcomingExams | instructor/DashboardPage.tsx | none | missing |
| instructorApi.topStudents | instructor/DashboardPage.tsx | none | missing |
| instructorApi.activity | instructor/DashboardPage.tsx | none | missing |
| instructorApi.gradingSessions | instructor/GradingPage.tsx | none — exam-suite has `POST /exams/:examId/submissions/:attemptId/grade` (single action), no listing/queue endpoint | missing |
| instructorApi.gradingStats | instructor/GradingPage.tsx | none | missing |
| instructorApi.students | instructor/StudentsPage.tsx | none | missing |
| instructorApi.reportSummary | instructor/ReportsPage.tsx | none | missing |
| instructorApi.reportData | instructor/ReportsPage.tsx | none | missing |
| studentApi.messages | student/MessagesPage.tsx, instructor/MessagesPage.tsx | none | missing |
| studentApi.myCourses | student/CoursesPage.tsx, student/DiscussionsPage.tsx, student/EnrollmentPage.tsx, student/DashboardPage.tsx | none — no enrollment domain exists in any service | missing |
| studentApi.courseDiscussion | instructor/DiscussionsPage.tsx, admin/AdminDiscussionsPage.tsx, student/CourseDetailPage.tsx, student/DiscussionsPage.tsx | none | missing |
| studentApi.courseDetail | student/CourseDetailPage.tsx, student/CourseLearnPage.tsx | none | missing |
| studentApi.courseReviews | student/ReviewsPage.tsx, student/CourseDetailPage.tsx | none | missing |
| studentApi.notifications | student/NotificationsPage.tsx | none | missing |
| studentApi.learningPaths | student/LearningPathPage.tsx | none — `/api/learning-path/**` is routed at the gateway (StripPrefix=2 into ai-suite) but no controller in ai-suite serves it | missing |
| studentApi.search | student/SearchPage.tsx | none | missing |
| studentApi.enrollments | student/EnrollmentPage.tsx | none | missing |
| studentApi.dashboardStats | student/DashboardPage.tsx | none | missing |
| studentApi.certificates | student/CertificatesPage.tsx | closest is `POST /api/certificates` + `GET /api/certificates/verify/:tokenId` (blockchain-suite), but no "list my certificates" endpoint, service isn't running, and the gateway StripPrefix for this route is broken anyway | missing |

53 of 53 page-used mock functions have no matching, working endpoint today.

## Three lists

### 1. No backend changes needed
None. Every mock function a page actually calls maps to no real endpoint (or, for `adminExamMockApi.list` / `notificationsApi.inbox`, to an endpoint whose shape/behavior doesn't do what the mock does).

### 2. Needs a service started or built (endpoint already exists in code)
None outright — no mock function's exact shape is already served by running code. The nearest things worth knowing about while planning:
- `adminExamMockApi.list` could eventually source real rows from exam-suite's already-running `GET /api/exams`, but only after adding an admin-oversight query — see list 3.
- `notificationsApi.inbox` could source from notification-service's `GET /notifications/user/{userId}`, but that handler is an unimplemented placeholder — see list 3.
- `studentApi.certificates` could partially reuse blockchain-suite's certificate verify/mint once that service is (a) started (not running, port 9200) and (b) the gateway's `StripPrefix=2` on `/api/certificates/**` is fixed to `StripPrefix=1`.
- content-service itself needs no new code to "start" but currently cannot boot at all (see below) — relevant if any future course endpoint is added there.

### 3. Needs new backend code
- **usersApi** (list/stats/updateStatus/updateRole/delete): auth-service needs an admin user-management surface — `GET /users` with paging/search/role/status filters, `GET /users/stats`, `PATCH /users/{id}/status`, `PATCH /users/{id}/role`, `DELETE /users/{id}` (soft delete).
- **coursesApi** (list/stats/approve/reject/approvalStatus/approvalReason): content-service needs an entire course domain (entity, migration, controller) plus an approval workflow — none exists; only topics do. Also fix content-service's boot blockers first (KafkaTemplate<String,String> bean missing from `libs/common-kafka`; `topics.path` is `ltree` in the migration but mapped as `varchar` in the entity, which fails Hibernate `ddl-auto: validate`).
- **systemApi.services**: needs a new aggregator (in api-gateway or a small ops endpoint) that polls each registered service's `/actuator/health` and returns a `SystemService[]` summary.
- **activityApi.recent**: needs a cross-service activity/event feed — likely a Kafka-consumer-backed read model, since no service currently persists a generic activity log.
- **adminAnalyticsMockApi** (kpi/userGrowth/enrollments/examCompletion/passRate/topCourses/roleDistribution): analytics-service needs admin-dashboard aggregate queries and endpoints on top of its existing exam/streak tables; today it only exposes leaderboard + per-user analytics. Also needs to be packaged (`mvn package`) — no jar exists yet.
- **adminExamMockApi.list/stats**: exam-suite needs an admin-scoped `list()` branch (today ADMIN falls into the same `findPractice()` path as students) with joined instructor/course names and per-exam aggregates (participants, avg score, flagged count), plus a new `GET /exams/stats` endpoint.
- **blockchainApi** (tokenStats/contract/transactions/weeklyRewards): blockchain-suite needs token-economics endpoints entirely (supply, holder count, contract metadata, transaction history, reward time series) — today it only mints/verifies certificates. Also fix the gateway's `StripPrefix=2` on `/api/certificates/**` (should be 1) before any of this is reachable.
- **securityApi** (stats/events/auditLog): no security/audit service exists at all — needs a new service (or a module bolted onto auth-service) that captures login failures, suspicious IPs, MFA/permission changes, and a general audit trail.
- **notificationsApi** (stats/inbox/templates): notification-service needs `GET /notifications/stats`, a real (non-placeholder) `GET /notifications/user/{userId}` implementation, and a template CRUD/listing surface — none of that use-case code exists yet.
- **instructorApi** (dashboardStats/myCourses/upcomingExams/topStudents/activity/gradingSessions/gradingStats/students/reportSummary/reportData): needs the course domain (see coursesApi above) plus instructor-scoped aggregate endpoints in content-service/exam-suite/analytics-service; `gradingSessions`/`gradingStats` specifically need a "pending grading queue" endpoint in exam-suite (only a single-item grade action exists today).
- **studentApi** (messages/myCourses/courseDiscussion/courseDetail/courseReviews/notifications/learningPaths/search/enrollments/dashboardStats/certificates): needs the course/enrollment domain, a discussion/review subsystem, a messaging subsystem, and a course-search endpoint — none of these exist in any service. `learningPaths` has a gateway route already carved out (`/api/learning-path/**` → ai-suite) but no controller behind it.
