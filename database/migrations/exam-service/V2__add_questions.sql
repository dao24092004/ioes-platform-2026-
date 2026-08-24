-- ============================================
-- IOES - Exam Service Database Schema
-- Version: 2.0.0
-- Adds: Question Bank tables for Phase C/D
-- ============================================

-- ============================================
-- NEW ENUMS
-- ============================================

-- Values PHẢI khớp với V1__init_schema.sql (lowercase snake_case)
-- BUG #48 fix: trước đây enum question_type đã được define ở V1 với lowercase
CREATE TYPE question_status AS ENUM ('draft', 'published', 'archived');

-- ============================================
-- QUESTIONS TABLE
-- ============================================

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Content
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    language VARCHAR(20),

    -- Help
    hint TEXT,
    explanation TEXT,
    estimated_time_seconds INTEGER,

    -- Tags
    tags TEXT[],

    -- Relationships (soft FK - service owns)
    topic_id UUID NOT NULL,
    skill_ids UUID[],
    prerequisites UUID[],

    -- Status
    status question_status NOT NULL DEFAULT 'draft',

    -- Audit
    created_by UUID NOT NULL,
    updated_by UUID,
    last_published_by UUID,
    published_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Optimistic locking (TypeORM @VersionColumn sẽ tự quản lý)
    version INTEGER NOT NULL DEFAULT 1,

    -- Constraints
    CONSTRAINT questions_points_positive CHECK (points >= 1 AND points <= 100),
    CONSTRAINT questions_estimated_time_positive CHECK (
        estimated_time_seconds IS NULL OR (estimated_time_seconds >= 10 AND estimated_time_seconds <= 7200)
    ),
    CONSTRAINT questions_topic_id_format CHECK (topic_id IS NOT NULL),
    -- Difficulty phải là 1 trong các giá trị enum
    CONSTRAINT questions_difficulty_valid CHECK (
        difficulty IN ('very_easy', 'easy', 'medium', 'hard', 'very_hard')
    )
);

CREATE INDEX idx_questions_topic ON questions(topic_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_questions_difficulty ON questions(difficulty) WHERE deleted_at IS NULL;
CREATE INDEX idx_questions_type ON questions(question_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_questions_status ON questions(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_questions_created_by ON questions(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_questions_tags ON questions USING GIN(tags) WHERE deleted_at IS NULL;

-- ============================================
-- QUESTION OPTIONS (for MCQ)
-- ============================================

CREATE TABLE question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text VARCHAR(500) NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    points INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_question_options_question ON question_options(question_id);

-- ============================================
-- CODING TEST CASES
-- ============================================

CREATE TABLE coding_test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN NOT NULL DEFAULT FALSE,
    points INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coding_test_cases_question ON coding_test_cases(question_id);

-- ============================================
-- TRIGGER: Auto-update updated_at (không bump version - TypeORM @VersionColumn quản lý)
-- BUG #50 fix: trước đây trigger cũng bump version → double increment với TypeORM
-- ============================================

CREATE OR REPLACE FUNCTION trg_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER questions_updated_at
BEFORE UPDATE ON questions
FOR EACH ROW
EXECUTE FUNCTION trg_questions_updated_at();