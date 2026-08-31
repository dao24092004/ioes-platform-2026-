-- Dữ liệu mẫu cho môi trường dev. Chạy lại nhiều lần được.
--   docker exec -i ioes-postgres psql -U ioes -d ioes_exam < database/seeds/exam-service/dev-seed.sql
--
-- instructor_id 00000000-0000-0000-0000-000000000003 = instructor@ioes.com trong ioes_auth.
-- user_id      c7017348-2cfb-47ef-8389-1efe64def86f = runsmoke2@ioes.local.
-- Hai database tách rời nên không có khoá ngoại giữa chúng.

INSERT INTO exams (id, course_id, instructor_id, title, description, exam_type,
                   time_limit_minutes, passing_score, max_attempts, is_randomized,
                   show_results, is_proctored)
VALUES
  ('11111111-1111-4111-8111-000000000001', NULL,
   '00000000-0000-0000-0000-000000000003',
   'Luyện tập CSS: Box model', 'Bộ câu hỏi ôn tập box model và layout.',
   'practice', 30, 60.00, 5, false, true, false),
  ('11111111-1111-4111-8111-000000000002', NULL,
   '00000000-0000-0000-0000-000000000003',
   'Luyện tập JavaScript cơ bản', 'Kiểu dữ liệu, hàm, bất đồng bộ.',
   'practice', 45, 60.00, 3, true, true, false),
  ('11111111-1111-4111-8111-000000000003', NULL,
   '00000000-0000-0000-0000-000000000003',
   'Kiểm tra giữa kỳ Web', 'Bài thi có điểm; học viên chỉ thấy khi đã ghi danh.',
   'graded', 60, 50.00, 1, false, false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (id, course_id, instructor_id, question_type, question_text,
                       explanation, points, difficulty)
VALUES
  ('22222222-2222-4222-8222-000000000001', NULL, '00000000-0000-0000-0000-000000000003',
   'multiple_choice', 'Box model gồm những lớp nào, từ trong ra ngoài?',
   'content, padding, border, margin.', 1, 2),
  ('22222222-2222-4222-8222-000000000002', NULL, '00000000-0000-0000-0000-000000000003',
   'multiple_choice', 'Thuộc tính nào tạo flex container?',
   'display: flex biến phần tử thành flex container.', 1, 1),
  ('22222222-2222-4222-8222-000000000003', NULL, '00000000-0000-0000-0000-000000000003',
   'true_false', 'margin nằm bên trong border.',
   'Sai: margin nằm ngoài cùng.', 1, 1),
  ('22222222-2222-4222-8222-000000000004', NULL, '00000000-0000-0000-0000-000000000003',
   'multiple_choice', 'typeof null trả về gì?',
   'Trả về "object", lỗi lịch sử của JavaScript.', 1, 3),
  ('22222222-2222-4222-8222-000000000005', NULL, '00000000-0000-0000-0000-000000000003',
   'multiple_choice', 'Từ khoá nào khai báo biến có phạm vi khối?',
   'let và const có block scope, var thì không.', 1, 2),
  ('22222222-2222-4222-8222-000000000006', NULL, '00000000-0000-0000-0000-000000000003',
   'true_false', 'Promise.all dừng ngay khi một promise bị reject.',
   'Đúng: Promise.all reject ngay khi phần tử đầu tiên reject.', 1, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO question_options (id, question_id, option_text, is_correct, sort_order)
VALUES
  ('33333333-3333-4333-8333-000000000001', '22222222-2222-4222-8222-000000000001', 'content, padding, border, margin', true, 0),
  ('33333333-3333-4333-8333-000000000002', '22222222-2222-4222-8222-000000000001', 'margin, border, padding, content', false, 1),
  ('33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000001', 'content, border, padding, margin', false, 2),
  ('33333333-3333-4333-8333-000000000004', '22222222-2222-4222-8222-000000000002', 'display: flex', true, 0),
  ('33333333-3333-4333-8333-000000000005', '22222222-2222-4222-8222-000000000002', 'position: flex', false, 1),
  ('33333333-3333-4333-8333-000000000006', '22222222-2222-4222-8222-000000000003', 'Đúng', false, 0),
  ('33333333-3333-4333-8333-000000000007', '22222222-2222-4222-8222-000000000003', 'Sai', true, 1),
  ('33333333-3333-4333-8333-000000000008', '22222222-2222-4222-8222-000000000004', '"object"', true, 0),
  ('33333333-3333-4333-8333-000000000009', '22222222-2222-4222-8222-000000000004', '"null"', false, 1),
  ('33333333-3333-4333-8333-000000000010', '22222222-2222-4222-8222-000000000005', 'let', true, 0),
  ('33333333-3333-4333-8333-000000000011', '22222222-2222-4222-8222-000000000005', 'var', false, 1),
  ('33333333-3333-4333-8333-000000000012', '22222222-2222-4222-8222-000000000006', 'Đúng', true, 0),
  ('33333333-3333-4333-8333-000000000013', '22222222-2222-4222-8222-000000000006', 'Sai', false, 1)
ON CONFLICT (id) DO NOTHING;

-- Một lượt đã chấm để trang kết quả có dữ liệu.
INSERT INTO exam_attempts (id, exam_id, user_id, status, started_at, submitted_at,
                           graded_at, score, max_score, percentage_score, passed,
                           question_ids)
VALUES
  ('44444444-4444-4444-8444-000000000001',
   '11111111-1111-4111-8111-000000000001',
   'c7017348-2cfb-47ef-8389-1efe64def86f',
   'graded',
   now() - interval '2 days',
   now() - interval '2 days' + interval '18 minutes',
   now() - interval '2 days' + interval '20 minutes',
   2.00, 3.00, 66.67, true,
   ARRAY['22222222-2222-4222-8222-000000000001',
         '22222222-2222-4222-8222-000000000002',
         '22222222-2222-4222-8222-000000000003']::uuid[])
ON CONFLICT (id) DO NOTHING;
