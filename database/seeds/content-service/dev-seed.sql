-- Dữ liệu mẫu cho môi trường dev. Chạy lại nhiều lần được.
--   docker exec -i ioes-postgres psql -U ioes -d ioes_content < database/seeds/content-service/dev-seed.sql
--
-- Nội dung (tên khoá, mô tả, giá, thời lượng, ảnh, chương, bài) chuyển nguyên từ dữ liệu giả
-- từng nằm trong apps/web (services/api.ts, pages/public/Courses.tsx, pages/student/CoursesPage.tsx,
-- pages/public/CourseDetailPage.tsx) để giao diện gọi API thật vẫn có dữ liệu như trước.
-- Không chuyển điểm đánh giá, số học viên: cột `stats` do trigger enrollment duy trì.
--
-- instructor_id 00000000-0000-0000-0000-000000000003 = instructor@ioes.com  trong ioes_auth.
-- instructor_id 00000000-0000-0000-0000-000000000004 = instructor2@ioes.com trong ioes_auth.
-- reviewed_by   00000000-0000-0000-0000-000000000001 = admin@ioes.com       trong ioes_auth.
-- Hai database tách rời nên không có khoá ngoại giữa chúng.
--
-- Trạng thái duyệt nằm ở metadata->'review' (xem Course.java); khoá đã xuất bản phải được duyệt trước.

INSERT INTO categories (id, name, slug, description, sort_order)
VALUES
  ('33333333-3333-4333-8333-000000000001', 'AI & ML',            'ai-ml',      'Trí tuệ nhân tạo và học máy', 1),
  ('33333333-3333-4333-8333-000000000002', 'Lập trình',          'lap-trinh',  'Lập trình web và phần mềm', 2),
  ('33333333-3333-4333-8333-000000000003', 'Marketing',          'marketing',  NULL, 3),
  ('33333333-3333-4333-8333-000000000004', 'Kinh doanh',         'kinh-doanh', NULL, 4),
  ('33333333-3333-4333-8333-000000000005', 'Ngoại ngữ',          'ngoai-ngu',  NULL, 5),
  ('33333333-3333-4333-8333-000000000006', 'Blockchain',         'blockchain', NULL, 6),
  ('33333333-3333-4333-8333-000000000007', 'Data',               'data',       'Phân tích và khoa học dữ liệu', 7),
  ('33333333-3333-4333-8333-000000000008', 'Cloud',              'cloud',      NULL, 8),
  ('33333333-3333-4333-8333-000000000009', 'Security',           'security',   NULL, 9),
  ('33333333-3333-4333-8333-000000000010', 'Design',             'design',     NULL, 10),
  ('33333333-3333-4333-8333-000000000011', 'Khoa học máy tính',  'cs',         NULL, 11),
  ('33333333-3333-4333-8333-000000000012', 'Cơ sở dữ liệu',      'database',   NULL, 12)
ON CONFLICT DO NOTHING;

INSERT INTO courses (id, instructor_id, category_id, title, slug, short_description, description,
                     thumbnail_url, price, currency, duration_hours, difficulty_level, language,
                     status, published_at, metadata)
VALUES
  -- ===== Đã duyệt và xuất bản =====
  ('44444444-4444-4444-8444-000000000001', '00000000-0000-0000-0000-000000000003',
   '33333333-3333-4333-8333-000000000001',
   'ChatGPT & AI Tools Masterclass', 'chatgpt-ai-tools-masterclass',
   'Tận dụng sức mạnh của AI để tăng năng suất làm việc 10x.',
   'Khóa học toàn diện về ChatGPT và các công cụ AI hiện đại.',
   'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
   1299000, 'VND', 40, 2, 'vi', 'published', NOW() - INTERVAL '30 days',
   '{"review": {"status": "approved", "submitted_at": "2026-08-01T10:00:00Z", "reviewed_by": "00000000-0000-0000-0000-000000000001", "reviewed_at": "2026-08-02T10:00:00Z"}}'),

  ('44444444-4444-4444-8444-000000000002', '00000000-0000-0000-0000-000000000004',
   '33333333-3333-4333-8333-000000000002',
   'React.js Complete Guide 2024', 'reactjs-complete-guide-2024',
   'Học React từ cơ bản đến nâng cao, xây dựng 10+ dự án thực tế.',
   'Khóa học React.js toàn diện từ cơ bản đến nâng cao.',
   'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop',
   0, 'VND', 60, 3, 'vi', 'published', NOW() - INTERVAL '28 days',
   '{"review": {"status": "approved", "submitted_at": "2026-08-01T10:00:00Z", "reviewed_by": "00000000-0000-0000-0000-000000000001", "reviewed_at": "2026-08-02T10:00:00Z"}}'),

  ('44444444-4444-4444-8444-000000000003', '00000000-0000-0000-0000-000000000004',
   '33333333-3333-4333-8333-000000000003',
   'Digital Marketing toàn diện', 'digital-marketing-toan-dien',
   'SEO, Google Ads, Facebook Ads, Content Marketing từ A đến Z.',
   'Khóa học Digital Marketing toàn diện bao gồm SEO, quảng cáo và content marketing.',
   'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
   899000, 'VND', 35, 2, 'vi', 'published', NOW() - INTERVAL '25 days',
   '{"review": {"status": "approved", "submitted_at": "2026-08-01T10:00:00Z", "reviewed_by": "00000000-0000-0000-0000-000000000001", "reviewed_at": "2026-08-02T10:00:00Z"}}'),

  ('44444444-4444-4444-8444-000000000004', '00000000-0000-0000-0000-000000000004',
   '33333333-3333-4333-8333-000000000004',
   'MBA Essentials - Quản trị kinh doanh hiện đại', 'mba-essentials-quan-tri-kinh-doanh',
   'Chương trình MBA online với chi phí chỉ bằng 1/10.',
   'Chương trình MBA online toàn diện.',
   'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop',
   2499000, 'VND', 120, 4, 'vi', 'published', NOW() - INTERVAL '22 days',
   '{"review": {"status": "approved", "submitted_at": "2026-08-01T10:00:00Z", "reviewed_by": "00000000-0000-0000-0000-000000000001", "reviewed_at": "2026-08-02T10:00:00Z"}}'),

  ('44444444-4444-4444-8444-000000000005', '00000000-0000-0000-0000-000000000004',
   '33333333-3333-4333-8333-000000000005',
   'IELTS 8.0 trong 3 tháng', 'ielts-80-trong-3-thang',
   'Phương pháp học IELTS hiệu quả, cam kết đầu ra.',
   'Khóa học IELTS 8.0 với phương pháp học hiệu quả.',
   'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&h=400&fit=crop',
   1799000, 'VND', 80, 3, 'vi', 'published', NOW() - INTERVAL '20 days',
   '{"review": {"status": "approved", "submitted_at": "2026-08-01T10:00:00Z", "reviewed_by": "00000000-0000-0000-0000-000000000001", "reviewed_at": "2026-08-02T10:00:00Z"}}'),

  ('44444444-4444-4444-8444-000000000006', '00000000-0000-0000-0000-000000000003',
   '33333333-3333-4333-8333-000000000006',
   'Solidity & Smart Contract Development', 'solidity-smart-contract-development',
   'Học lập trình smart contract, xây dựng DApps trên Ethereum.',
   'Khóa học Solidity và Smart Contract từ cơ bản đến nâng cao.',
   'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=400&fit=crop',
   0, 'VND', 45, 4, 'en', 'published', NOW() - INTERVAL '18 days',
   '{"review": {"status": "approved", "submitted_at": "2026-08-01T10:00:00Z", "reviewed_by": "00000000-0000-0000-0000-000000000001", "reviewed_at": "2026-08-02T10:00:00Z"}}'),

  ('44444444-4444-4444-8444-000000000007', '00000000-0000-0000-0000-000000000003',
   '33333333-3333-4333-8333-000000000002',
   'Lập trình Web với React.js', 'lap-trinh-web-voi-reactjs',
   'Xây dựng ứng dụng web hiện đại với React, TypeScript và TailwindCSS.',
   'Khóa học toàn diện về React.js từ cơ bản đến nâng cao. Bạn sẽ học cách xây dựng các ứng dụng web production-grade với React 18, TypeScript, TailwindCSS và các công cụ hiện đại. Khóa học bao gồm nhiều dự án thực tế và bài tập thử thách.',
   'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=70',
   0, 'VND', 32, 3, 'vi', 'published', NOW() - INTERVAL '15 days',
   '{"review": {"status": "approved", "submitted_at": "2026-08-01T10:00:00Z", "reviewed_by": "00000000-0000-0000-0000-000000000001", "reviewed_at": "2026-08-02T10:00:00Z"}}'),

  ('44444444-4444-4444-8444-000000000008', '00000000-0000-0000-0000-000000000003',
   '33333333-3333-4333-8333-000000000001',
   'Machine Learning Fundamentals', 'machine-learning-fundamentals',
   'Khóa học nền tảng về ML với Python',
   'Khóa học nền tảng về Machine Learning với Python, scikit-learn và TensorFlow. Phù hợp cho người mới bắt đầu.',
   'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=70',
   0, 'VND', 24, 2, 'vi', 'published', NOW() - INTERVAL '14 days',
   '{"review": {"status": "approved", "submitted_at": "2026-08-01T10:00:00Z", "reviewed_by": "00000000-0000-0000-0000-000000000001", "reviewed_at": "2026-08-02T10:00:00Z"}}'),

  ('44444444-4444-4444-8444-000000000009', '00000000-0000-0000-0000-000000000003',
   '33333333-3333-4333-8333-000000000008',
   'Cloud Computing AWS', 'cloud-computing-aws',
   'AWS EC2, S3, Lambda',
   'AWS EC2, S3, Lambda và các dịch vụ cloud. Chuẩn bị cho chứng chỉ AWS Solutions Architect.',
   'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=70',
   0, 'VND', 22, 3, 'vi', 'published', NOW() - INTERVAL '12 days',
   '{"review": {"status": "approved", "submitted_at": "2026-07-15T10:00:00Z", "reviewed_by": "00000000-0000-0000-0000-000000000001", "reviewed_at": "2026-08-10T10:00:00Z"}}'),

  ('44444444-4444-4444-8444-000000000010', '00000000-0000-0000-0000-000000000004',
   '33333333-3333-4333-8333-000000000002',
   'Modern Web Development', 'modern-web-development',
   'React, TypeScript, TailwindCSS',
   'React, TypeScript, TailwindCSS và các công nghệ web hiện đại. Xây dựng production-grade web apps.',
   'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=70',
   0, 'VND', 32, 2, 'vi', 'published', NOW() - INTERVAL '10 days',
   '{"review": {"status": "approved", "submitted_at": "2026-08-01T10:00:00Z", "reviewed_by": "00000000-0000-0000-0000-000000000001", "reviewed_at": "2026-08-02T10:00:00Z"}}'),

  ('44444444-4444-4444-8444-000000000011', '00000000-0000-0000-0000-000000000004',
   '33333333-3333-4333-8333-000000000010',
   'UI/UX Design Fundamentals', 'ui-ux-design-fundamentals',
   NULL, NULL,
   'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800&q=70',
   0, 'VND', 22, 2, 'vi', 'published', NOW() - INTERVAL '9 days',
   '{"review": {"status": "approved", "submitted_at": "2026-08-01T10:00:00Z", "reviewed_by": "00000000-0000-0000-0000-000000000001", "reviewed_at": "2026-08-02T10:00:00Z"}}'),

  ('44444444-4444-4444-8444-000000000012', '00000000-0000-0000-0000-000000000004',
   '33333333-3333-4333-8333-000000000011',
   'Data Structures & Algorithms', 'data-structures-algorithms',
   NULL, NULL,
   'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=70',
   0, 'VND', 40, 3, 'vi', 'published', NOW() - INTERVAL '8 days',
   '{"review": {"status": "approved", "submitted_at": "2026-08-01T10:00:00Z", "reviewed_by": "00000000-0000-0000-0000-000000000001", "reviewed_at": "2026-08-02T10:00:00Z"}}'),

  ('44444444-4444-4444-8444-000000000013', '00000000-0000-0000-0000-000000000003',
   '33333333-3333-4333-8333-000000000012',
   'Database Systems', 'database-systems',
   NULL, NULL,
   'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=70',
   0, 'VND', 30, 3, 'vi', 'published', NOW() - INTERVAL '7 days',
   '{"review": {"status": "approved", "submitted_at": "2026-08-01T10:00:00Z", "reviewed_by": "00000000-0000-0000-0000-000000000001", "reviewed_at": "2026-08-02T10:00:00Z"}}'),

  -- ===== Bản nháp đang chờ duyệt (hiện ở trang duyệt khoá học của admin) =====
  ('44444444-4444-4444-8444-000000000014', '00000000-0000-0000-0000-000000000003',
   '33333333-3333-4333-8333-000000000006',
   'Blockchain & Smart Contracts', 'blockchain-smart-contracts',
   'Solidity và Ethereum',
   'Xây dựng smart contract với Solidity và Ethereum. Triển khai lên testnet và mainnet.',
   'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=400&fit=crop',
   0, 'VND', 18, 4, 'vi', 'draft', NULL,
   '{"review": {"status": "pending", "submitted_at": "2026-08-18T10:00:00Z"}}'),

  ('44444444-4444-4444-8444-000000000015', '00000000-0000-0000-0000-000000000004',
   '33333333-3333-4333-8333-000000000007',
   'Data Science with Python', 'data-science-with-python',
   'pandas, numpy, matplotlib',
   'Phân tích dữ liệu với pandas, numpy, matplotlib. Trực quan hóa và thống kê.',
   'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=70',
   0, 'VND', 28, 2, 'vi', 'draft', NULL,
   '{"review": {"status": "pending", "submitted_at": "2026-08-15T10:00:00Z"}}'),

  -- ===== Bản nháp bị từ chối =====
  ('44444444-4444-4444-8444-000000000016', '00000000-0000-0000-0000-000000000003',
   '33333333-3333-4333-8333-000000000009',
   'Cybersecurity Basics', 'cybersecurity-basics',
   'Bảo mật cơ bản',
   'Bảo mật cơ bản cho developer. OWASP Top 10 và best practices.',
   'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=70',
   0, 'VND', 20, 2, 'vi', 'draft', NULL,
   '{"review": {"status": "rejected", "submitted_at": "2026-08-12T10:00:00Z", "reviewed_by": "00000000-0000-0000-0000-000000000001", "reviewed_at": "2026-08-15T10:00:00Z", "rejection_reason": "Nội dung chưa đủ slide bài giảng"}}')
ON CONFLICT DO NOTHING;

-- Chương. Chỉ những khoá mà dữ liệu cũ có mục lục.
INSERT INTO chapters (id, course_id, title, sort_order, is_free)
VALUES
  -- Lập trình Web với React.js
  ('55555555-5555-4555-8555-000000000001', '44444444-4444-4444-8444-000000000007', 'Giới thiệu & Cài đặt', 1, true),
  ('55555555-5555-4555-8555-000000000002', '44444444-4444-4444-8444-000000000007', 'React Cơ bản', 2, false),
  ('55555555-5555-4555-8555-000000000003', '44444444-4444-4444-8444-000000000007', 'React Hooks', 3, false),
  ('55555555-5555-4555-8555-000000000004', '44444444-4444-4444-8444-000000000007', 'Styling', 4, false),
  ('55555555-5555-4555-8555-000000000005', '44444444-4444-4444-8444-000000000007', 'Routing & Data', 5, false),
  -- Machine Learning Fundamentals
  ('55555555-5555-4555-8555-000000000011', '44444444-4444-4444-8444-000000000008', 'Giới thiệu & Cài đặt môi trường', 1, true),
  ('55555555-5555-4555-8555-000000000012', '44444444-4444-4444-8444-000000000008', 'Python cho Machine Learning', 2, false),
  ('55555555-5555-4555-8555-000000000013', '44444444-4444-4444-8444-000000000008', 'Supervised Learning', 3, false),
  ('55555555-5555-4555-8555-000000000014', '44444444-4444-4444-8444-000000000008', 'Unsupervised Learning', 4, false),
  ('55555555-5555-4555-8555-000000000015', '44444444-4444-4444-8444-000000000008', 'Deep Learning & Neural Networks', 5, false),
  ('55555555-5555-4555-8555-000000000016', '44444444-4444-4444-8444-000000000008', 'Dự án cuối khoá', 6, false),
  -- ChatGPT & AI Tools Masterclass
  ('55555555-5555-4555-8555-000000000021', '44444444-4444-4444-8444-000000000001', 'Nền tảng ChatGPT', 1, true),
  ('55555555-5555-4555-8555-000000000022', '44444444-4444-4444-8444-000000000001', 'Prompt Engineering', 2, false),
  ('55555555-5555-4555-8555-000000000023', '44444444-4444-4444-8444-000000000001', 'Workflow tự động hoá', 3, false),
  -- React.js Complete Guide 2024
  ('55555555-5555-4555-8555-000000000031', '44444444-4444-4444-8444-000000000002', 'React cơ bản', 1, true),
  ('55555555-5555-4555-8555-000000000032', '44444444-4444-4444-8444-000000000002', 'Hooks & State Management', 2, false),
  ('55555555-5555-4555-8555-000000000033', '44444444-4444-4444-8444-000000000002', 'React Router & Forms', 3, false)
ON CONFLICT DO NOTHING;

-- Bài học của "Lập trình Web với React.js" — khoá duy nhất có tên bài trong dữ liệu cũ.
-- Kiểu "reading" cũ đổi thành document, "project" thành assignment theo enum lesson_type.
INSERT INTO lessons (id, chapter_id, title, description, lesson_type, duration_minutes, sort_order, is_free, is_preview)
VALUES
  ('66666666-6666-4666-8666-000000000001', '55555555-5555-4555-8555-000000000001', 'Tổng quan khóa học',
   'Chào mừng bạn đến với khóa học React.js! Trong bài học đầu tiên này, chúng ta sẽ cùng nhau tìm hiểu về lộ trình học và những gì bạn sẽ đạt được sau khóa học.',
   'video', 8, 1, true, true),
  ('66666666-6666-4666-8666-000000000002', '55555555-5555-4555-8555-000000000001', 'Cài đặt môi trường',
   'Cài đặt Node.js, VS Code và các extension cần thiết cho khóa học.',
   'video', 15, 2, true, true),
  ('66666666-6666-4666-8666-000000000003', '55555555-5555-4555-8555-000000000001', 'Khởi tạo dự án React với Vite',
   NULL, 'video', 20, 3, true, false),
  ('66666666-6666-4666-8666-000000000004', '55555555-5555-4555-8555-000000000002', 'JSX và Components',
   NULL, 'video', 25, 1, false, false),
  ('66666666-6666-4666-8666-000000000005', '55555555-5555-4555-8555-000000000002', 'Props và State',
   'Trong bài học này, chúng ta sẽ tìm hiểu sâu về Props và State - hai khái niệm quan trọng nhất của React. Props giúp truyền dữ liệu từ component cha xuống component con, còn State giúp component quản lý dữ liệu nội tại của nó.',
   'video', 30, 2, false, false),
  ('66666666-6666-4666-8666-000000000006', '55555555-5555-4555-8555-000000000002', 'Xử lý sự kiện',
   NULL, 'video', 22, 3, false, false),
  ('66666666-6666-4666-8666-000000000007', '55555555-5555-4555-8555-000000000002', 'Conditional Rendering',
   NULL, 'video', 18, 4, false, false),
  ('66666666-6666-4666-8666-000000000008', '55555555-5555-4555-8555-000000000002', 'Quiz: React cơ bản',
   NULL, 'quiz', 15, 5, false, false),
  ('66666666-6666-4666-8666-000000000009', '55555555-5555-4555-8555-000000000003', 'useState Hook',
   NULL, 'video', 28, 1, false, false),
  ('66666666-6666-4666-8666-000000000010', '55555555-5555-4555-8555-000000000003', 'useEffect Hook',
   'useEffect là Hook cho phép bạn thực hiện side effects trong function component. Nó tương đương với componentDidMount, componentDidUpdate và componentWillUnmount trong class component.',
   'document', 35, 2, false, false),
  ('66666666-6666-4666-8666-000000000011', '55555555-5555-4555-8555-000000000003', 'useContext',
   NULL, 'video', 24, 3, false, false),
  ('66666666-6666-4666-8666-000000000012', '55555555-5555-4555-8555-000000000003', 'Custom Hooks',
   NULL, 'video', 32, 4, false, false),
  ('66666666-6666-4666-8666-000000000013', '55555555-5555-4555-8555-000000000003', 'Project: Todo App',
   NULL, 'assignment', 90, 5, false, false),
  ('66666666-6666-4666-8666-000000000014', '55555555-5555-4555-8555-000000000004', 'TailwindCSS Setup',
   NULL, 'video', 20, 1, false, false),
  ('66666666-6666-4666-8666-000000000015', '55555555-5555-4555-8555-000000000004', 'Component variants với CVA',
   NULL, 'video', 25, 2, false, false),
  ('66666666-6666-4666-8666-000000000016', '55555555-5555-4555-8555-000000000004', 'Dark mode',
   NULL, 'video', 18, 3, false, false),
  ('66666666-6666-4666-8666-000000000017', '55555555-5555-4555-8555-000000000005', 'React Router v6',
   NULL, 'video', 30, 1, false, false),
  ('66666666-6666-4666-8666-000000000018', '55555555-5555-4555-8555-000000000005', 'React Query cơ bản',
   NULL, 'video', 35, 2, false, false),
  ('66666666-6666-4666-8666-000000000019', '55555555-5555-4555-8555-000000000005', 'Form handling với React Hook Form',
   NULL, 'video', 28, 3, false, false)
ON CONFLICT DO NOTHING;
