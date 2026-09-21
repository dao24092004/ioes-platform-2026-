# Đối chiếu BA_DOCUMENT.md với code

> Ngày đối chiếu: 2026-09-15 · Nhánh: `feature/web-remove-mock-data`
>
> Nguồn yêu cầu: [`BA_DOCUMENT.md`](./BA_DOCUMENT.md) (mục 3.1, 4.1, 6). Trạng thái được xác định bằng cách đọc code thực tế
> (không dựa vào README), các lỗi nghiêm trọng đã được kiểm tra lại trực tiếp.

**Ký hiệu:** ✅ đã có (backend + web gọi thật) · 🟡 làm dở (chỉ backend / chỉ UI / UI giả / stub / mock) · ❌ chưa có

Đường dẫn web tính từ `apps/web/src/`, đường dẫn service tính từ `services/`.

## Tổng quan


| Module                          | ✅   | 🟡  | ❌   |
| ------------------------------- | --- | --- | --- |
| 1. Auth &amp; User              | 1   | 3   | 9   |
| 2. Content                      | 2   | 2   | 4   |
| 3. Exam                         | 2   | 5   | 4   |
| 4. Proctoring                   | 5   | 2   | 1   |
| 5. AI &amp; Learning Path       | 4   | 1   | 3   |
| 6. Blockchain                   | 0   | 0   | 6   |
| 7. Analytics &amp; Notification | 2   | 6   | 6   |


Tình trạng từng service:

- **auth / content / analytics / notification** là service thật, chạy được.
- **exam-suite** chạy được; module phiên thi đã được nạp (lỗi #1 đã sửa) nên có lượt thi, WebSocket và giám sát. DB `ioes_exam` vẫn chưa có bảng nào.
- **ai-suite**: `api-gateway` (NestJS, 9100) và `ml-worker` (FastAPI, 9101) chạy được và đã có code thật cho gợi ý khoá học (FR-AI-002), lộ trình Agentic RAG 5 agent (FR-AI-005), nạp bài học thật để sinh câu hỏi (FR-AI-004) và phát hiện mất tập trung bằng MediaPipe (FR-AI-006) — xem `docs/02-architecture/AI_FEATURES_CONTRACT.md`. Mới có unit test, chưa chạy đầu cuối với content-service/Milvus/Gemini thật. `ocr-service` và `speech-service` vẫn chỉ có Dockerfile.
- **blockchain-suite** mới là khung, API trả dữ liệu giả.

---

## Lỗi cần sửa trước khi làm tính năng mới

> **Cả 7 lỗi dưới đây đã sửa** (commit `78851f2` cho exam-suite, `dabb6ff` cho auth và web).
> Bảng giữ lại để tra cứu nguyên nhân, không phải việc tồn đọng.


| #   | Lỗi                                                           | Vị trí                                                                    | Hậu quả                                                                                                              |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | `ExamSessionModule` không được import                         | `exam-suite/src/app.module.ts`                                            | Không có `/api/v1/exam-attempts`, WebSocket `/exam-session`, xử lý frame giám sát, cron tự nộp bài, báo cáo giám sát |
| 2   | `SubmissionController` không có `@UseGuards`                  | `exam-suite/src/modules/submission/submission.controller.ts`              | `@UserId()` = `undefined` → nộp bài lỗi; nút Grade crash                                                             |
| 3   | User đăng ký bị tạo `pending`, login chặn user không `active` | `auth-service/.../domain/service/AuthService.java`                        | Đăng ký xong không đăng nhập được, chỉ tài khoản seed dùng được                                                      |
| 4   | Bảo mật exam-suite                                            | xem chi tiết bên dưới                                                     | Giả danh user khác, xem mọi đề thi                                                                                   |
| 5   | Nút tài khoản demo dùng `admin123`, `student123`…             | `pages/auth/LoginPage.tsx`                                                | Seed dùng `Test@123` nên nút demo đăng nhập thất bại                                                                 |
| 6   | Web không tự refresh token; token refresh không có role       | `services/api/api.config.ts`, `libs/common-jwt/.../JwtTokenProvider.java` | Sau 15 phút bị văng ra                                                                                               |
| 7   | Trang báo cáo học viên còn mock (biểu đồ sin, "142h")         | `pages/student/ReportsPage.tsx`                                           | Hiển thị số liệu giả                                                                                                 |


Chi tiết lỗi bảo mật exam-suite (#4):

- `**DevAuthBypassGuard**` (`exam-session.controller.ts`):
  - Nếu `DEV_AUTH_BYPASS` khác `true`, nó chặn mọi request, kể cả JWT thật.
  - Nếu bằng `true`, ai cũng giả danh được qua header `X-Dev-User-Id`.
  - Không có `RolesGuard` nên `@Roles` bị bỏ qua.
- **WebSocket** (`exam-session.gateway.ts` → `extractUserId`) chỉ base64-decode payload, không kiểm tra chữ ký JWT.
- **Secret JWT mặc định hardcode** trong `main.ts` (`'development-secret-change-in-prod'`); không kiểm tra issuer/audience.
- `**GET /exams/:id**` không kiểm tra quyền sở hữu hay ghi danh; học viên thấy mọi đề luyện tập.
- **Proctoring mặc định dùng mock** (`DEV_MOCK_AI_PROCTOR !== 'false'`). Nếu deploy production sẽ không bao giờ gắn cờ ai.
- **Gateway** trỏ exam-suite về `http://localhost:9005` cứng và không có route cho socket.io.

---

## 1. Auth &amp; User (Đạo)


| ID                   | Chức năng                           | TT  | Thực tế / bằng chứng                                                                                                                           |
| -------------------- | ----------------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-AUTH-001          | Đăng ký email + mật khẩu            | 🟡  | `POST /register` chạy, nhưng user bị tạo `pending` nên không login được (lỗi #3)                                                               |
| BR-002               | Mật khẩu mạnh                       | 🟡  | `RegisterRequest` chỉ `@Size(min=8)`; thanh đo độ mạnh ở `RegisterPage.tsx` chỉ hiển thị                                                       |
| FR-AUTH-003          | Access 15 phút / refresh 7 ngày     | 🟡  | Có `POST /refresh`, nhưng web không gọi; không kiểm tra `type=refresh`; token mới `role=null`; logout không làm gì; bảng `sessions` không dùng |
| FR-AUTH-002/006      | OAuth Google / GitHub / Microsoft   | ❌   | Chỉ có bảng `oauth_accounts`; `LoginPage.tsx` gọi `alert(...)`; `OAuthCallbackPage.tsx` giả bằng `setTimeout`; không có nút Microsoft          |
| FR-AUTH-004          | Quên mật khẩu (link hết hạn 1h)     | ❌   | `AuthService.requestPasswordReset` rỗng, không có endpoint; `ForgotPasswordPage.tsx` có `// TODO: Call API`                                    |
| FR-AUTH-005 / BR-003 | Xác thực email                      | ❌   | `AuthService.verifyEmail` rỗng; `VerifyEmailPage.tsx` giả lập; auth không phát event `auth.user.registered`                                    |
| BR-005               | Nâng cấp giảng viên cần admin duyệt | ❌   | Không có model/endpoint; `BecomeInstructorPage.tsx` giả bằng `setTimeout`; `InstructorApprovalPage.tsx` Coming soon                            |
| FR-AUTH-008          | Hồ sơ: bio, avatar, skills, goals   | ❌   | Có bảng `user_skills`, `user_goals`, không có API cập nhật; `ProfilePage.tsx` các ô bị disable; `UserProfilePage.tsx` Coming soon              |
| FR-AUTH-009          | Cài đặt thông báo, quyền riêng tư   | ❌   | Student `SettingsPage.tsx` chỉ `useState`; instructor `SettingsPage.tsx` Coming soon                                                           |
| BR-020               | Audit log                           | ❌   | Bảng `audit_logs` chỉ có seed, không code nào ghi; `AuditLogPage.tsx` Coming soon                                                              |
| BR-019               | Multi-tenant                        | ❌   | Không có cột tenant/org trong migration nào; 5 trang tenant/organization Coming soon                                                           |
| BR-018               | Xoá dữ liệu sau 2 năm               | ❌   | Chỉ soft-delete (`deleted_at`), không có job dọn                                                                                               |
| FR-AUTH-007          | 3 vai trò                           | ✅   | `AdminUserController` (`/users`, `PATCH /users/{id}/role`) ↔ `UserManagementPage.tsx`                                                          |


## 2. Content ( Sơn )


| ID             | Chức năng                    | TT  | Thực tế / bằng chứng                                                                                                                                                     |
| -------------- | ---------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-CONTENT-002 | CRUD chương / bài            | 🟡  | `CourseController` chỉ có thêm, xoá, liệt kê; không có PATCH chương/bài                                                                                                  |
| FR-CONTENT-004 | Danh mục                     | 🟡  | `CategoryController` có GET/POST/DELETE (admin), không có update; web không có trang quản lý                                                                             |
| FR-CONTENT-003 | Upload PDF/video/ảnh (500MB) | ❌   | Không có controller upload hay MinIO client trong content-service; `CourseForm.tsx` nhập URL ảnh, bài học nhập `contentUrl`                                              |
| FR-CONTENT-005 | Tags                         | ❌   | Chỉ có bảng `course_tags`                                                                                                                                                |
| FR-CONTENT-006 | Đánh giá 1–5 sao             | ❌   | Chỉ có bảng `reviews`, `review_votes`; `ReviewsPage.tsx` Coming soon                                                                                                     |
| FR-CONTENT-007 | Khoá tiên quyết              | ❌   | Chỉ có bảng `course_prerequisites`; `EnrollmentUseCase` không kiểm tra                                                                                                   |
| FR-CONTENT-001 | Tạo / sửa / xoá khoá học     | ✅   | `CourseController` ↔ `CourseCreatePage`, `CourseEditPage` (web chưa có nút xoá khoá)                                                                                     |
| FR-CONTENT-008 | Ghi danh + tiến độ           | ✅   | `EnrollmentController` ↔ student `CourseDetailPage`, `CourseLearnPage`, `EnrollmentPage`, `CoursesPage`, `DashboardPage`, instructor `StudentsPage`. Khoá có phí trả 402 |
| —              | Admin duyệt khoá học         | ✅   | `/submit`, `/approve`, `/reject`, `/publish` ↔ `CourseApprovalPage.tsx`                                                                                                  |


## 3. Exam ( Ngọc )


| ID                   | Chức năng                               | TT  | Thực tế / bằng chứng                                                                                                                                                               |
| -------------------- | --------------------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-EXAM-001          | Tạo đề thi (trắc nghiệm, tự luận, code) | ❌   | Không có `POST /exams`, không có API gắn câu hỏi vào đề; `ExamCreatePage.tsx` Coming soon. Đề chỉ có từ seed. Tạo từng câu hỏi (6 loại) thì có qua `POST /question-bank/questions` |
| FR-EXAM-004          | Chấm code tự động                       | ❌   | `grading.service.ts` đẩy CODING sang chấm tay; không có sandbox/Judge0                                                                                                             |
| BR-009               | Chấm tay tự luận                        | ❌   | `GradeExamDto.manualScores` bị bỏ qua (`void body`); UI không có ô nhập điểm                                                                                                       |
| FR-EXAM-007          | Tự lưu mỗi 30 giây                      | ❌   | Backend có `POST /exam-attempts/:id/answers` nhưng module không load; `ExamTakingPage.tsx` giữ đáp án trong bộ nhớ                                                                 |
| FR-EXAM-002          | Random câu hỏi từ ngân hàng             | 🟡  | `startExam` chỉ xáo thứ tự khi `isRandomized`; không bốc N câu từ pool                                                                                                             |
| FR-EXAM-004          | Chấm trắc nghiệm tự động                | 🟡  | Logic chấm MC / multi-select / true-false / short answer đúng, nhưng endpoint Grade lỗi (lỗi #2)                                                                                   |
| FR-EXAM-006          | Thi realtime WebSocket + code editor    | 🟡  | `exam-session.gateway.ts` có code nhưng không load (lỗi #1); câu code dùng `<textarea>` thay vì Monaco                                                                             |
| FR-EXAM-008          | Kafka GradingCompleted                  | 🟡  | Chỉ phát `ExamGraded` lên `exam.events` qua outbox; `GradeSubmissionUseCase` không được đăng ký                                                                                    |
| —                    | Ngân hàng câu hỏi / topic               | 🟡  | `question-bank.controller.ts`, `upload.controller.ts` đầy đủ, nhưng web không gọi `/api/question-bank`                                                                             |
| FR-EXAM-003 / BR-008 | Giới hạn thời gian, không pause         | ✅   | Đếm ngược + tự nộp ở client, backend kiểm tra quá giờ; không có endpoint pause/gia hạn                                                                                             |
| FR-EXAM-005          | Lịch sử điểm                            | ✅   | `GET /attempts` ↔ `ExamResultsPage.tsx`                                                                                                                                            |


## 4. Proctoring ( Sơn  ) 

Hiện không có luồng giám sát nào chạy đầu cuối: module phiên thi không được load (lỗi #1) và không có service AI giám sát.


| ID                   | Chức năng                             | TT  | Thực tế / bằng chứng                                                                                              |
| -------------------- | ------------------------------------- | --- | ----------------------------------------------------------------------------------------------------------------- |
| FR-PROC-001          | Chụp webcam mỗi 1 giây                | ✅  | Đã gửi **1000 ms** một khung (`ProctoringPanel.tsx`), khung thu nhỏ còn tối đa 640px để 1 khung/giây vẫn nhẹ hơn mức cũ. Module phiên thi đã được nạp nên namespace `/exam-session` có thật                           |
| FR-PROC-005 / BR-011 | Cảnh báo &lt;60, gắn cờ &lt;40        | ✅  | `frame-processor.service.ts` có đủ hai ngưỡng: &lt;60 cảnh báo, &lt;40 gắn cờ lượt thi. Thêm khoảng lặng 15 giây mỗi đợt vi phạm, nếu không ở nhịp 1 giây chỉ cần nhìn xuống 4 giây là bị tự nộp bài |
| FR-PROC-006          | FACE_NOT_DETECTED &gt;5 giây          | ✅  | Đếm đủ thời gian trước khi tính vi phạm (`FACE_NOT_DETECTED_DURATION_MS`)                                                                           |
| FR-PROC-008          | Báo cáo gian lận cho giảng viên       | 🟡  | `GET /exam-attempts/:id/proctoring-report` đã trả vi phạm thật đọc từ Redis (chưa lưu bền vào DB); vẫn chưa có UI cho giảng viên         |
| BR-010               | Bắt buộc giám sát khi thi &gt;30 phút | 🟡  | Có trong `start-exam.use-case.ts` nhưng luồng đang dùng (`ExamService.startExam`) không kiểm tra                  |
| FR-PROC-002          | Face detection MediaPipe 468 điểm     | ✅   | ml-worker `services/proctor.py` dùng MediaPipe Face Landmarker (468 + 10 điểm mống mắt) trên CPU, ~12ms/khung     |
| FR-PROC-003          | Ước lượng hướng nhìn                  | ✅   | Suy từ ma trận tư thế đầu + vị trí mống mắt, trả `CENTER/LEFT/RIGHT/UP/DOWN/OUT_OF_FRAME`                         |
| FR-PROC-004          | CNN / CNN+LSTM                        | 🟡   | Có mô hình thị giác thật (MediaPipe) nhưng chỉ xét từng khung rời; chưa có LSTM ghép chuỗi khung theo thời gian    |
| FR-PROC-007          | Quay màn hình                         | ❌   | Không có `getDisplayMedia` / `MediaRecorder`                                                                      |


## 5. AI &amp; Learning Path ( Ngọc ) 


| ID        | Chức năng                                  | TT  | Thực tế / bằng chứng                                                                                                                                                                   |
| --------- | ------------------------------------------ | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-AI-003 | AI chấm tự luận                            | ❌   | Không có code                                                                                                                                                                          |
| FR-AI-007 | Speech-to-text ( Tạm thời bỏ)              | ❌   | `SpeechToTextPage.tsx` Coming soon; `ai-suite/speech-service` chỉ có Dockerfile + `pyproject.toml`                                                                                     |
| FR-AI-008 | OCR ( Đạo )                                | ❌   | `OCRPage.tsx` Coming soon; `ai-suite/ocr-service` chỉ có Dockerfile + `pyproject.toml`                                                                                                 |
| FR-AI-004 | Sinh câu hỏi từ nội dung bài học           | 🟡  | Đã chuyển sang học liệu thật: `POST /v1/ingest/content` (`api/ingest.py`, `services/ingest.py`, `services/content_client.py`) đọc khoá đã publish → chương → bài từ content-service, nạp Milvus kèm `courseId`/`lessonId`/`chapterId`/`source="content-service"`; `POST /v1/questions/generate` nhận thêm `courseId`/`lessonId` và trả `sourceLessonId`/`sourceCourseId`, không khớp học liệu thì 422. **Còn dở:** `LessonView` của content-service chỉ có `description`, nên mỗi bài chỉ nạp được đoạn mô tả — nội dung thật nằm sau `contentUrl` (video/PDF) chưa đọc được; bài không có description bị bỏ qua. Chưa chạy `/v1/ingest/content` lần nào với content-service thật (`CONTENT_SERVICE_TOKEN` chưa cấp) |
| FR-AI-001 | Chatbot AI                                 | ✅   | `chat.controller.ts` → ml-worker `/v1/rag/query` ↔ `AIAssistantPage.tsx` (student, instructor)                                                                                         |
| FR-AI-002 | Gợi ý khoá học                             | ✅   | ml-worker `POST /v1/recommendations/courses` (`api/recommendations.py`, `services/recommender.py` — embedding + luật, không gọi LLM) → ai-gateway `GET /recommendations/courses` (`recommendations.controller.ts`, ghép catalogue từ `content.client.ts`, cache 180s) ↔ `RecommendationsPage.tsx` gọi thật qua `recommendations.api.ts`. Test: `test_recommendations.py`, `recommendations.service.spec.ts`, `recommendations.api.test.ts`. **Chưa kiểm chứng:** mới chỉ chạy unit test, chưa gọi đầu cuối với content-service + Milvus thật |
| FR-AI-005 | Lộ trình cá nhân hoá (Agentic RAG 5 agent) | ✅   | ml-worker `POST /v1/learning-path/generate` (`api/learning_path.py`, `services/learning_path/` (`orchestrator.py` + 5 agent `profiler.py`…`validator.py`) — 5 agent `profiler → gap_analyzer → curriculum_planner → resource_retriever → validator`, mỗi agent một dòng `agentTrace`; LLM hỏng trả 503 chứ không bịa lộ trình) → ai-gateway `POST /learning-path/generate`, `GET /learning-path/me`, `/me/history`, `/:id` (`learning-path.service.ts`, lưu bảng `learning_paths` ở DB `ioes_ai`) ↔ `LearningPathPage.tsx`. Test: `test_learning_path.py`, `learning-path.service.spec.ts`, `learning-path.api.test.ts`. **Chưa kiểm chứng:** cần `LLM_PROVIDER=gemini` + `GEMINI_API_KEY` (mặc định `.env.example` vẫn là `mock`) và phải áp `database/migrations/ai/V2__learning_paths.sql` vào `ioes_ai` — TypeORM chạy `synchronize: false` nên chưa áp là lỗi ngay lần ghi đầu |
| FR-AI-006 | Phát hiện mất tập trung                    | ✅   | ml-worker `POST /internal/ai/proctor/analyze` (`api/proctor.py`, `services/proctor.py` — MediaPipe Face Landmarker 468/478 điểm trên CPU, điểm tập trung = đầu 0.40 + hướng nhìn 0.35 + mắt 0.25, `gazeDirection`, `violationType` `NO_FACE`/`MULTIPLE_FACES`/`OFF_SCREEN`, ảnh hỏng trả 400) ← exam-suite `HttpProctorClient` (`ai-proctor.client.ts`, `AI_PROCTOR_URL`, mock chỉ bật khi `DEV_MOCK_AI_PROCTOR=true`) ← `ProctoringPanel.tsx` gửi 1 khung/giây. Test: `test_proctor.py`, `ai-proctor.client.spec.ts`, `frame-processor.service.spec.ts`. **Chưa kiểm chứng:** chưa chạy với webcam thật; gói mô hình `face_landmarker.task` (~3,8MB) tải về lần gọi đầu nên lần phân tích đầu tiên chậm và cần mạng ra ngoài. **Còn thiếu:** UI báo cáo giám sát cho giảng viên (FR-PROC-008) vẫn chưa có |


## 6. Blockchain 

`blockchain-suite` mới là khung NestJS. `certificate.service.ts` chỉ trả lại input kèm `// TODO`. Không có entity, smart contract `.sol`, IPFS, hash hay QR code; `ethers` mới chỉ là dependency.


| ID                          | Chức năng                                                    | TT  | Thực tế / bằng chứng                                                                             |
| --------------------------- | ------------------------------------------------------------ | --- | ------------------------------------------------------------------------------------------------ |
| FR-BC-001                   | Đăng ký bản quyền ( Bỏ )                                     | ❌   | `CopyrightPage.tsx` Coming soon                                                                  |
| FR-BC-002 / BR-012 / BR-015 | Token thưởng (1 token = 1 giờ học, streak 7 ngày +10) ( Bỏ ) | ❌   | `TokenWalletPage.tsx` Coming soon; thưởng streak hiện chỉ là +10 điểm leaderboard                |
| FR-BC-003                   | Ví đa chữ ký ( Ví đa chữ ký ) ( Bỏ )                         | ❌   | `admin/WalletPage.tsx`, `admin/BlockchainPage.tsx` Coming soon                                   |
| FR-BC-004                   | Bằng cấp on-chain, SHA-256, IPFS                             | ❌   | `POST /certificates` trả `status:'issued'` giả; `CertificatesPage.tsx` Coming soon               |
| FR-BC-005                   | Xác thực công khai ( Bỏ )                                    | ❌   | `GET /certificates/verify/:tokenId` luôn trả `verified`; `VerifyCertificatePage.tsx` Coming soon |
| FR-BC-006                   | QR code( Bỏ )                                                | ❌   | Không có                                                                                         |


## 7. Analytics, Leaderboard &amp; Notification ( Để sau)


| ID                  | Chức năng                             | TT  | Thực tế / bằng chứng                                                                                                                                                  |
| ------------------- | ------------------------------------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-ANL-001          | Theo dõi hành vi                      | 🟡  | `AnalyticsEventListener` chỉ nghe 4 topic; auth-service không có Kafka nên event đăng ký/đăng nhập không bao giờ được phát; web không gửi tracking                    |
| FR-ANL-002          | Thống kê khoá học                     | 🟡  | Chỉ có `GET /courses/stats` đếm số khoá theo trạng thái; không có thống kê học viên theo từng khoá                                                                    |
| FR-ANL-005          | Báo cáo / dashboard                   | 🟡  | Admin thật (`/analytics/admin/kpi`, `/user-growth`); `student/ReportsPage.tsx` mock; `instructor/ReportsPage.tsx` Coming soon; không có export                        |
| FR-ANL-007          | Streak                                | 🟡  | `AnalyticsService.updateStreak` có logic nhưng chỉ gọi được qua `POST /analytics/internal/streak` (admin) và không ai gọi; `totalStudyMinutes` không bao giờ được ghi |
| —                   | Template thông báo                    | 🟡  | Thymeleaf `welcome`, `exam-passed`, `exam-failed` + `GET /notifications/templates`; bảng `notification_templates` không dùng; web không gọi `send-templated`          |
| FR-ANL-003          | Heatmap                               | ❌   | `HeatmapsPage.tsx` Coming soon; lịch hoạt động ở `StreakPage.tsx` để trống                                                                                            |
| FR-ANL-004          | Funnel                                | ❌   | `FunnelsPage.tsx` Coming soon                                                                                                                                         |
| —                   | Kênh push                             | ❌   | Chỉ là enum; `NotificationService.deliver` ném lỗi "Only EMAIL type is currently supported"                                                                           |
| —                   | Kênh SMS ( Bỏ )                       | ❌   | Như push                                                                                                                                                              |
| —                   | Thông báo trong app ( Để sau )        | ❌   | Gửi `in_app` bị lưu `failed`; hộp thư chỉ liệt kê bản ghi                                                                                                             |
| BR-017              | Người dùng chọn kênh nhận             | ❌   | Chỉ có bảng `notification_preferences`                                                                                                                                |
| FR-ANL-006 / BR-016 | Bảng xếp hạng + reset ngày/tuần/tháng | ✅   | Redis ZSET + `@Scheduled` reset ↔ `LeaderboardPage.tsx`; điểm chỉ lấy từ kết quả thi, cập nhật bằng polling                                                           |
| —                   | Kênh email                            | ✅   | `EmailSender` ↔ admin `NotificationsPage.tsx`; student đọc `GET /notifications/user/{id}`                                                                             |


---

## Trang web còn giả lập


| Loại                             | Trang                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coming soon                      | InstructorApproval, AuditLog, Security, Reviews, UserProfile, instructor Settings, 5 trang Tenant/Organization, Wallet, Blockchain, Heatmaps, Funnels, Discussions (3 vai trò), Copyright, ExamCreate, instructor Reports, Messages (instructor, student), Certificates, TokenWallet, SpeechToText, OCR, Checkout, VerifyCertificate |
| Giả thành công bằng `setTimeout` | ForgotPassword, VerifyEmail, OAuthCallback, BecomeInstructor                                                                                                                                                                                                                                                                                                        |
| Chỉ state cục bộ                 | student Settings, admin SystemConfig                                                                                                                                                                                                                                                                                                                                |
| Còn mock data                    | student Reports                                                                                                                                                                                                                                                                                                                                                     |


