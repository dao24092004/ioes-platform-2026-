-- Dữ liệu mẫu cho môi trường dev. Chạy lại nhiều lần được.
--   docker exec -i ioes-postgres psql -U ioes -d ioes_exam < database/seeds/exam-service/dev-seed.sql
--
-- Yêu cầu: đã áp dụng tới V6 trong database/migrations/exam-service/. Bản seed
-- trước file này viết theo hình `questions` của V1 (difficulty INTEGER, không có
-- status/topic_id) nên không còn chạy được sau V5__reconcile_questions_schema.sql.
--
-- instructor_id 00000000-0000-0000-0000-000000000003 = instructor@ioes.com trong ioes_auth.
-- user_id       00000000-0000-0000-0000-000000000005 = student@ioes.com (role student) trong
--               ioes_auth, được seed sẵn ở auth-service V1__init_schema.sql.
-- course_id     44444444-4444-4444-8444-000000000007 = "React từ Zero đến Hero" trong
--               ioes_content (database/seeds/content-service/dev-seed.sql).
-- Ba database tách rời nên không có khoá ngoại giữa chúng.
--
-- ExamRepository.findQuestionsByExamIdInTx() nối exam → question QUA
-- `exam_sections` (`s.exam_id = exam.id` và `q.section_id = s.id`) và chỉ lấy câu
-- `status = 'published'`. Exam nào không có section kèm câu hỏi published thì
-- POST /exams/:id/start trả NoQuestionsError — nên mỗi đề dưới đây đều có đủ
-- một section và ba câu hỏi.

-- ============================================
-- EXAMS
-- ============================================

INSERT INTO exams (id, course_id, instructor_id, title, description, exam_type,
                   time_limit_minutes, passing_score, max_attempts, is_randomized,
                   show_results, is_proctored)
VALUES
  ('11111111-1111-4111-8111-000000000001',
   '44444444-4444-4444-8444-000000000007',
   '00000000-0000-0000-0000-000000000003',
   'Luyện tập CSS: Box model', 'Bộ câu hỏi ôn tập box model và layout.',
   'practice', 30, 60.00, 5, false, true, false),
  ('11111111-1111-4111-8111-000000000002',
   '44444444-4444-4444-8444-000000000007',
   '00000000-0000-0000-0000-000000000003',
   'Luyện tập JavaScript cơ bản', 'Kiểu dữ liệu, hàm, bất đồng bộ.',
   'practice', 45, 60.00, 3, true, true, false),
  ('11111111-1111-4111-8111-000000000003',
   '44444444-4444-4444-8444-000000000007',
   '00000000-0000-0000-0000-000000000003',
   'Kiểm tra giữa kỳ Web', 'Bài thi có điểm; học viên chỉ thấy khi đã ghi danh.',
   'graded', 60, 50.00, 1, false, false, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- EXAM SECTIONS — cầu nối exam ↔ question
-- ============================================

INSERT INTO exam_sections (id, exam_id, title, description, sort_order,
                           questions_count, points_total)
VALUES
  ('66666666-6666-4666-8666-000000000001', '11111111-1111-4111-8111-000000000001',
   'Box model', 'Ba câu trắc nghiệm về box model.', 0, 3, 3),
  ('66666666-6666-4666-8666-000000000002', '11111111-1111-4111-8111-000000000002',
   'JavaScript cơ bản', 'Ba câu trắc nghiệm về kiểu dữ liệu và bất đồng bộ.', 0, 3, 3),
  ('66666666-6666-4666-8666-000000000003', '11111111-1111-4111-8111-000000000003',
   'Tổng hợp Web', 'Ba câu trắc nghiệm HTML/CSS/JS.', 0, 3, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- QUESTIONS
-- ============================================
-- `status` phải là 'published', nếu không startExam() lọc ra hết.
-- `difficulty` là chuỗi very_easy..very_hard kể từ V5 (trước là INTEGER 1..5).
-- `topic_id` là khái niệm của question-bank (đồ thị Dgraph), không phải course_id.

INSERT INTO questions (id, section_id, course_id, instructor_id, created_by, topic_id,
                       question_type, question_text, explanation, points, difficulty,
                       status, published_at, tags)
VALUES
  -- ===== Đề 1: Box model =====
  ('22222222-2222-4222-8222-000000000001', '66666666-6666-4666-8666-000000000001',
   '44444444-4444-4444-8444-000000000007', '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003', '77777777-7777-4777-8777-000000000001',
   'multiple_choice', 'Box model gồm những lớp nào, từ trong ra ngoài?',
   'content, padding, border, margin.', 1, 'easy', 'published', NOW(), ARRAY['css','box-model']),
  ('22222222-2222-4222-8222-000000000002', '66666666-6666-4666-8666-000000000001',
   '44444444-4444-4444-8444-000000000007', '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003', '77777777-7777-4777-8777-000000000001',
   'multiple_choice', 'Thuộc tính nào tạo flex container?',
   'display: flex biến phần tử thành flex container.', 1, 'very_easy', 'published', NOW(), ARRAY['css','flexbox']),
  ('22222222-2222-4222-8222-000000000003', '66666666-6666-4666-8666-000000000001',
   '44444444-4444-4444-8444-000000000007', '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003', '77777777-7777-4777-8777-000000000001',
   'true_false', 'margin nằm bên trong border.',
   'Sai: margin nằm ngoài cùng.', 1, 'very_easy', 'published', NOW(), ARRAY['css','box-model']),

  -- ===== Đề 2: JavaScript cơ bản =====
  ('22222222-2222-4222-8222-000000000004', '66666666-6666-4666-8666-000000000002',
   '44444444-4444-4444-8444-000000000007', '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003', '77777777-7777-4777-8777-000000000002',
   'multiple_choice', 'typeof null trả về gì?',
   'Trả về "object", lỗi lịch sử của JavaScript.', 1, 'medium', 'published', NOW(), ARRAY['javascript']),
  ('22222222-2222-4222-8222-000000000005', '66666666-6666-4666-8666-000000000002',
   '44444444-4444-4444-8444-000000000007', '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003', '77777777-7777-4777-8777-000000000002',
   'multiple_choice', 'Từ khoá nào khai báo biến có phạm vi khối?',
   'let và const có block scope, var thì không.', 1, 'easy', 'published', NOW(), ARRAY['javascript','scope']),
  ('22222222-2222-4222-8222-000000000006', '66666666-6666-4666-8666-000000000002',
   '44444444-4444-4444-8444-000000000007', '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003', '77777777-7777-4777-8777-000000000002',
   'true_false', 'Promise.all dừng ngay khi một promise bị reject.',
   'Đúng: Promise.all reject ngay khi phần tử đầu tiên reject.', 1, 'medium', 'published', NOW(), ARRAY['javascript','async']),

  -- ===== Đề 3: Tổng hợp Web (bài có điểm) =====
  ('22222222-2222-4222-8222-000000000007', '66666666-6666-4666-8666-000000000003',
   '44444444-4444-4444-8444-000000000007', '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003', '77777777-7777-4777-8777-000000000003',
   'multiple_choice', 'Thẻ nào khai báo tiêu đề cấp cao nhất của trang?',
   'Chỉ nên có một <h1> mỗi trang.', 1, 'very_easy', 'published', NOW(), ARRAY['html']),
  ('22222222-2222-4222-8222-000000000008', '66666666-6666-4666-8666-000000000003',
   '44444444-4444-4444-8444-000000000007', '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003', '77777777-7777-4777-8777-000000000003',
   'multiple_choice', 'Phương thức HTTP nào tạo tài nguyên mới theo REST?',
   'POST tạo mới; PUT thay thế toàn bộ tài nguyên đã biết URI.', 1, 'medium', 'published', NOW(), ARRAY['http','rest']),
  ('22222222-2222-4222-8222-000000000009', '66666666-6666-4666-8666-000000000003',
   '44444444-4444-4444-8444-000000000007', '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003', '77777777-7777-4777-8777-000000000003',
   'true_false', 'localStorage tự hết hạn khi đóng tab.',
   'Sai: sessionStorage mới mất khi đóng tab, localStorage thì không.', 1, 'easy', 'published', NOW(), ARRAY['javascript','storage'])
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- QUESTION OPTIONS
-- ============================================

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
  ('33333333-3333-4333-8333-000000000013', '22222222-2222-4222-8222-000000000006', 'Sai', false, 1),
  ('33333333-3333-4333-8333-000000000014', '22222222-2222-4222-8222-000000000007', '<h1>', true, 0),
  ('33333333-3333-4333-8333-000000000015', '22222222-2222-4222-8222-000000000007', '<head>', false, 1),
  ('33333333-3333-4333-8333-000000000016', '22222222-2222-4222-8222-000000000007', '<title>', false, 2),
  ('33333333-3333-4333-8333-000000000017', '22222222-2222-4222-8222-000000000008', 'POST', true, 0),
  ('33333333-3333-4333-8333-000000000018', '22222222-2222-4222-8222-000000000008', 'PUT', false, 1),
  ('33333333-3333-4333-8333-000000000019', '22222222-2222-4222-8222-000000000008', 'PATCH', false, 2),
  ('33333333-3333-4333-8333-000000000020', '22222222-2222-4222-8222-000000000009', 'Đúng', false, 0),
  ('33333333-3333-4333-8333-000000000021', '22222222-2222-4222-8222-000000000009', 'Sai', true, 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- MỘT LƯỢT ĐÃ CHẤM — để trang kết quả có dữ liệu ngay
-- ============================================

INSERT INTO exam_attempts (id, exam_id, user_id, status, started_at, submitted_at,
                           graded_at, score, max_score, percentage_score, passed,
                           question_ids)
VALUES
  ('44444444-4444-4444-8444-000000000001',
   '11111111-1111-4111-8111-000000000001',
   '00000000-0000-0000-0000-000000000005',
   'graded',
   now() - interval '2 days',
   now() - interval '2 days' + interval '18 minutes',
   now() - interval '2 days' + interval '20 minutes',
   2.00, 3.00, 66.67, true,
   ARRAY['22222222-2222-4222-8222-000000000001',
         '22222222-2222-4222-8222-000000000002',
         '22222222-2222-4222-8222-000000000003']::uuid[])
ON CONFLICT (id) DO NOTHING;
