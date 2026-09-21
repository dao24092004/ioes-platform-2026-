-- ============================================
-- IOES - Exam Service Database Schema
-- Version: 6.0.0
-- Adds: bảng của ExamSessionModule (UC_008/UC_009) — exam_attempt,
--       answer_draft, submission.
-- ============================================
--
-- Ba entity dưới services/exam-suite/src/modules/exam-session/entities/ chưa
-- từng có migration nào; trước file này ExamSessionModule boot lên nhưng
-- AutoSubmitScheduler (@Cron) và mọi endpoint /api/v1/exam-attempts đều vỡ với
-- "relation exam_attempt does not exist".
--
-- Tên cột ở đây phải khớp SnakeCaseNamingStrategy
-- (services/exam-suite/src/config/snake-case.naming-strategy.ts) áp cho
-- TypeORM trong app.module.ts: thuộc tính camelCase → cột snake_case.
--
-- LƯU Ý: `exam_attempt` (số ít) KHÁC `exam_attempts` (số nhiều) của
-- V1__init_schema.sql. Hai bảng của hai module khác nhau, cố ý không gộp:
--  - `exam_attempts` : ExamModule, luồng REST /exams + /attempts (web đang dùng)
--  - `exam_attempt`  : ExamSessionModule, luồng WebSocket + proctoring UC_008
-- `exam_attempt.exam_id` vì vậy KHÔNG có khoá ngoại tới `exams` theo đúng cách
-- entity khai (chỉ @Column uuid, không @ManyToOne).

-- ============================================
-- EXAM_ATTEMPT — phiên thi của ExamSessionModule
-- ============================================

CREATE TABLE IF NOT EXISTS exam_attempt (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    exam_id UUID NOT NULL,
    user_id UUID NOT NULL,
    enrollment_id UUID NOT NULL,

    -- BR-008: deadline tuyệt đối, server authoritative, timer không pause.
    started_at TIMESTAMPTZ NOT NULL,
    deadline_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,

    -- MANUAL | TIMEOUT | AUTO_FLAG | SYSTEM
    submission_kind VARCHAR(16),
    -- IN_PROGRESS | SUBMITTED | GRADED | EXPIRED
    status VARCHAR(16) NOT NULL DEFAULT 'IN_PROGRESS',

    -- BR-013: vi phạm vượt ngưỡng → flag, không trừ điểm, Instructor review.
    flag BOOLEAN NOT NULL DEFAULT FALSE,
    flag_reason TEXT,

    score NUMERIC(6, 2),
    max_score NUMERIC(6, 2),

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempt_user ON exam_attempt(user_id);
CREATE INDEX IF NOT EXISTS idx_attempt_exam_status ON exam_attempt(exam_id, status);
-- AutoSubmitScheduler quét theo (status, deadline_at) mỗi phút.
CREATE INDEX IF NOT EXISTS idx_attempt_status_deadline ON exam_attempt(status, deadline_at);

-- ============================================
-- ANSWER_DRAFT — auto-save mỗi 30 giây (BR-012)
-- ============================================
--
-- Mỗi (attempt_id, question_id) chỉ giữ 1 dòng, ghi đè khi lưu lại — ràng buộc
-- đó nằm ở chỉ mục UNIQUE bên dưới, đúng như @Index(..., { unique: true }).

CREATE TABLE IF NOT EXISTS answer_draft (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    attempt_id UUID NOT NULL REFERENCES exam_attempt(id) ON DELETE CASCADE,
    question_id UUID NOT NULL,

    -- MCQ: string[] id lựa chọn; coding: source; essay: text.
    answer JSONB NOT NULL,

    -- Đồng hồ client, chỉ để phát hiện lệch giờ — không authoritative.
    client_ts TIMESTAMPTZ,

    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_draft_attempt_question
    ON answer_draft(attempt_id, question_id);
CREATE INDEX IF NOT EXISTS idx_draft_attempt ON answer_draft(attempt_id);

-- ============================================
-- SUBMISSION — bản nộp cuối, bất biến (audit trail)
-- ============================================

CREATE TABLE IF NOT EXISTS submission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    attempt_id UUID NOT NULL REFERENCES exam_attempt(id) ON DELETE CASCADE,

    -- Snapshot toàn bộ đáp án cuối cùng, chốt từ answer_draft.
    answers JSONB NOT NULL,

    auto_score NUMERIC(6, 2) NOT NULL,
    manual_score NUMERIC(6, 2),
    final_score NUMERIC(6, 2),

    grading_meta JSONB NOT NULL DEFAULT '{}'::jsonb,

    graded_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- @Index('idx_submission_attempt', { unique: true }) — 1 submission / attempt.
CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_attempt ON submission(attempt_id);

-- ============================================
-- TRIGGER: updated_at cho exam_attempt (@UpdateDateColumn)
-- ============================================
--
-- TypeORM tự set updated_at khi save() qua entity, nhưng trigger giữ cho các
-- UPDATE thô (vd auto-submit hàng loạt) không bỏ sót cột này.

CREATE OR REPLACE FUNCTION trg_exam_attempt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exam_attempt_updated_at ON exam_attempt;
CREATE TRIGGER exam_attempt_updated_at
BEFORE UPDATE ON exam_attempt
FOR EACH ROW
EXECUTE FUNCTION trg_exam_attempt_updated_at();
