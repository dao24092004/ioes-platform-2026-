-- ============================================
-- IOES - Auth Service Database Schema & Seed Data
-- Version: 1.0.0
-- Single file: Schema + Seed Data
-- Password for all users: Test@123
-- ============================================

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'instructor', 'student', 'guest');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE oauth_provider AS ENUM ('google', 'github', 'microsoft', 'facebook');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    bio TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip VARCHAR(45),
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_user_status CHECK (status IN ('pending', 'active', 'suspended', 'deleted')),
    CONSTRAINT chk_user_role CHECK (role IN ('super_admin', 'admin', 'instructor', 'student', 'guest'))
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- OAuth accounts
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider, provider_user_id);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(revoked_at, expires_at);

-- User skills
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_skills_unique ON user_skills(user_id, skill_name);

-- User goals
CREATE TABLE IF NOT EXISTS user_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_completed ON user_goals(completed);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

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

CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET last_login_at = NOW(),
        last_login_ip = NEW.ip_address,
        failed_login_attempts = 0,
        locked_until = NULL
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_created_at
    AFTER INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_last_login();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE users IS 'Core user table for IOES platform';
COMMENT ON COLUMN users.status IS 'User account status: pending, active, suspended, deleted';
COMMENT ON COLUMN users.role IS 'User role: super_admin, admin, instructor, student, guest';
COMMENT ON COLUMN users.metadata IS 'Flexible JSON storage for user preferences and settings';

-- ============================================
-- SEED DATA
-- Note: Password is Test@123 for all users
-- BCrypt hash generated using: crypt('Test@123', gen_salt('bf', 12))
-- ============================================

-- Generate consistent password hash
DO $$
BEGIN
    -- This creates a reusable function for password hashing
    CREATE TEMP TABLE IF NOT EXISTS _password_hash (hash TEXT);
    TRUNCATE _password_hash;
    INSERT INTO _password_hash SELECT crypt('Test@123', gen_salt('bf', 12));
END $$;

-- ============================================
-- USERS
-- ============================================

-- Super Admin (full access)
INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, bio, status, role, email_verified, failed_login_attempts, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@ioes.com',
    (SELECT hash FROM _password_hash),
    'Super Administrator',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    '+84-123-456-7890',
    'System administrator with full access to all resources.',
    'active',
    'super_admin',
    true,
    0,
    '{"preferences": {"theme": "dark", "language": "vi"}}',
    NOW() - INTERVAL '30 days'
) ON CONFLICT (email) DO NOTHING;

-- Admin
INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, bio, status, role, email_verified, failed_login_attempts, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'admin2@ioes.com',
    (SELECT hash FROM _password_hash),
    'Admin User Two',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=admin2',
    '+84-123-456-7891',
    'Content administrator.',
    'active',
    'admin',
    true,
    0,
    '{"preferences": {"theme": "light"}}',
    NOW() - INTERVAL '25 days'
) ON CONFLICT (email) DO NOTHING;

-- Instructor 1
INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, bio, status, role, email_verified, failed_login_attempts, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'instructor@ioes.com',
    (SELECT hash FROM _password_hash),
    'John Smith Instructor',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
    '+84-123-456-7892',
    'Experienced instructor specializing in Computer Science and Software Engineering.',
    'active',
    'instructor',
    true,
    0,
    '{"preferences": {"notifications": true}, "specializations": ["CS", "SE", "AI"]}',
    NOW() - INTERVAL '20 days'
) ON CONFLICT (email) DO NOTHING;

-- Instructor 2
INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, bio, status, role, email_verified, failed_login_attempts, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000004',
    'instructor2@ioes.com',
    (SELECT hash FROM _password_hash),
    'Maria Garcia Instructor',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=maria',
    '+84-123-456-7893',
    'Mathematics and Statistics instructor.',
    'active',
    'instructor',
    true,
    0,
    '{"preferences": {"notifications": true}, "specializations": ["MATH", "STATS"]}',
    NOW() - INTERVAL '18 days'
) ON CONFLICT (email) DO NOTHING;

-- Student 1
INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, bio, status, role, email_verified, failed_login_attempts, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000005',
    'student@ioes.com',
    (SELECT hash FROM _password_hash),
    'Jane Doe Student',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
    '+84-123-456-7894',
    'Computer Science student passionate about AI and machine learning.',
    'active',
    'student',
    true,
    0,
    '{"preferences": {"notifications": true, "language": "en"}}',
    NOW() - INTERVAL '15 days'
) ON CONFLICT (email) DO NOTHING;

-- Student 2
INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, bio, status, role, email_verified, failed_login_attempts, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    'student2@ioes.com',
    (SELECT hash FROM _password_hash),
    'Alex Chen Student',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    '+84-123-456-7895',
    'Software Engineering student.',
    'active',
    'student',
    true,
    0,
    '{"preferences": {"notifications": false}}',
    NOW() - INTERVAL '10 days'
) ON CONFLICT (email) DO NOTHING;

-- Student 3 (pending email verification)
INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, bio, status, role, email_verified, failed_login_attempts, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000007',
    'student3@ioes.com',
    (SELECT hash FROM _password_hash),
    'New User Pending',
    NULL,
    NULL,
    'New user who has not verified email yet.',
    'pending',
    'student',
    false,
    0,
    '{}',
    NOW() - INTERVAL '5 days'
) ON CONFLICT (email) DO NOTHING;

-- Suspended user
INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, bio, status, role, email_verified, failed_login_attempts, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000008',
    'suspended@ioes.com',
    (SELECT hash FROM _password_hash),
    'Suspended User',
    NULL,
    NULL,
    'This user account has been suspended.',
    'suspended',
    'student',
    true,
    0,
    '{}',
    NOW() - INTERVAL '30 days'
) ON CONFLICT (email) DO NOTHING;

-- Guest user
INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, bio, status, role, email_verified, failed_login_attempts, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000009',
    'guest@ioes.com',
    (SELECT hash FROM _password_hash),
    'Guest User',
    NULL,
    NULL,
    'Guest user with limited access.',
    'active',
    'guest',
    true,
    0,
    '{}',
    NOW() - INTERVAL '2 days'
) ON CONFLICT (email) DO NOTHING;

-- Demo user
INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, bio, status, role, email_verified, failed_login_attempts, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    'demo@ioes.com',
    (SELECT hash FROM _password_hash),
    'Demo User',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    '+84-123-456-7896',
    'Demo account for testing purposes.',
    'active',
    'student',
    true,
    0,
    '{"isDemo": true}',
    NOW() - INTERVAL '1 day'
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- EMAIL VERIFICATIONS
-- ============================================
INSERT INTO email_verifications (user_id, token, expires_at, verified_at, created_at)
SELECT
    id,
    'verified_token_' || id::text,
    NOW() + INTERVAL '365 days',
    NOW() - INTERVAL '29 days',
    created_at
FROM users
WHERE email_verified = true
ON CONFLICT (token) DO NOTHING;

-- Pending email verification for new user
INSERT INTO email_verifications (user_id, token, expires_at, verified_at, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000007',
    'pending_verification_token_123456',
    NOW() + INTERVAL '7 days',
    NULL,
    NOW() - INTERVAL '5 days'
) ON CONFLICT (token) DO NOTHING;

-- ============================================
-- PASSWORD RESET TOKENS
-- ============================================
INSERT INTO password_resets (user_id, token, expires_at, used_at, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000005',
    'reset_token_abcdef123456',
    NOW() + INTERVAL '1 hour',
    NULL,
    NOW() - INTERVAL '30 minutes'
) ON CONFLICT (token) DO NOTHING;

-- Used password reset token
INSERT INTO password_resets (user_id, token, expires_at, used_at, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    'reset_token_used_789xyz',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '2 hours'
) ON CONFLICT (token) DO NOTHING;

-- ============================================
-- SESSIONS
-- ============================================
INSERT INTO sessions (id, user_id, refresh_token_hash, user_agent, ip_address, expires_at, created_at)
VALUES
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', '$2a$12$validRefreshTokenHashAdmin1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0', '192.168.1.100', NOW() + INTERVAL '30 days', NOW() - INTERVAL '1 day'),
    ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', '$2a$12$validRefreshTokenHashAdmin2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/17.0', '192.168.1.101', NOW() + INTERVAL '30 days', NOW() - INTERVAL '2 hours'),
    ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000005', '$2a$12$validRefreshTokenHashStudent1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0', '192.168.1.102', NOW() + INTERVAL '30 days', NOW() - INTERVAL '3 hours'),
    ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000005', '$2a$12$validRefreshTokenHashStudent2', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148', '10.0.0.50', NOW() + INTERVAL '30 days', NOW() - INTERVAL '5 hours')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USER SKILLS
-- ============================================
INSERT INTO user_skills (user_id, skill_name, proficiency_level, created_at)
VALUES
    -- Instructor 1 skills
    ('00000000-0000-0000-0000-000000000003', 'Java', 5, NOW() - INTERVAL '20 days'),
    ('00000000-0000-0000-0000-000000000003', 'Spring Boot', 5, NOW() - INTERVAL '20 days'),
    ('00000000-0000-0000-0000-000000000003', 'Python', 4, NOW() - INTERVAL '19 days'),
    ('00000000-0000-0000-0000-000000000003', 'Machine Learning', 4, NOW() - INTERVAL '18 days'),
    -- Instructor 2 skills
    ('00000000-0000-0000-0000-000000000004', 'Mathematics', 5, NOW() - INTERVAL '18 days'),
    ('00000000-0000-0000-0000-000000000004', 'Statistics', 5, NOW() - INTERVAL '18 days'),
    ('00000000-0000-0000-0000-000000000004', 'R Programming', 4, NOW() - INTERVAL '17 days'),
    -- Student 1 skills
    ('00000000-0000-0000-0000-000000000005', 'JavaScript', 3, NOW() - INTERVAL '15 days'),
    ('00000000-0000-0000-0000-000000000005', 'Python', 4, NOW() - INTERVAL '15 days'),
    ('00000000-0000-0000-0000-000000000005', 'SQL', 3, NOW() - INTERVAL '14 days'),
    -- Student 2 skills
    ('00000000-0000-0000-0000-000000000006', 'TypeScript', 3, NOW() - INTERVAL '10 days'),
    ('00000000-0000-0000-0000-000000000006', 'React', 3, NOW() - INTERVAL '10 days'),
    ('00000000-0000-0000-0000-000000000006', 'Node.js', 2, NOW() - INTERVAL '9 days')
ON CONFLICT (user_id, skill_name) DO NOTHING;

-- ============================================
-- USER GOALS
-- ============================================
INSERT INTO user_goals (user_id, title, description, target_date, completed, completed_at, created_at)
VALUES
    -- Completed goals
    ('00000000-0000-0000-0000-000000000003', 'Complete AWS Certification', 'Obtain AWS Solutions Architect certification', CURRENT_DATE - INTERVAL '30 days', true, CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE - INTERVAL '60 days'),
    ('00000000-0000-0000-0000-000000000005', 'Finish JavaScript Course', 'Complete advanced JavaScript course on IOES platform', CURRENT_DATE - INTERVAL '10 days', true, CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE - INTERVAL '30 days'),
    -- Active goals
    ('00000000-0000-0000-0000-000000000003', 'Publish AI Course', 'Create and publish Introduction to AI course', CURRENT_DATE + INTERVAL '60 days', false, NULL, CURRENT_DATE - INTERVAL '10 days'),
    ('00000000-0000-0000-0000-000000000005', 'Complete Python Certification', 'Pass Python certification exam', CURRENT_DATE + INTERVAL '30 days', false, NULL, CURRENT_DATE - INTERVAL '5 days'),
    ('00000000-0000-0000-0000-000000000005', 'Join Coding Competition', 'Participate in annual coding competition', CURRENT_DATE + INTERVAL '45 days', false, NULL, CURRENT_DATE - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000006', 'Build Portfolio Website', 'Create personal portfolio using React', CURRENT_DATE + INTERVAL '20 days', false, NULL, CURRENT_DATE - INTERVAL '7 days'),
    -- Future goal
    ('00000000-0000-0000-0000-000000000005', 'Get Internship', 'Secure summer internship at tech company', CURRENT_DATE + INTERVAL '120 days', false, NULL, CURRENT_DATE - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ============================================
-- AUDIT LOGS
-- ============================================
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, metadata, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'LOGIN', 'session', '00000000-0000-0000-0001-000000000001', NULL, '{"device": "desktop"}', '192.168.1.100', 'Chrome/120.0', '{"success": true}', NOW() - INTERVAL '1 day'),
    ('00000000-0000-0000-0000-000000000005', 'LOGIN', 'session', '00000000-0000-0000-0001-000000000003', NULL, '{"device": "desktop"}', '192.168.1.102', 'Firefox/121.0', '{"success": true}', NOW() - INTERVAL '3 hours'),
    ('00000000-0000-0000-0000-000000000005', 'UPDATE_PROFILE', 'user', '00000000-0000-0000-0000-000000000005', '{"bio": "Old bio"}', '{"bio": "Computer Science student passionate about AI"}', '192.168.1.102', 'Firefox/121.0', '{}', NOW() - INTERVAL '5 hours'),
    ('00000000-0000-0000-0000-000000000003', 'CHANGE_PASSWORD', 'user', '00000000-0000-0000-0000-000000000003', NULL, NULL, '192.168.1.100', 'Chrome/120.0', '{"method": "self_service"}', NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000007', 'EMAIL_VERIFICATION', 'email_verification', NULL, '{"verified": false}', '{"verified": true}', '10.0.0.50', 'Mobile Safari', '{}', NOW() - INTERVAL '4 days'),
    ('00000000-0000-0000-0000-000000000008', 'LOGIN_FAILED', 'session', NULL, NULL, NULL, '203.0.113.50', 'curl/7.68.0', '{"reason": "account_suspended"}', NOW() - INTERVAL '12 hours'),
    ('00000000-0000-0000-0000-000000000005', 'GOAL_COMPLETED', 'user_goal', NULL, '{"completed": false}', '{"completed": true}', '192.168.1.102', 'Firefox/121.0', '{"goal_title": "Finish JavaScript Course"}', NOW() - INTERVAL '8 days'),
    ('00000000-0000-0000-0000-000000000006', 'SKILL_ADDED', 'user_skill', NULL, NULL, '{"skill": "Node.js", "level": 2}', '192.168.1.103', 'Chrome/120.0', '{}', NOW() - INTERVAL '9 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- OAUTH ACCOUNTS
-- ============================================
INSERT INTO oauth_accounts (user_id, provider, provider_user_id, access_token, refresh_token, token_expires_at, scope, metadata, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000005', 'google', 'google_123456789', 'ya29.a0AfH6SMBxxxx', '1//0ggoogle_oauth2_token', NOW() + INTERVAL '1 hour', 'email profile openid', '{"provider": "google"}', NOW() - INTERVAL '10 days')
ON CONFLICT (provider, provider_user_id) DO NOTHING;

-- ============================================
-- VERIFICATION OUTPUT
-- ============================================
\echo ''
\echo '=== AUTH SERVICE INIT COMPLETE ==='
\echo 'Total users created:'
SELECT COUNT(*) as user_count FROM users;
\echo ''
\echo 'Users by role:'
SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC;
