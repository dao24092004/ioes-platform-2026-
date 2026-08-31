# Bàn giao — Flyway `exam-service` không chạy sạch từ đầu, hai định nghĩa `questions` chọi nhau

Người phát hiện: review toàn nhánh `feature/web-exam-profile-real-backend`. Ghi ở đây vì việc
gộp hai schema là một job riêng, không thuộc phạm vi nhánh này (nhánh chỉ chuyển các trang student
exam/profile sang gọi backend thật).

## Hai định nghĩa `questions` không tương thích

`database/migrations/exam-service/V1__init_schema.sql` và
`database/migrations/exam-service/V2__add_questions.sql` **đều** có `CREATE TABLE questions`
(và đều có `CREATE TABLE question_options`), với hai bộ cột khác hẳn nhau:

| | V1 (`section_id`, `course_id`, `instructor_id`...) | V2 (`topic_id`, `status`, `created_by`...) |
|---|---|---|
| khoá tới | `exam_sections` | không FK, chỉ `topic_id UUID` rời |
| `difficulty` | `INTEGER CHECK (1..5)` | `VARCHAR(20)` (`very_easy`..`very_hard`) |
| trạng thái | không có | `question_status` enum (`draft`/`published`/`archived`) |
| audit | không có | `created_by`, `updated_by`, `last_published_by`, `published_at` |
| optimistic lock | không có | `version INTEGER` |

Trước bản sửa này, không cái nào có `IF NOT EXISTS`, nên chạy Flyway từ một database rỗng luôn
dừng ở V2: `CREATE TABLE questions` báo `relation "questions" already exists` vì V1 đã tạo bảng
đó trước. V3 (`outbox_processed_events`) và **V4 (`V4__add_version_columns.sql`, thứ mà nhánh
này cần để `GET /exams` và `GET /attempts` không vỡ vì thiếu cột `version`) không bao giờ chạy
tới**.

## Đã sửa trong bản này

Thêm `IF NOT EXISTS` vào đúng những chỗ tên đối tượng đụng nhau giữa V1 và V2, chỉ sửa **V2**
(không đụng V1, không gộp hai schema):

- `CREATE TABLE questions` → `CREATE TABLE IF NOT EXISTS questions`
- `CREATE TABLE question_options` → `CREATE TABLE IF NOT EXISTS question_options`
- `CREATE INDEX idx_question_options_question` (trùng tên với chỉ mục V1 tạo trên cùng bảng)
- `CREATE INDEX idx_questions_type` (trùng tên, cả V1 lẫn V2 đều đánh chỉ mục trên `question_type`)
- `CREATE INDEX idx_questions_tags` (trùng tên, cả hai đều đánh GIN trên `tags`)

`CREATE TYPE question_status` không đụng gì ở V1 nên không cần sửa.

**Vẫn chưa sạch:** nếu V1 chạy trước và tạo bảng theo hình V1, thì `CREATE TABLE IF NOT EXISTS`
của V2 bị bỏ qua — bảng giữ nguyên hình V1, không có `topic_id`/`status`/`created_by`. Các dòng
`CREATE INDEX idx_questions_topic ON questions(topic_id) ...`,
`idx_questions_status ON questions(status) ...`, `idx_questions_created_by ON
questions(created_by) ...` trong V2 vẫn sẽ báo lỗi "column does not exist" trên một database
thực sự rỗng. Bản sửa này chỉ loại bỏ lỗi "already exists" chặn ngay từ đầu (đúng phạm vi được
giao); dọn triệt để hai schema là việc của người sở hữu lịch sử migration exam-service.

## Database dev đang chạy thực tế mang hình V1

`question.entity.ts` (`services/exam-suite/src/modules/question-bank/entities/question.entity.ts`)
khai `topicId`, `difficulty` dạng enum chuỗi, `status`, `version`, ... — tức là TypeORM mong đợi
hình **V2**. Nhưng database dev đang chạy đã được tạo từ trước theo hình **V1** (không có các cột
đó), nghĩa là mọi thao tác của `exam-suite` lên bảng `questions` hiện đang lệch với thực tế cột
trong DB — bug tiềm ẩn cho bất kỳ ai động vào question-bank.

## Checksum drift trên V1, chặn `flyway repair`

Phát hiện ở task 7b của nhánh này: `flyway_schema_history` báo *"Migration checksum mismatch for
migration version 1"* — nội dung `V1__init_schema.sql` trên đĩa không khớp checksum đã ghi nhận
lúc áp dụng, dù `git log`/`git status` xác nhận không có commit nào sửa file này. Task đó phải
khởi động lại service với `-Dspring.flyway.validate-on-migrate=false` (cờ runtime, không đổi file
hay schema) chỉ để verify được cho task của họ; đây không phải là bản sửa.

Trên một môi trường sạch (CI, máy mới), Flyway sẽ dừng ngay ở bước validate V1 vì checksum lệch,
trước cả khi tới vấn đề `questions` ở trên. Người sở hữu lịch sử migration cần chạy `flyway
repair` (chấp nhận nội dung V1 hiện tại làm chuẩn) hoặc re-baseline lại toàn bộ lịch sử.

## Tóm lại, để `/exams` và `/attempts` chạy được

1. `V4__add_version_columns.sql` phải được áp dụng — nó là migration duy nhất thêm cột `version`
   vào `exams` và `exam_attempts` (hai bảng không có ở V1 lẫn V2 cho tới V4).
2. Trên database dev **hiện có** (đã ở V1 cộng các bản vá sau, xem checksum drift ở trên),
   `questions` không có `version` — chỉ `ALTER TABLE questions ADD COLUMN IF NOT EXISTS version`
   trong V4 mới thực sự thêm được cột đó (không phải "no-op vì đã có từ V2" như comment cũ trong
   file ghi sai — đã sửa lại trong bản này).
3. Trên một database thực sự rỗng, chuỗi migration vẫn không chạy sạch tới V4 vì (a) checksum
   drift ở V1 và (b) hai định nghĩa `questions` xung đột ở trên — cả hai đều cần người sở hữu
   lịch sử migration xử lý, ngoài phạm vi nhánh này.
