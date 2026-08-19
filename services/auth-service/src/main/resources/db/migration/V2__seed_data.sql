-- ============================================
-- IOES - Auth Service Seed Data
-- Version: 1.0.0
-- Description: Test data for auth-service integration testing
-- Password for all users: Test@123
-- ============================================

-- ============================================
-- USERS
-- ============================================

-- Super Admin (full access)
INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, bio, status, role, email_verified, failed_login_attempts, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@ioes.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGFJ.Bh/e1u',
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
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGFJ.Bh/e1u',
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
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGFJ.Bh/e1u',
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
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGFJ.Bh/e1u',
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
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGFJ.Bh/e1u',
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
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGFJ.Bh/e1u',
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
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGFJ.Bh/e1u',
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

-- Suspended user (for testing account suspension)
INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, bio, status, role, email_verified, failed_login_attempts, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000008',
    'suspended@ioes.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGFJ.Bh/e1u',
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
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGFJ.Bh/e1u',
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
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGFJ.Bh/e1u',
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
-- EMAIL VERIFICATIONS (already verified)
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
ON CONFLICT DO NOTHING;

-- Add pending email verification for new user
INSERT INTO email_verifications (user_id, token, expires_at, verified_at, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000007',
    'pending_verification_token_123456',
    NOW() + INTERVAL '7 days',
    NULL,
    NOW() - INTERVAL '5 days'
) ON CONFLICT DO NOTHING;

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
) ON CONFLICT DO NOTHING;

-- Used password reset token (for testing used token scenario)
INSERT INTO password_resets (user_id, token, expires_at, used_at, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    'reset_token_used_789xyz',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '2 hours'
) ON CONFLICT DO NOTHING;

-- ============================================
-- SESSIONS (for refresh token testing)
-- ============================================
INSERT INTO sessions (id, user_id, refresh_token_hash, user_agent, ip_address, expires_at, created_at)
VALUES
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', '$2a$12$validRefreshTokenHashAdmin1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0', '192.168.1.100', NOW() + INTERVAL '30 days', NOW() - INTERVAL '1 day'),
    ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', '$2a$12$validRefreshTokenHashAdmin2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/17.0', '192.168.1.101', NOW() + INTERVAL '30 days', NOW() - INTERVAL '2 hours'),
    ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000005', '$2a$12$validRefreshTokenHashStudent1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0', '192.168.1.102', NOW() + INTERVAL '30 days', NOW() - INTERVAL '3 hours'),
    ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000005', '$2a$12$validRefreshTokenHashStudent2', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148', '10.0.0.50', NOW() + INTERVAL '30 days', NOW() - INTERVAL '5 hours')
ON CONFLICT DO NOTHING;

-- ============================================
-- USER SKILLS
-- ============================================
INSERT INTO user_skills (user_id, skill_name, proficiency_level, created_at)
VALUES
    -- Instructor skills
    ('00000000-0000-0000-0000-000000000003', 'Java', 5, NOW() - INTERVAL '20 days'),
    ('00000000-0000-0000-0000-000000000003', 'Spring Boot', 5, NOW() - INTERVAL '20 days'),
    ('00000000-0000-0000-0000-000000000003', 'Python', 4, NOW() - INTERVAL '19 days'),
    ('00000000-0000-0000-0000-000000000003', 'Machine Learning', 4, NOW() - INTERVAL '18 days'),
    ('00000000-0000-0000-0000-000000000004', 'Mathematics', 5, NOW() - INTERVAL '18 days'),
    ('00000000-0000-0000-0000-000000000004', 'Statistics', 5, NOW() - INTERVAL '18 days'),
    ('00000000-0000-0000-0000-000000000004', 'R Programming', 4, NOW() - INTERVAL '17 days'),
    -- Student skills
    ('00000000-0000-0000-0000-000000000005', 'JavaScript', 3, NOW() - INTERVAL '15 days'),
    ('00000000-0000-0000-0000-000000000005', 'Python', 4, NOW() - INTERVAL '15 days'),
    ('00000000-0000-0000-0000-000000000005', 'SQL', 3, NOW() - INTERVAL '14 days'),
    ('00000000-0000-0000-0000-000000000006', 'TypeScript', 3, NOW() - INTERVAL '10 days'),
    ('00000000-0000-0000-0000-000000000006', 'React', 3, NOW() - INTERVAL '10 days'),
    ('00000000-0000-0000-0000-000000000006', 'Node.js', 2, NOW() - INTERVAL '9 days')
ON CONFLICT DO NOTHING;

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
    -- Future goals
    ('00000000-0000-0000-0000-000000000005', 'Get Internship', 'Secure summer internship at tech company', CURRENT_DATE + INTERVAL '120 days', false, NULL, CURRENT_DATE - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ============================================
-- AUDIT LOGS (sample activity logs)
-- ============================================
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, metadata, created_at)
VALUES
    -- Login events
    ('00000000-0000-0000-0000-000000000001', 'LOGIN', 'session', '00000000-0000-0000-0001-000000000001', NULL, '{"device": "desktop"}', '192.168.1.100', 'Chrome/120.0', '{"success": true}', NOW() - INTERVAL '1 day'),
    ('00000000-0000-0000-0000-000000000005', 'LOGIN', 'session', '00000000-0000-0000-0001-000000000003', NULL, '{"device": "desktop"}', '192.168.1.102', 'Firefox/121.0', '{"success": true}', NOW() - INTERVAL '3 hours'),
    -- Profile update
    ('00000000-0000-0000-0000-000000000005', 'UPDATE_PROFILE', 'user', '00000000-0000-0000-0000-000000000005', '{"bio": "Old bio"}', '{"bio": "Computer Science student passionate about AI"}', '192.168.1.102', 'Firefox/121.0', '{}', NOW() - INTERVAL '5 hours'),
    -- Password change
    ('00000000-0000-0000-0000-000000000003', 'CHANGE_PASSWORD', 'user', '00000000-0000-0000-0000-000000000003', NULL, NULL, '192.168.1.100', 'Chrome/120.0', '{"method": "self_service"}', NOW() - INTERVAL '2 days'),
    -- Email verification
    ('00000000-0000-0000-0000-000000000007', 'EMAIL_VERIFICATION', 'email_verification', NULL, '{"verified": false}', '{"verified": true}', '10.0.0.50', 'Mobile Safari', '{}', NOW() - INTERVAL '4 days'),
    -- Failed login attempt (for suspended user)
    ('00000000-0000-0000-0000-000000000008', 'LOGIN_FAILED', 'session', NULL, NULL, NULL, '203.0.113.50', 'curl/7.68.0', '{"reason": "account_suspended"}', NOW() - INTERVAL '12 hours'),
    -- Goal completion
    ('00000000-0000-0000-0000-000000000005', 'GOAL_COMPLETED', 'user_goal', NULL, '{"completed": false}', '{"completed": true}', '192.168.1.102', 'Firefox/121.0', '{"goal_title": "Finish JavaScript Course"}', NOW() - INTERVAL '8 days'),
    -- Skill added
    ('00000000-0000-0000-0000-000000000006', 'SKILL_ADDED', 'user_skill', NULL, NULL, '{"skill": "Node.js", "level": 2}', '192.168.1.103', 'Chrome/120.0', '{}', NOW() - INTERVAL '9 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- OAUTH ACCOUNTS (Google OAuth testing)
-- ============================================
INSERT INTO oauth_accounts (user_id, provider, provider_user_id, access_token, refresh_token, token_expires_at, scope, metadata, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000005', 'google', 'google_123456789', 'ya29.a0AfH6SMBxxxx', '1//0ggoogle_oauth2_token', NOW() + INTERVAL '1 hour', 'email profile openid', '{"provider": "google"}', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all users
SELECT '=== USERS ===' as info;
SELECT id, email, full_name, role::text, status::text, email_verified, created_at FROM users ORDER BY created_at;

-- Check user skills count
SELECT '=== USER SKILLS ===' as info;
SELECT u.email, COUNT(s.id) as skill_count
FROM users u
LEFT JOIN user_skills s ON u.id = s.user_id
GROUP BY u.email
ORDER BY skill_count DESC;

-- Check user goals
SELECT '=== USER GOALS ===' as info;
SELECT u.email, COUNT(g.id) as total_goals, COUNT(CASE WHEN g.completed THEN 1 END) as completed_goals
FROM users u
LEFT JOIN user_goals g ON u.id = g.user_id
GROUP BY u.email
ORDER BY total_goals DESC;

-- Check sessions
SELECT '=== SESSIONS ===' as info;
SELECT u.email, COUNT(s.id) as session_count
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id AND s.revoked_at IS NULL
GROUP BY u.email
ORDER BY session_count DESC;

-- Check audit logs
SELECT '=== AUDIT LOGS ===' as info;
SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action ORDER BY count DESC;
