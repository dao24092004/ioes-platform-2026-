-- ============================================
-- IOES Auth Service - Dev Seed (self-contained)
-- ============================================
-- Tạo đủ 15 user mà các seed khác (content/notification/exam/ai) reference:
--   1 super_admin + 1 admin + 3 instructor + 10 student
-- Cộng user_skills / user_goals / audit_logs. Idempotent.
--
-- Áp dụng:
--   docker exec -i ioes-postgres psql -U ioes -d ioes_auth < database/seeds/auth-service/dev-seed.sql

-- ============================================
INSERT INTO users (id, email, password_hash, full_name, status, role,
                   email_verified, last_login_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'superadmin@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'IOES Super Admin', 'active', 'super_admin', TRUE, NOW() - INTERVAL '1 hour'),

  ('00000000-0000-0000-0000-000000000003', 'instructor1@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'Nguyen Van A Instructor', 'active', 'instructor', TRUE, NOW() - INTERVAL '3 days'),

  ('00000000-0000-0000-0000-000000000004', 'instructor2@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'Tran Thi B Instructor', 'active', 'instructor', TRUE, NOW() - INTERVAL '2 days'),

  ('00000000-0000-0000-0000-000000000005', 'student@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'Le Van Hoc', 'active', 'student', TRUE, NOW() - INTERVAL '12 hours'),

  ('00000000-0000-0000-0000-000000000006', 'student2@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'Pham Thi Hoc', 'active', 'student', TRUE, NOW() - INTERVAL '18 hours')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Admin (role = admin, KHÁC super_admin)
-- ============================================
INSERT INTO users (id, email, password_hash, full_name, status, role,
                   email_verified, last_login_at)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'admin.ops@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'IOES Ops Admin', 'active', 'admin', TRUE, NOW() - INTERVAL '5 hours')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Extra users (instructor + student) cho bulk activity
-- ============================================
INSERT INTO users (id, email, password_hash, full_name, status, role,
                   email_verified, last_login_at)
VALUES
  ('00000000-0000-0000-0000-000000000007', 'instructor3@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'Le Van C', 'active', 'instructor', TRUE, NOW() - INTERVAL '6 hours'),
  ('00000000-0000-0000-0000-000000000008', 'student3@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'Nguyen Van A', 'active', 'student', TRUE, NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000009', 'student4@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'Tran Thi D', 'active', 'student', TRUE, NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-00000000000A', 'student5@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'Pham Van E', 'active', 'student', TRUE, NOW() - INTERVAL '3 hours'),
  ('00000000-0000-0000-0000-00000000000B', 'student6@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'Hoang Thi F', 'active', 'student', TRUE, NOW() - INTERVAL '8 hours'),
  ('00000000-0000-0000-0000-00000000000C', 'student7@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'Vu Van G', 'active', 'student', TRUE, NOW() - INTERVAL '4 hours'),
  ('00000000-0000-0000-0000-00000000000D', 'student8@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'Dang Thi H', 'active', 'student', TRUE, NOW() - INTERVAL '12 hours'),
  ('00000000-0000-0000-0000-00000000000E', 'student9@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'Bui Van I', 'active', 'student', FALSE, NULL),
  ('00000000-0000-0000-0000-00000000000F', 'student10@ioes.com',
   crypt('Password123!', gen_salt('bf', 10)),
   'Do Thi K', 'active', 'student', TRUE, NOW() - INTERVAL '20 minutes')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Skills cho users mới (bao gồm instructor 1, 2 và các student mới)
-- ============================================
INSERT INTO user_skills (user_id, skill_name, proficiency_level)
VALUES
  ('00000000-0000-0000-0000-000000000003', 'React',      5),
  ('00000000-0000-0000-0000-000000000003', 'TypeScript', 5),
  ('00000000-0000-0000-0000-000000000003', 'Node.js',    4),
  ('00000000-0000-0000-0000-000000000004', 'Python',     5),
  ('00000000-0000-0000-0000-000000000004', 'TensorFlow', 4),
  ('00000000-0000-0000-0000-000000000004', 'Data Science', 4),
  ('00000000-0000-0000-0000-000000000007', 'C++',        4),
  ('00000000-0000-0000-0000-000000000007', 'Algorithms', 5),
  ('00000000-0000-0000-0000-000000000007', 'Database',   4),
  ('00000000-0000-0000-0000-000000000005', 'JavaScript', 2),
  ('00000000-0000-0000-0000-000000000005', 'React',       3),
  ('00000000-0000-0000-0000-000000000006', 'Python',     2),
  ('00000000-0000-0000-0000-000000000006', 'Pandas',     2),
  ('00000000-0000-0000-0000-000000000008', 'HTML/CSS',   2),
  ('00000000-0000-0000-0000-000000000008', 'Python',     3),
  ('00000000-0000-0000-0000-000000000009', 'SQL',        3),
  ('00000000-0000-0000-0000-000000000009', 'Tableau',    2),
  ('00000000-0000-0000-0000-00000000000A', 'Solidity',   3),
  ('00000000-0000-0000-0000-00000000000B', 'IELTS',      4),
  ('00000000-0000-0000-0000-00000000000C', 'AWS',        3),
  ('00000000-0000-0000-0000-00000000000D', 'Figma',      4),
  ('00000000-0000-0000-0000-00000000000E', 'JavaScript', 1),
  ('00000000-0000-0000-0000-00000000000F', 'SEO',        3)
ON CONFLICT (user_id, skill_name) DO NOTHING;

-- ============================================
-- Goals cho các user mới (005, 006, 008, 009, 00A, 00F) + 1 completed goal cho 005
-- Bảng user_goals không có UNIQUE constraint trên (user_id, title) nên
-- ON CONFLICT không dùng được; DELETE-then-INSERT để đảm bảo idempotent.
-- ============================================
DELETE FROM user_goals WHERE user_id IN (
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-00000000000A',
  '00000000-0000-0000-0000-00000000000F'
);

INSERT INTO user_goals (user_id, title, description, target_date, completed, completed_at)
VALUES
  ('00000000-0000-0000-0000-000000000005',
   'Hoàn thành khóa ReactJS cơ bản',
   'Hoàn thành 5 modules ReactJS trong 30 ngày.',
   CURRENT_DATE + INTERVAL '30 days', FALSE, NULL),
  ('00000000-0000-0000-0000-000000000005',
   'Làm project React hoàn chỉnh',
   'Hoàn thành React.js và đẩy project cuối khoá lên GitHub.',
   CURRENT_DATE - INTERVAL '10 days', TRUE, NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0000-000000000006',
   'Hoàn thành Python cho Data Science',
   'Hoàn thành khóa Python for Data Science trong 45 ngày.',
   CURRENT_DATE + INTERVAL '45 days', FALSE, NULL),
  ('00000000-0000-0000-0000-000000000008',
   'Hoàn thành Data Science course',
   'Hoàn thành khóa Data Science với Python trong 90 ngày.',
   CURRENT_DATE + INTERVAL '90 days', FALSE, NULL),
  ('00000000-0000-0000-0000-000000000009',
   'Đậu chứng chỉ Database',
   'Hoàn thành bài thi Database Systems và nhận chứng chỉ.',
   CURRENT_DATE + INTERVAL '45 days', FALSE, NULL),
  ('00000000-0000-0000-0000-00000000000A',
   'Học Solidity',
   'Hoàn thành Solidity & Smart Contract Development.',
   CURRENT_DATE + INTERVAL '120 days', FALSE, NULL),
  ('00000000-0000-0000-0000-00000000000F',
   'Luyện thi IELTS 7.5',
   NULL, CURRENT_DATE + INTERVAL '60 days', FALSE, NULL);

-- ============================================
-- Audit logs (50 bản ghi: 10 user x 5 hoạt động mỗi người)
-- Bao gồm: 5 user quản trị/giảng viên (super_admin, admin, 3 instructor)
-- + 5 student active nhiều (005, 006, 008, 009, 00F). 5 student còn lại
-- (00A, 00B, 00C, 00D, 00E) fresh / chưa active nên bỏ qua để khớp thực tế.
-- ============================================
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, created_at)
SELECT
  u.id,
  (ARRAY['login','login','login','login_failed','profile_update','password_change',
         'email_verified','2fa_enabled','course_view','logout'])[1 + (random() * 9)::int],
  'user',
  u.id,
  ('192.168.1.' || (10 + (random() * 200)::int))::inet::text,
  (ARRAY['Mozilla/5.0','Chrome/120','Safari/17','Firefox/121','Edge/120'])[1 + (random() * 4)::int],
  NOW() - (random() * INTERVAL '30 days')
FROM users u
CROSS JOIN generate_series(1, 5) g
WHERE u.role IN ('admin','super_admin','instructor')
   OR u.id IN (
     '00000000-0000-0000-0000-000000000005',
     '00000000-0000-0000-0000-000000000006',
     '00000000-0000-0000-0000-000000000008',
     '00000000-0000-0000-0000-000000000009',
     '00000000-0000-0000-0000-00000000000F'
   );
