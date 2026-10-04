-- ============================================
-- IOES AI Service - Dev Seed
-- ============================================
-- 15 chat_sessions, 45 chat_messages cho AI tutor (US-017).
-- Idempotent (id UUID tự sinh v7, ON CONFLICT không cần).
--
-- Áp dụng:
--   docker exec -i ioes-postgres psql -U ioes -d ioes_ai < database/seeds/ai/dev-seed.sql

-- ============================================
-- CHAT SESSIONS (15 rows)
-- ============================================
INSERT INTO chat_sessions (id, user_id, title, status, message_count, last_message_at, metadata)
VALUES
  (uuid_generate_v7(), '00000000-0000-0000-0000-000000000005',
   'Hỏi về React hooks', 'active', 4, NOW() - INTERVAL '3 hours',
   '{"topic":"React","model":"gemini-3.5-flash-lite"}'::jsonb),
  (uuid_generate_v7(), '00000000-0000-0000-0000-000000000005',
   'Tạo lộ trình React', 'active', 6, NOW() - INTERVAL '1 day',
   '{"topic":"Learning Path","model":"gemini-3.5-flash-lite"}'::jsonb),
  (uuid_generate_v7(), '00000000-0000-0000-0000-000000000005',
   'CSS Flexbox cơ bản', 'archived', 8, NOW() - INTERVAL '7 days',
   '{"topic":"CSS"}'::jsonb),

  (uuid_generate_v7(), '00000000-0000-0000-0000-000000000006',
   'Digital Marketing tools', 'active', 5, NOW() - INTERVAL '6 hours',
   '{"topic":"Marketing"}'::jsonb),
  (uuid_generate_v7(), '00000000-0000-0000-0000-000000000006',
   'Smart contract Solidity', 'active', 4, NOW() - INTERVAL '12 hours',
   '{"topic":"Blockchain"}'::jsonb),

  (uuid_generate_v7(), '00000000-0000-0000-0000-000000000008',
   'Python cho Data Science', 'active', 6, NOW() - INTERVAL '5 hours',
   '{"topic":"Data","model":"gemini-3.5-flash-lite"}'::jsonb),
  (uuid_generate_v7(), '00000000-0000-0000-0000-000000000008',
   'Pandas vs NumPy', 'archived', 4, NOW() - INTERVAL '15 days',
   '{"topic":"Python"}'::jsonb),

  (uuid_generate_v7(), '00000000-0000-0000-0000-000000000009',
   'SQL JOIN các loại', 'active', 5, NOW() - INTERVAL '1 day',
   '{"topic":"SQL"}'::jsonb),
  (uuid_generate_v7(), '00000000-0000-0000-0000-000000000009',
   'Database indexing', 'archived', 3, NOW() - INTERVAL '30 days',
   '{"topic":"Database"}'::jsonb),

  (uuid_generate_v7(), '00000000-0000-0000-0000-00000000000A',
   'Solidity mapping', 'active', 4, NOW() - INTERVAL '2 days',
   '{"topic":"Solidity"}'::jsonb),

  (uuid_generate_v7(), '00000000-0000-0000-0000-00000000000B',
   'IELTS Speaking part 2', 'active', 5, NOW() - INTERVAL '4 hours',
   '{"topic":"IELTS"}'::jsonb),

  (uuid_generate_v7(), '00000000-0000-0000-0000-00000000000C',
   'AWS Lambda cold start', 'active', 3, NOW() - INTERVAL '12 hours',
   '{"topic":"AWS"}'::jsonb),
  (uuid_generate_v7(), '00000000-0000-0000-0000-00000000000C',
   'EC2 vs Fargate', 'archived', 4, NOW() - INTERVAL '20 days',
   '{"topic":"AWS"}'::jsonb),

  (uuid_generate_v7(), '00000000-0000-0000-0000-00000000000D',
   'Figma components', 'active', 4, NOW() - INTERVAL '8 hours',
   '{"topic":"UI/UX"}'::jsonb),

  (uuid_generate_v7(), '00000000-0000-0000-0000-00000000000F',
   'Marketing cơ bản', 'active', 2, NOW() - INTERVAL '30 minutes',
   '{"topic":"Marketing"}'::jsonb);

-- ============================================
-- CHAT MESSAGES (45 rows) — 3 messages cho mỗi session
-- ============================================
INSERT INTO chat_messages (id, session_id, role, content, sources, model,
                           prompt_tokens, completion_tokens, total_tokens,
                           latency_ms)
SELECT
  uuid_generate_v7(),
  cs.id,
  'user',
  (ARRAY[
    'useState và useEffect khác nhau như thế nào?',
    'Tạo lộ trình học React cho người mới',
    'Flexbox khác gì Grid?',
    'Công cụ SEO nào tốt nhất 2026?',
    'Mapping trong Solidity hoạt động ra sao?',
    'Pandas và NumPy khác nhau ở điểm nào?',
    'INNER JOIN và LEFT JOIN khác gì nhau?',
    'IELTS Speaking part 2 nên trả lời bao lâu?',
    'AWS Lambda cold start xử lý thế nào?',
    'Figma components vs instances khác nhau?'
  ])[1 + (random() * 9)::int],
  '[]'::jsonb,
  NULL, NULL, NULL, NULL, NULL
FROM chat_sessions cs;

INSERT INTO chat_messages (id, session_id, role, content, sources, model,
                           prompt_tokens, completion_tokens, total_tokens,
                           latency_ms)
SELECT
  uuid_generate_v7(),
  cs.id,
  'assistant',
  (ARRAY[
    'useState quản lý state cục bộ, còn useEffect xử lý side effects sau render...',
    'Lộ trình 8 tuần: 1) JSX/Components, 2) State/Props, 3) Hooks cơ bản, 4) Router...',
    'Flexbox 1 chiều (row/column), Grid 2 chiều (rows + columns). Flexbox tốt cho navigation bars...',
    'Top 5 công cụ SEO 2026: Ahrefs, SEMrush, Google Search Console, Screaming Frog, Surfer SEO...',
    'Mapping trong Solidity giống hash table, ánh xạ key -> value. Hỗ trợ các kiểu...',
    'NumPy tối ưu cho mảng đa chiều và tính toán số; Pandas xây trên NumPy cho cấu trúc bảng...',
    'INNER JOIN trả về chỉ các dòng khớp cả 2 bảng; LEFT JOIN trả tất cả bản ghi bảng trái + NULL bảng phải...',
    'Speaking part 2 nên trả lời 2 phút, chia làm 4 phần: intro, main points, details, conclusion...',
    'Cold start Lambda có thể giảm bằng Provisioned Concurrency, giữ warm với ping định kỳ...',
    'Component là master, instance là bản sao. Sửa component ảnh hưởng mọi instances; sửa instance chỉ local.'
  ])[1 + (random() * 9)::int],
  '[{"doc_id":"course-001","chunk_id":"ch-12","score":0.83,"title":"React Hooks"},{"doc_id":"course-002","chunk_id":"ch-05","score":0.79}]'::jsonb,
  'gemini-3.5-flash-lite',
  (200 + (random() * 600)::int),
  (300 + (random() * 800)::int),
  (500 + (random() * 1400)::int),
  (800 + (random() * 2500)::int)
FROM chat_sessions cs;

INSERT INTO chat_messages (id, session_id, role, content, sources, model,
                           prompt_tokens, completion_tokens, total_tokens,
                           latency_ms)
SELECT
  uuid_generate_v7(),
  cs.id,
  'user',
  (ARRAY[
    'Cảm ơn, cho mình ví dụ thực tế?',
    'Có bài tập thực hành không?',
    'Áp dụng vào project thật như thế nào?',
    'So sánh với công cụ khác?',
    'Có tutorial chính thức không?',
    'Best practices là gì?'
  ])[1 + (random() * 5)::int],
  '[]'::jsonb,
  NULL, NULL, NULL, NULL, NULL
FROM chat_sessions cs;
