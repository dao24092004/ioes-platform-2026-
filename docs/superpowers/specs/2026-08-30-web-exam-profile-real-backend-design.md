# Nối web sang backend thật: bài thi và hồ sơ

Ngày: 2026-08-30. Phạm vi đã chốt với người dùng trước khi viết tài liệu này.

## Vấn đề

`apps/web/src/services/api.ts` (1813 dòng) chứa 11 nhóm mock, 34 page dùng tới.
Yêu cầu ban đầu là "xoá hết mock, nối backend", nhưng khảo sát cho thấy phần lớn
mock không có backend tương ứng:

| Mảng | Backend | Kết luận |
|---|---|---|
| exams, attempts | exam-suite `/api/exams`, `/api/attempts`, `/api/v1/exam-attempts` | nối được |
| hồ sơ, đổi mật khẩu | auth-service `/me`, `/change-password` | nối được |
| bảng xếp hạng | analytics-service `/analytics/leaderboard` | có code, chưa chạy |
| thông báo | notification-service `/notifications/user/{userId}` | có jar, chưa chạy |
| khoá học, bài học | content-service | không boot được |
| quản lý user, security, audit log, blockchain, thảo luận, tin nhắn, chứng chỉ, lộ trình học | — | không có endpoint |

auth-service chỉ có 6 endpoint (register/login/refresh/logout/me/change-password),
không có API liệt kê hay sửa user, nên trang quản lý user của admin không có gì để nối.

Vì vậy đợt này chỉ nối bài thi và hồ sơ. Phần còn lại giữ mock nguyên trạng.

## Phạm vi

Trong phạm vi:

- `student/ExamsPage.tsx` — `studentApi.upcomingExams()` → `examApi.listExams()`
- `student/ExamResultsPage.tsx` — `studentApi.recentResults()` → `examApi.listAttempts()`
- `student/DashboardPage.tsx` — chỉ query `exams`, hai query còn lại (`dashboardStats`,
  `myCourses`) giữ mock vì phụ thuộc content-service
- `student/ProfilePage.tsx` — hiện không gọi API nào, đổi sang `authApi.me()`
- `student/SettingsPage.tsx` — form đổi mật khẩu gọi `authApi.changePassword()`
- Seed dữ liệu mẫu cho `ioes_exam` (hiện `exams=0, attempts=0, questions=0`)

Ngoài phạm vi, có lý do:

- `instructor/ExamCreatePage.tsx` — exam-suite không có `POST /exams`
- `instructor/GradingPage.tsx` — không có endpoint chấm bài
- question-bank (`/api/question-bank/*`) — chưa page nào dùng, tạo client lúc này là code chết
- `instructor/DashboardPage.tsx` — `instructorApi.upcomingExams()` giữ nguyên
- Mọi mock khác trong `services/api.ts`

## Thiết kế

### Tầng client

`src/services/api/exam.api.ts` đã có `listExams`, `getExam`, `startExam`,
`listAttempts`, `getAttempt`, `cancelAttempt` và đã chuẩn hoá cột `decimal` về
`number`. Bổ sung hai hàm thuần, không gọi mạng:

```ts
export function toStudentExamView(exam: Exam, attempts: ExamAttempt[]): StudentExamView
export function toResultView(attempt: ExamAttempt, exam?: Exam): ResultView
```

`StudentExamView` và `ResultView` khai ngay trong `exam.api.ts`, cạnh hai hàm này.
Chúng chỉ chứa những trường JSX thật sự đọc tới, không phải bản sao của
`StudentExam` cũ. Đặt cùng file để chỗ lệch tên trường nằm một nơi thay vì rải
khắp JSX.

### Trường mock không có nguồn thật

Không bịa dữ liệu. Mỗi trường xử lý dứt khoát:

| Trường mock | Xử lý |
|---|---|
| `course` (tên khoá học) | bỏ khỏi UI; cần content-service |
| `questions` (số câu) | lấy `attempt.questionIds.length` khi có, còn lại bỏ |
| `rank`, `total_participants` | bỏ; thuộc analytics-service |
| `breakdown`, `feedback` | bỏ; API không trả |
| `due_in` | bỏ; backend không có hạn nộp |
| `duration_min` | `exam.timeLimitMinutes`, có thể `null` → hiện "không giới hạn" |
| `best_score` | tính từ `attempts` của cùng `examId`, lấy `percentageScore` lớn nhất |
| `status` | suy từ attempt: chưa có → `available`; `in_progress` → `in_progress`; đã nộp → `completed` |

Bỏ trường nghĩa là xoá phần JSX hiển thị nó, không để nhãn rỗng.

### Trạng thái giao diện

Mock luôn trả dữ liệu sau `sleep()`, nên ba page này chưa có nhánh loading, lỗi,
rỗng. Mỗi page bổ sung cả ba, dùng đúng component đang có trong `src/components`.
Lỗi 401 do token hết hạn hiện ra thành "Network Error": api-gateway trả 401 mà
không kèm `Access-Control-Allow-Origin`, trình duyệt chặn nên axios không thấy
status (phát hiện ngày 2026-08-30, chưa có trong
`docs/04-operations/known-issues/`). Page chỉ hiện thông báo lỗi chung, không cố
phân biệt; sửa gốc nằm ở gateway, ngoài phạm vi tài liệu này.

### Dọn mock

Sau khi không còn chỗ gọi, xoá khỏi `services/api.ts`: `studentApi.upcomingExams`,
`studentApi.recentResults`, `interface StudentExam`, `interface StudentExamResult`
và mảng dữ liệu kèm theo. Giữ nguyên phần còn lại của `studentApi`.

### Seed dữ liệu

`database/seeds/exam-service/dev-seed.sql`, chạy lại được (`ON CONFLICT DO NOTHING`):
3 exam (quiz, midterm, practice), 10 question kèm option, 1 attempt đã nộp của
`runsmoke2@ioes.local` để trang kết quả có dữ liệu. Không chèn tay vào DB.

## Kiểm thử

- `exam.api.test.ts` đã tồn tại: thêm case cho `toStudentExamView` và `toResultView`,
  gồm trường hợp `timeLimitMinutes` null, `questionIds` null, nhiều attempt cùng exam.
- Không viết test JSX cho các page.
- Kiểm tra tay: chạy stack, đăng nhập `runsmoke2@ioes.local`, mở ba trang, đối chiếu
  với `GET /api/exams` và `GET /api/attempts` gọi bằng curl.

## Rủi ro

- Sau khi nối, dữ liệu trên UI phụ thuộc seed. Nếu quên chạy seed, ba trang sẽ rỗng
  và trông như hỏng.
- `GET /exams` lọc theo vai trò trong token. Tài khoản student có thể thấy ít exam
  hơn seed tạo ra; cần xác nhận khi kiểm tra tay.
