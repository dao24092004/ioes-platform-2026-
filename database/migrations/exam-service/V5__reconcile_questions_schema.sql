-- ============================================
-- IOES - Exam Service Database Schema
-- Version: 5.0.0
-- Reconciles: bảng `questions` / `question_options` về đúng hình mà entity
--             TypeORM của exam-suite ánh xạ tới, và gỡ trigger tính điểm hỏng
--             của V1.
-- ============================================
--
-- Bối cảnh (xem docs/04-operations/known-issues/exam-service-migration-drift.md):
-- V1__init_schema.sql và V2__add_questions.sql đều định nghĩa `questions` với
-- hai bộ cột khác nhau. Trên một database rỗng, V1 chạy trước nên bảng mang
-- hình V1; `CREATE TABLE IF NOT EXISTS` của V2 bị bỏ qua và các cột của hình V2
-- (topic_id, status, created_by, ...) không bao giờ xuất hiện.
--
-- Nhưng code đọc/ghi `questions` chỉ có MỘT entity:
-- services/exam-suite/src/modules/question-bank/entities/question.entity.ts —
-- và entity đó mang hình V2. ExamService.startExam(), SubmissionService.grade()
-- và toàn bộ question-bank đều SELECT qua entity này, nên hình V1 làm mọi truy
-- vấn vỡ với "column Question.topic_id does not exist".
--
-- File này KHÔNG chọn một trong hai hình mà gộp: giữ nguyên bảng hình V1 (để
-- không mất `section_id` — cột duy nhất nối question với exam qua
-- `exam_sections`, mà ExamRepository.findQuestionsByExamIdInTx() phải có) rồi
-- bổ sung mọi cột hình V2 còn thiếu.
--
-- Toàn bộ dùng IF EXISTS / IF NOT EXISTS nên chạy lại nhiều lần được, và cũng
-- an toàn trên database đã mang sẵn hình V2.

-- ============================================
-- 1. Bổ sung các cột hình V2 vào `questions`
-- ============================================

ALTER TABLE questions ADD COLUMN IF NOT EXISTS language VARCHAR(20);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS hint TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS estimated_time_seconds INTEGER;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic_id UUID;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS skill_ids UUID[];
ALTER TABLE questions ADD COLUMN IF NOT EXISTS prerequisites UUID[];
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS last_published_by UUID;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- `status` dùng enum question_status do V2 tạo. Mặc định 'draft' khớp
-- @Column({ default: QuestionStatus.DRAFT }) trong entity.
ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS status question_status NOT NULL DEFAULT 'draft';

-- ============================================
-- 2. Sửa kiểu các cột lệch giữa V1 và entity
-- ============================================

-- `difficulty`: V1 là INTEGER CHECK (1..5); entity khai
-- @Column({ type: 'enum', enum: Difficulty }) với các giá trị chuỗi
-- very_easy..very_hard (V2 dùng VARCHAR(20) + CHECK). Chuyển kiểu kèm ánh xạ
-- 1..5 → very_easy..very_hard để không mất dữ liệu cũ.
DO $difficulty$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'questions'
          AND column_name = 'difficulty' AND data_type = 'integer'
    ) THEN
        ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_difficulty_check;
        ALTER TABLE questions
            ALTER COLUMN difficulty TYPE VARCHAR(20)
            USING CASE difficulty
                WHEN 1 THEN 'very_easy'
                WHEN 2 THEN 'easy'
                WHEN 3 THEN 'medium'
                WHEN 4 THEN 'hard'
                WHEN 5 THEN 'very_hard'
                ELSE 'medium'
            END;
    END IF;
END
$difficulty$;

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_difficulty_valid;
ALTER TABLE questions
    ADD CONSTRAINT questions_difficulty_valid CHECK (
        difficulty IN ('very_easy', 'easy', 'medium', 'hard', 'very_hard')
    );

-- `points`: V1 là DECIMAL(10,2); entity khai @Column({ type: 'int' }).
-- Trình điều khiển pg trả DECIMAL dưới dạng CHUỖI, nên
-- `questions.reduce((sum, q) => sum + q.points, 0)` trong
-- ExamService.startExam()/SubmissionService.gradeAttempt() sẽ nối chuỗi
-- ("01.001.00") thay vì cộng số → maxScore sai hoàn toàn. Phải là INTEGER.
ALTER TABLE questions
    ALTER COLUMN points TYPE INTEGER USING ROUND(points)::INTEGER;
ALTER TABLE questions ALTER COLUMN points SET DEFAULT 1;

-- Cùng lý do cho `question_options.points` (entity khai 'int').
ALTER TABLE question_options
    ALTER COLUMN points TYPE INTEGER USING ROUND(points)::INTEGER;

-- `instructor_id` là NOT NULL ở V1 nhưng KHÔNG có trong entity hình V2, nên
-- mọi INSERT qua question-bank (POST /question-bank/questions) sẽ vỡ vì thiếu
-- cột bắt buộc. Entity dùng `created_by` cho cùng mục đích.
ALTER TABLE questions ALTER COLUMN instructor_id DROP NOT NULL;

-- ============================================
-- 3. Chỉ mục hình V2 (V2 đã bỏ qua vì cột chưa tồn tại lúc đó)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by) WHERE deleted_at IS NULL;

-- ============================================
-- 4. Gỡ trigger tính điểm của V1
-- ============================================
--
-- `calculate_attempt_score()` (V1) chạy AFTER UPDATE OF points_earned ON answers
-- FOR EACH ROW và có hai lỗi chặn hẳn luồng chấm bài:
--
--   1. `passed = (SELECT percentage_score >= (...) FROM answers WHERE attempt_id = NEW.attempt_id)`
--      là truy vấn con trả về MỘT DÒNG MỖI ANSWER. Attempt có từ 2 câu trở lên
--      → PostgreSQL báo "more than one row returned by a subquery used as an
--      expression" và cả lệnh chấm bị rollback.
--   2. Kể cả khi chỉ có 1 câu, nó ghi đè score/max_score/percentage_score mà
--      SubmissionService.gradeAttempt() vừa tính (có cộng cả điểm chấm tay),
--      bằng tổng chỉ dựa trên bảng `answers`.
--
-- Điểm là do service tính và ghi trong cùng transaction với answers, nên trigger
-- này vừa thừa vừa sai. Bỏ hẳn.
DROP TRIGGER IF EXISTS calculate_score_trigger ON answers;
DROP FUNCTION IF EXISTS calculate_attempt_score();
