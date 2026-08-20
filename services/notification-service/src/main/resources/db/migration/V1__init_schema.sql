-- ============================================
-- IOES - Notification Service Database Schema & Seed Data
-- Version: 1.0.0
-- Single file: Schema + Seed Data
-- ============================================

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('email', 'push', 'sms', 'in_app');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'retrying');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    type VARCHAR(20) NOT NULL DEFAULT 'email',
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    template VARCHAR(100),
    data JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_notification_type CHECK (type IN ('email', 'push', 'sms', 'in_app')),
    CONSTRAINT chk_notification_status CHECK (status IN ('pending', 'sent', 'failed', 'retrying'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notifications(scheduled_at) WHERE status = 'pending';

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_categories TEXT[] DEFAULT '{}',
    push_categories TEXT[] DEFAULT '{}',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    body TEXT NOT NULL,
    html_body TEXT,
    variables JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_key ON notification_templates(template_key);

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

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE notifications IS 'All notifications sent to users (email, push, sms, in-app)';
COMMENT ON TABLE notification_preferences IS 'User notification preferences per channel and category';
COMMENT ON TABLE notification_templates IS 'Reusable notification templates with variables';

-- ============================================
-- SEED DATA
-- ============================================

-- ============================================
-- NOTIFICATION PREFERENCES (for seed users from auth-service)
-- ============================================
INSERT INTO notification_preferences (user_id, email_enabled, push_enabled, sms_enabled, in_app_enabled, email_categories, push_categories, timezone, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000001', true, true, true, true, ARRAY['security', 'system', 'courses'], ARRAY['security', 'system'], 'Asia/Ho_Chi_Minh', NOW() - INTERVAL '30 days'),
    ('00000000-0000-0000-0000-000000000002', true, true, false, true, ARRAY['security', 'system', 'courses', 'marketing'], ARRAY['system', 'courses'], 'Asia/Ho_Chi_Minh', NOW() - INTERVAL '25 days'),
    ('00000000-0000-0000-0000-000000000003', true, true, true, true, ARRAY['security', 'system', 'courses', 'student_activities'], ARRAY['courses', 'student_activities'], 'Asia/Ho_Chi_Minh', NOW() - INTERVAL '20 days'),
    ('00000000-0000-0000-0000-000000000004', true, true, false, true, ARRAY['courses', 'student_activities'], ARRAY['courses'], 'Asia/Singapore', NOW() - INTERVAL '18 days'),
    ('00000000-0000-0000-0000-000000000005', true, true, true, true, ARRAY['security', 'courses', 'exam_reminders'], ARRAY['exam_reminders', 'grades'], 'Asia/Ho_Chi_Minh', NOW() - INTERVAL '15 days'),
    ('00000000-0000-0000-0000-000000000006', false, true, false, true, ARRAY['courses'], ARRAY['grades'], 'Asia/Ho_Chi_Minh', NOW() - INTERVAL '10 days'),
    ('00000000-0000-0000-0000-000000000007', true, true, false, true, ARRAY['security'], ARRAY['system'], 'Asia/Ho_Chi_Minh', NOW() - INTERVAL '5 days'),
    ('00000000-0000-0000-0000-000000000010', true, true, true, true, ARRAY['security', 'courses', 'marketing', 'system'], ARRAY['system', 'courses', 'marketing'], 'Asia/Ho_Chi_Minh', NOW() - INTERVAL '1 day')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- NOTIFICATION TEMPLATES
-- ============================================
INSERT INTO notification_templates (template_key, name, subject, body, html_body, variables, is_active)
VALUES
    ('welcome-email', 'Welcome Email', 'Welcome to IOES Platform!',
     'Hi {{userName}}, Welcome to IOES! Please verify your email by clicking: {{verificationUrl}}',
     '<h1>Welcome {{userName}}!</h1><p>Click <a href="{{verificationUrl}}">here</a> to verify your email.</p>',
     '{"userName": "string", "verificationUrl": "string"}',
     true),
    ('password-reset', 'Password Reset', 'Reset Your IOES Password',
     'Hi {{userName}}, Click the link to reset your password: {{resetUrl}}. This link expires in 1 hour.',
     '<h2>Password Reset</h2><p>Hi {{userName}},</p><p>Click <a href="{{resetUrl}}">here</a> to reset your password. This link expires in 1 hour.</p>',
     '{"userName": "string", "resetUrl": "string"}',
     true),
    ('exam-reminder', 'Exam Reminder', 'Reminder: {{examName}} starts in {{minutesUntil}} minutes',
     'Hi {{userName}}, This is a reminder that your exam "{{examName}}" starts in {{minutesUntil}} minutes. Please be ready!',
     '<h2>Exam Reminder</h2><p>Hi {{userName}},</p><p>Your exam <strong>{{examName}}</strong> starts in {{minutesUntil}} minutes.</p>',
     '{"userName": "string", "examName": "string", "minutesUntil": "number"}',
     true),
    ('grade-available', 'Grade Available', 'Your grade for {{examName}} is now available',
     'Hi {{userName}}, Your grade for {{examName}} is now available. Score: {{score}}/{{maxScore}}. View details: {{resultUrl}}',
     '<h2>Grade Available</h2><p>Hi {{userName}},</p><p>Your grade for <strong>{{examName}}</strong>: <strong>{{score}}/{{maxScore}}</strong></p><p><a href="{{resultUrl}}">View Details</a></p>',
     '{"userName": "string", "examName": "string", "score": "number", "maxScore": "number", "resultUrl": "string"}',
     true),
    ('course-enrollment', 'Course Enrollment Confirmation', 'Welcome to {{courseName}}!',
     'Hi {{userName}}, You have successfully enrolled in {{courseName}}. Start learning now!',
     '<h2>Course Enrollment</h2><p>Hi {{userName}},</p><p>Welcome to <strong>{{courseName}}</strong>!</p>',
     '{"userName": "string", "courseName": "string"}',
     true),
    ('account-suspended', 'Account Suspended', 'Your IOES account has been suspended',
     'Hi {{userName}}, Your account has been suspended. Reason: {{reason}}. Contact support for assistance.',
     '<h2>Account Suspended</h2><p>Hi {{userName}},</p><p>Your account has been suspended. Reason: {{reason}}</p>',
     '{"userName": "string", "reason": "string"}',
     true),
    ('email-verification', 'Verify Your Email', 'Verify your IOES email address',
     'Hi {{userName}}, Please verify your email by clicking: {{verificationUrl}}',
     '<h2>Verify Your Email</h2><p>Hi {{userName}},</p><p>Click <a href="{{verificationUrl}}">here</a> to verify.</p>',
     '{"userName": "string", "verificationUrl": "string"}',
     true)
ON CONFLICT (template_key) DO NOTHING;

-- ============================================
-- NOTIFICATIONS (history for testing)
-- ============================================
INSERT INTO notifications (user_id, type, recipient, subject, template, data, status, sent_at, created_at)
VALUES
    -- Welcome emails
    ('00000000-0000-0000-0000-000000000001', 'email', 'admin@ioes.com', 'Welcome to IOES Platform!', 'welcome-email',
     '{"userName": "Super Administrator", "verificationUrl": "https://ioes.com/verify?token=xxx"}',
     'sent', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
    ('00000000-0000-0000-0000-000000000003', 'email', 'instructor@ioes.com', 'Welcome to IOES Platform!', 'welcome-email',
     '{"userName": "John Smith", "verificationUrl": "https://ioes.com/verify?token=xxx"}',
     'sent', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
    ('00000000-0000-0000-0000-000000000005', 'email', 'student@ioes.com', 'Welcome to IOES Platform!', 'welcome-email',
     '{"userName": "Jane Doe", "verificationUrl": "https://ioes.com/verify?token=xxx"}',
     'sent', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
    -- Exam reminders
    ('00000000-0000-0000-0000-000000000005', 'email', 'student@ioes.com', 'Reminder: JavaScript Quiz starts in 30 minutes', 'exam-reminder',
     '{"userName": "Jane Doe", "examName": "JavaScript Quiz", "minutesUntil": 30}',
     'sent', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000006', 'push', 'Alex Chen', 'Exam Reminder', 'exam-reminder',
     '{"userName": "Alex Chen", "examName": "TypeScript Final", "minutesUntil": 15}',
     'sent', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    -- Grade available
    ('00000000-0000-0000-0000-000000000005', 'email', 'student@ioes.com', 'Your grade for JavaScript Quiz is now available', 'grade-available',
     '{"userName": "Jane Doe", "examName": "JavaScript Quiz", "score": 85, "maxScore": 100, "resultUrl": "https://ioes.com/results/123"}',
     'sent', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    -- Course enrollment
    ('00000000-0000-0000-0000-000000000005', 'in_app', 'student@ioes.com', 'Welcome to CS101!', 'course-enrollment',
     '{"userName": "Jane Doe", "courseName": "Introduction to Computer Science"}',
     'sent', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
    -- Password reset
    ('00000000-0000-0000-0000-000000000005', 'email', 'student@ioes.com', 'Reset Your IOES Password', 'password-reset',
     '{"userName": "Jane Doe", "resetUrl": "https://ioes.com/reset?token=abc123"}',
     'sent', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
    -- Failed notifications (for testing retry logic)
    ('00000000-0000-0000-0000-000000000008', 'email', 'suspended@ioes.com', 'Account Suspended', 'account-suspended',
     '{"userName": "Suspended User", "reason": "Terms of service violation"}',
     'failed', NULL, NOW() - INTERVAL '12 hours'),
    -- Pending notification
    ('00000000-0000-0000-0000-000000000007', 'email', 'student3@ioes.com', 'Verify Your Email', 'email-verification',
     '{"userName": "New User", "verificationUrl": "https://ioes.com/verify?token=pending123"}',
     'pending', NULL, NOW() - INTERVAL '5 days'),
    -- Recent SMS
    ('00000000-0000-0000-0000-000000000010', 'sms', '+84-123-456-7896', 'IOES: Your demo exam starts in 60 minutes', NULL,
     '{"content": "Your demo exam starts in 60 minutes"}',
     'sent', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours')
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION OUTPUT
-- ============================================
\echo ''
\echo '=== NOTIFICATION SERVICE INIT COMPLETE ==='
\echo 'Total notifications:'
SELECT COUNT(*) as notification_count FROM notifications;
\echo ''
\echo 'Notifications by status:'
SELECT status, COUNT(*) as count FROM notifications GROUP BY status ORDER BY count DESC;
\echo ''
\echo 'Total templates:'
SELECT COUNT(*) as template_count FROM notification_templates;