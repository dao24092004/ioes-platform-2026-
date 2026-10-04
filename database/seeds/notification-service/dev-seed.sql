-- ============================================
-- IOES Notification Service - Dev Seed Data
-- ============================================
-- Notification templates + default preferences for seed users.
-- Idempotent (ON CONFLICT DO NOTHING).
--
-- Apply:
--   docker exec -i ioes-postgres psql -U ioes -d ioes_notification < database/seeds/notification-service/dev-seed.sql

-- ============================================
-- Notification templates
-- ============================================
INSERT INTO notification_templates (template_key, name, subject, body, html_body, variables, is_active)
VALUES
  ('welcome_email',
   'Welcome to IOES',
   'Chào mừng {{fullName}} đến với IOES!',
   'Xin chào {{fullName}}, cảm ơn bạn đã đăng ký tài khoản IOES.',
   '<h1>Chào mừng {{fullName}}</h1><p>Cảm ơn bạn đã đăng ký tài khoản IOES.</p>',
   '{"fullName": "string"}'::jsonb, TRUE),

  ('email_verification',
   'Email Verification',
   'Xác thực email IOES của bạn',
   'Nhấn vào link sau để xác thực: {{verificationLink}}',
   '<p>Nhấn <a href="{{verificationLink}}">vào đây</a> để xác thực email.</p>',
   '{"verificationLink": "string"}'::jsonb, TRUE),

  ('password_reset',
   'Password Reset',
   'Đặt lại mật khẩu IOES',
   'Nhấn vào link để đặt lại mật khẩu (hết hạn sau 1 giờ): {{resetLink}}',
   '<p><a href="{{resetLink}}">Đặt lại mật khẩu</a></p>',
   '{"resetLink": "string"}'::jsonb, TRUE),

  ('course_enrolled',
   'Course Enrollment Confirmation',
   'Bạn đã ghi danh khóa học: {{courseName}}',
   'Bạn vừa ghi danh thành công khóa học "{{courseName}}". Chúc bạn học tốt!',
   '<p>Bạn vừa ghi danh <strong>{{courseName}}</strong>.</p>',
   '{"courseName": "string"}'::jsonb, TRUE),

  ('exam_graded',
   'Exam Graded',
   'Bài thi {{examTitle}} đã được chấm',
   'Bài thi {{examTitle}} đã được chấm. Điểm của bạn: {{score}}/100.',
   '<p>Điểm: <strong>{{score}}</strong>/100</p>',
   '{"examTitle": "string", "score": "number"}'::jsonb, TRUE),

  ('certificate_issued',
   'Certificate Issued',
   'Chứng chỉ {{courseName}} đã được cấp',
   'Chúc mừng! Bạn đã nhận chứng chỉ cho khóa học {{courseName}}. Xem tại: {{certificateUrl}}',
   '<p><a href="{{certificateUrl}}">Xem chứng chỉ</a></p>',
   '{"courseName": "string", "certificateUrl": "string"}'::jsonb, TRUE)
ON CONFLICT (template_key) DO NOTHING;

-- ============================================
-- Default notification preferences for seed users
-- ============================================
INSERT INTO notification_preferences (user_id, email_enabled, push_enabled, sms_enabled, in_app_enabled)
VALUES
  ('00000000-0000-0000-0000-000000000001', TRUE, TRUE, FALSE, TRUE),
  ('00000000-0000-0000-0000-000000000002', TRUE, TRUE, TRUE,  TRUE),
  ('00000000-0000-0000-0000-000000000003', TRUE, TRUE, FALSE, TRUE),
  ('00000000-0000-0000-0000-000000000004', TRUE, TRUE, FALSE, TRUE),
  ('00000000-0000-0000-0000-000000000005', TRUE, TRUE, FALSE, TRUE),
  ('00000000-0000-0000-0000-000000000006', TRUE, TRUE, FALSE, TRUE),
  ('00000000-0000-0000-0000-000000000007', TRUE, TRUE, FALSE, TRUE),
  ('00000000-0000-0000-0000-000000000008', TRUE, FALSE, FALSE, TRUE),
  ('00000000-0000-0000-0000-000000000009', TRUE, TRUE, FALSE, TRUE),
  ('00000000-0000-0000-0000-00000000000A', TRUE, TRUE, FALSE, TRUE),
  ('00000000-0000-0000-0000-00000000000B', TRUE, TRUE, FALSE, TRUE),
  ('00000000-0000-0000-0000-00000000000C', TRUE, TRUE, FALSE, TRUE),
  ('00000000-0000-0000-0000-00000000000D', TRUE, FALSE, FALSE, TRUE),
  ('00000000-0000-0000-0000-00000000000E', FALSE, FALSE, FALSE, FALSE),
  ('00000000-0000-0000-0000-00000000000F', TRUE, TRUE, FALSE, TRUE)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- BULK NOTIFICATIONS (60 rows) — gửi cho học viên trong 30 ngày qua
-- ============================================
INSERT INTO notifications (user_id, type, recipient, subject, template, data,
                           status, sent_at, created_at)
SELECT
  u.id,
  (ARRAY['email','in_app','push'])[1 + (random() * 2)::int],
  u.email,
  (ARRAY[
    'Bạn đã ghi danh khóa học thành công',
    'Bài thi của bạn đã được chấm',
    'Khóa học mới phù hợp với bạn',
    'Bạn đã đạt chứng chỉ',
    'Nhắc nhở: hoàn thành bài học hôm nay',
    'Cập nhật điểm danh hiệu',
    'Giảng viên trả lời câu hỏi của bạn',
    'Khuyến mãi cuối tuần'
  ])[1 + (random() * 7)::int],
  (ARRAY['course_enrolled','exam_graded','welcome_email','certificate_issued','password_reset'])[1 + (random() * 4)::int],
  jsonb_build_object(
    'userId', u.id,
    'fullName', u.full_name,
    'courseName', (ARRAY['React.js Complete Guide','IELTS 8.0','Data Science with Python','Blockchain & Smart Contracts','Cloud Computing AWS','Cybersecurity Basics','UI/UX Design Fundamentals'])[1 + (random() * 6)::int],
    'examTitle', 'Web Mid-term',
    'score', (60 + random() * 40)::int
  ),
  (ARRAY['sent','sent','sent','sent','pending','failed'])[1 + (random() * 5)::int],
  CASE WHEN random() < 0.85 THEN NOW() - (random() * INTERVAL '30 days') ELSE NULL END,
  NOW() - (random() * INTERVAL '30 days')
FROM (VALUES
  ('00000000-0000-0000-0000-000000000005'::uuid, 'student@ioes.com'::text, 'Le Van Hoc'),
  ('00000000-0000-0000-0000-000000000006'::uuid, 'student2@ioes.com', 'Pham Thi Hoc'),
  ('00000000-0000-0000-0000-000000000008'::uuid, 'student3@ioes.com', 'Nguyen Van A'),
  ('00000000-0000-0000-0000-000000000009'::uuid, 'student4@ioes.com', 'Tran Thi D'),
  ('00000000-0000-0000-0000-00000000000A'::uuid, 'student5@ioes.com', 'Pham Van E'),
  ('00000000-0000-0000-0000-00000000000B'::uuid, 'student6@ioes.com', 'Hoang Thi F'),
  ('00000000-0000-0000-0000-00000000000C'::uuid, 'student7@ioes.com', 'Vu Van G'),
  ('00000000-0000-0000-0000-00000000000D'::uuid, 'student8@ioes.com', 'Dang Thi H'),
  ('00000000-0000-0000-0000-00000000000F'::uuid, 'student10@ioes.com', 'Do Thi K')
) AS u(id, email, full_name)
CROSS JOIN generate_series(1, 5) g;
