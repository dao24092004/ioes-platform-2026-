-- ============================================
-- IOES - Analytics Service Database Schema
-- Version: 1.0.0
-- ============================================

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Leaderboard Entries (PostgreSQL backup, Redis là source of truth cho ranking)
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    display_name VARCHAR(255),
    avatar_url VARCHAR(512),
    score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    rank BIGINT NOT NULL DEFAULT 0,
    previous_rank BIGINT NOT NULL DEFAULT 0,
    period VARCHAR(20) NOT NULL,
    exams_completed INTEGER NOT NULL DEFAULT 0,
    avg_exam_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    courses_completed INTEGER NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_leaderboard_period CHECK (period IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME')),
    CONSTRAINT uq_leaderboard_user_period UNIQUE (user_id, period)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_period_score ON leaderboard_entries(period, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_period ON leaderboard_entries(user_id, period);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_entries(period, rank);

-- User Analytics
CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    total_exams_attempted INTEGER NOT NULL DEFAULT 0,
    total_exams_passed INTEGER NOT NULL DEFAULT 0,
    total_exams_failed INTEGER NOT NULL DEFAULT 0,
    total_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    avg_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    highest_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_courses_enrolled INTEGER NOT NULL DEFAULT 0,
    total_courses_completed INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    total_study_minutes BIGINT NOT NULL DEFAULT 0,
    last_exam_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);

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

DROP TRIGGER IF EXISTS update_leaderboard_entries_updated_at ON leaderboard_entries;
CREATE TRIGGER update_leaderboard_entries_updated_at
    BEFORE UPDATE ON leaderboard_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_analytics_updated_at ON user_analytics;
CREATE TRIGGER update_user_analytics_updated_at
    BEFORE UPDATE ON user_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (sample leaderboard for testing)
-- ============================================

-- Seed user analytics cho các test users (UUID từ auth-service seed)
INSERT INTO user_analytics (user_id, total_exams_attempted, total_exams_passed, total_exams_failed,
    total_score, avg_score, highest_score, total_courses_enrolled, total_courses_completed,
    current_streak, longest_streak, total_study_minutes, last_exam_at, last_login_at, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000005', 12, 10, 2, 1020.0, 85.0, 98.5, 3, 2, 7, 15, 1440, NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 days'),
    ('00000000-0000-0000-0000-000000000006', 8,  7,  1, 680.0,  85.0, 92.0, 2, 1, 5, 10, 960,  NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '25 days'),
    ('00000000-0000-0000-0000-000000000007', 5,  4,  1, 425.0,  85.0, 90.0, 1, 0, 3, 5,  600,  NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '20 days'),
    ('00000000-0000-0000-0000-000000000003', 20, 18, 2, 1800.0, 90.0, 100.0,5, 4, 14, 30, 3600, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '60 days')
ON CONFLICT (user_id) DO NOTHING;

-- Seed leaderboard entries (ALL_TIME period)
INSERT INTO leaderboard_entries (user_id, display_name, score, rank, previous_rank, period,
    exams_completed, avg_exam_score, current_streak, longest_streak, last_activity_at, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000003', 'John Smith (Instructor)', 1800.0, 1, 1, 'ALL_TIME', 20, 90.0, 14, 30, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '60 days'),
    ('00000000-0000-0000-0000-000000000005', 'Jane Doe', 1020.0, 2, 3, 'ALL_TIME', 12, 85.0, 7, 15, NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 days'),
    ('00000000-0000-0000-0000-000000000006', 'Alex Chen', 680.0, 3, 2, 'ALL_TIME', 8, 85.0, 5, 10, NOW() - INTERVAL '2 days', NOW() - INTERVAL '25 days'),
    ('00000000-0000-0000-0000-000000000007', 'Maria Garcia', 425.0, 4, 4, 'ALL_TIME', 5, 85.0, 3, 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '20 days')
ON CONFLICT (user_id, period) DO NOTHING;

-- Seed WEEKLY leaderboard
INSERT INTO leaderboard_entries (user_id, display_name, score, rank, previous_rank, period,
    exams_completed, avg_exam_score, current_streak, longest_streak, last_activity_at, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000005', 'Jane Doe', 255.0, 1, 2, 'WEEKLY', 3, 85.0, 7, 15, NOW() - INTERVAL '1 day', NOW() - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000003', 'John Smith (Instructor)', 180.0, 2, 1, 'WEEKLY', 2, 90.0, 14, 30, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 days'),
    ('00000000-0000-0000-0000-000000000006', 'Alex Chen', 92.0, 3, 3, 'WEEKLY', 1, 92.0, 5, 10, NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days')
ON CONFLICT (user_id, period) DO NOTHING;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
