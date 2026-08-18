-- ============================================
-- IOES - Exam Service Database Schema
-- Version: 1.0.0
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE exam_type AS ENUM ('practice', 'graded', 'certification');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'multiple_select', 'true_false', 'short_answer', 'essay', 'coding');
CREATE TYPE attempt_status AS ENUM ('not_started', 'in_progress', 'submitted', 'graded', 'expired', 'cancelled');
CREATE TYPE proctoring_status AS ENUM ('not_started', 'in_progress', 'completed', 'flagged', 'failed');

-- ============================================
-- TABLES
-- ============================================

-- Exams
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID,
    instructor_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    exam_type exam_type NOT NULL DEFAULT 'graded',
    time_limit_minutes INTEGER,
    passing_score DECIMAL(5, 2),
    max_attempts INTEGER,
    is_randomized BOOLEAN NOT NULL DEFAULT FALSE,
    show_results BOOLEAN NOT NULL DEFAULT TRUE,
    is_proctored BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_exams_course ON exams(course_id);
CREATE INDEX idx_exams_instructor ON exams(instructor_id);
CREATE INDEX idx_exams_type ON exams(exam_type);
CREATE INDEX idx_exams_created_at ON exams(created_at DESC);

-- Exam Sections
CREATE TABLE exam_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    questions_count INTEGER NOT NULL DEFAULT 0,
    points_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exam_sections_exam ON exam_sections(exam_id);

-- Question Bank
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID REFERENCES exam_sections(id) ON DELETE CASCADE,
    course_id UUID,
    instructor_id UUID NOT NULL,
    question_type question_type NOT NULL,
    question_text TEXT NOT NULL,
    explanation TEXT,
    points DECIMAL(10, 2) NOT NULL DEFAULT 1,
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_questions_section ON questions(section_id);
CREATE INDEX idx_questions_course ON questions(course_id);
CREATE INDEX idx_questions_instructor ON questions(instructor_id);
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_tags ON questions USING GIN(tags);

-- Question Options (for MCQ, multiple select)
CREATE TABLE question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    explanation TEXT,
    points DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_question_options_question ON question_options(question_id);

-- Test Cases (for coding questions)
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    input TEXT,
    expected_output TEXT,
    is_sample BOOLEAN NOT NULL DEFAULT FALSE,
    points DECIMAL(10, 2),
    memory_limit_mb INTEGER,
    time_limit_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_cases_question ON test_cases(question_id);

-- Exam Attempts
CREATE TABLE exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status attempt_status NOT NULL DEFAULT 'not_started',
    started_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    graded_at TIMESTAMP WITH TIME ZONE,
    time_remaining_seconds INTEGER,
    score DECIMAL(10, 2),
    max_score DECIMAL(10, 2),
    percentage_score DECIMAL(5, 2),
    passed BOOLEAN,
    question_ids UUID[],  -- Randomized question order
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX idx_exam_attempts_user ON exam_attempts(user_id);
CREATE INDEX idx_exam_attempts_status ON exam_attempts(status);
CREATE UNIQUE INDEX idx_exam_attempts_user_exam_active ON exam_attempts(user_id, exam_id) 
    WHERE status IN ('not_started', 'in_progress');

-- Answers
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    selected_option_ids UUID[],
    is_correct BOOLEAN,
    points_earned DECIMAL(10, 2),
    max_points DECIMAL(10, 2),
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    flagged_reason TEXT,
    answered_at TIMESTAMP WITH TIME ZONE,
    graded_at TIMESTAMP WITH TIME ZONE,
    grading_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

CREATE INDEX idx_answers_attempt ON answers(attempt_id);
CREATE INDEX idx_answers_question ON answers(question_id);

-- Auto-save submissions
CREATE TABLE answer_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,
    saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_answer_snapshots_attempt ON answer_snapshots(attempt_id);
CREATE INDEX idx_answer_snapshots_saved_at ON answer_snapshots(attempt_id, saved_at DESC);

-- Proctoring Sessions
CREATE TABLE proctoring_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    status proctoring_status NOT NULL DEFAULT 'not_started',
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    recording_url VARCHAR(500),
    attention_score DECIMAL(5, 2),
    face_detected_count INTEGER DEFAULT 0,
    face_not_detected_count INTEGER DEFAULT 0,
    tab_switch_count INTEGER DEFAULT 0,
    total_flags INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proctoring_attempt ON proctoring_sessions(attempt_id);
CREATE INDEX idx_proctoring_status ON proctoring_sessions(status);

-- Proctoring Alerts
CREATE TABLE proctoring_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proctoring_session_id UUID NOT NULL REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning',
    message TEXT,
    screenshot_url VARCHAR(500),
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proctoring_alerts_session ON proctoring_alerts(proctoring_session_id);
CREATE INDEX idx_proctoring_alerts_type ON proctoring_alerts(alert_type);
CREATE INDEX idx_proctoring_alerts_created ON proctoring_alerts(created_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exam_attempts_updated_at BEFORE UPDATE ON exam_attempts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_answers_updated_at BEFORE UPDATE ON answers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proctoring_sessions_updated_at BEFORE UPDATE ON proctoring_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate attempt score
CREATE OR REPLACE FUNCTION calculate_attempt_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE exam_attempts
    SET 
        score = (SELECT COALESCE(SUM(points_earned), 0) FROM answers WHERE attempt_id = NEW.attempt_id),
        max_score = (SELECT COALESCE(SUM(max_points), 0) FROM answers WHERE attempt_id = NEW.attempt_id),
        percentage_score = CASE 
            WHEN (SELECT COALESCE(SUM(max_points), 0) FROM answers WHERE attempt_id = NEW.attempt_id) > 0 
            THEN (SELECT (COALESCE(SUM(points_earned), 0) / COALESCE(SUM(max_points), 0) * 100) FROM answers WHERE attempt_id = NEW.attempt_id)
            ELSE 0 
        END,
        passed = (SELECT percentage_score >= (SELECT passing_score FROM exams WHERE id = (SELECT exam_id FROM exam_attempts WHERE id = NEW.attempt_id)) 
                   FROM answers WHERE attempt_id = NEW.attempt_id)
    WHERE id = NEW.attempt_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_score_trigger
    AFTER UPDATE OF points_earned ON answers
    FOR EACH ROW
    EXECUTE FUNCTION calculate_attempt_score();
