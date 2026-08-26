/**
 * Mock database seeding (matching migrations from auth-service, content-service).
 * Used as the API layer for admin pages until the real backend is connected.
 * Each call simulates a network request with a small delay.
 */

import type {
  User, UserStatus, UserRole,
  Course, CourseStats,
  CourseApprovalItem, CourseApprovalStatus,
  PaginatedResponse, UserListParams, CourseListParams,
  UserStats, CourseStatsSummary,
} from '@/types/db';

const sleep = (ms?: number) => new Promise(r => setTimeout(r, ms));

// ============================================
// SEED DATA — USERS (matches auth-service.users)
// ============================================

const seedUsers: User[] = [
  {
    id: 'u-001',
    email: 'minh.nv@fpt.edu.vn',
    full_name: 'Nguyễn Văn Minh',
    avatar_url: 'https://i.pravatar.cc/100?img=1',
    phone: '+84-901-234-567',
    bio: 'Quản trị hệ thống cấp cao',
    status: 'active',
    role: 'admin',
    email_verified: true,
    mfa_enabled: true,
    last_login_at: '2026-08-22T08:30:00Z',
    last_login_ip: '192.168.1.10',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2026-08-22T08:30:00Z',
    deleted_at: null,
  },
  {
    id: 'u-002',
    email: 'super.admin@ioes.vn',
    full_name: 'Trần Quốc Bảo',
    avatar_url: null,
    phone: '+84-902-111-222',
    bio: 'Super admin hệ thống',
    status: 'active',
    role: 'super_admin',
    email_verified: true,
    mfa_enabled: true,
    last_login_at: '2026-08-22T09:15:00Z',
    last_login_ip: '192.168.1.5',
    created_at: '2023-09-01T08:00:00Z',
    updated_at: '2026-08-22T09:15:00Z',
    deleted_at: null,
  },
  {
    id: 'u-003',
    email: 'a.nv@fpt.edu.vn',
    full_name: 'TS. Nguyễn Văn A',
    avatar_url: 'https://i.pravatar.cc/100?img=5',
    phone: '+84-903-333-444',
    bio: 'Giảng viên Khoa CNTT, chuyên AI/ML',
    status: 'active',
    role: 'instructor',
    email_verified: true,
    mfa_enabled: false,
    last_login_at: '2026-08-21T14:20:00Z',
    last_login_ip: '10.0.0.42',
    created_at: '2024-02-20T08:00:00Z',
    updated_at: '2026-08-21T14:20:00Z',
    deleted_at: null,
  },
  {
    id: 'u-004',
    email: 'huong.tt@fpt.edu.vn',
    full_name: 'Trần Thị Hương',
    avatar_url: null,
    phone: '+84-904-555-666',
    bio: 'Giảng viên Khoa Toán',
    status: 'active',
    role: 'instructor',
    email_verified: true,
    mfa_enabled: false,
    last_login_at: '2026-08-22T07:00:00Z',
    last_login_ip: '10.0.0.45',
    created_at: '2024-03-10T08:00:00Z',
    updated_at: '2026-08-22T07:00:00Z',
    deleted_at: null,
  },
  {
    id: 'u-005',
    email: 'nam.nh@fpt.edu.vn',
    full_name: 'Nguyễn Hoàng Nam',
    avatar_url: 'https://i.pravatar.cc/100?img=11',
    phone: '+84-905-777-888',
    bio: 'Sinh viên năm 3',
    status: 'active',
    role: 'student',
    email_verified: true,
    mfa_enabled: false,
    last_login_at: '2026-08-22T05:30:00Z',
    last_login_ip: '10.0.0.100',
    created_at: '2024-04-05T08:00:00Z',
    updated_at: '2026-08-22T05:30:00Z',
    deleted_at: null,
  },
  {
    id: 'u-006',
    email: 'linh.k@fpt.edu.vn',
    full_name: 'Kiều Linh',
    avatar_url: null,
    phone: '+84-906-999-000',
    bio: 'Sinh viên',
    status: 'suspended',
    role: 'student',
    email_verified: true,
    mfa_enabled: false,
    last_login_at: '2026-07-10T12:00:00Z',
    last_login_ip: '10.0.0.105',
    created_at: '2024-05-12T08:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    deleted_at: null,
  },
  {
    id: 'u-007',
    email: 'ha.dt@fpt.edu.vn',
    full_name: 'Đỗ Thu Hà',
    avatar_url: 'https://i.pravatar.cc/100?img=16',
    phone: '+84-907-222-333',
    bio: 'Sinh viên năm 2',
    status: 'active',
    role: 'student',
    email_verified: true,
    mfa_enabled: false,
    last_login_at: '2026-08-20T18:45:00Z',
    last_login_ip: '10.0.0.110',
    created_at: '2024-06-20T08:00:00Z',
    updated_at: '2026-08-20T18:45:00Z',
    deleted_at: null,
  },
  {
    id: 'u-008',
    email: 'quang.pv@fpt.edu.vn',
    full_name: 'Phạm Văn Quang',
    avatar_url: 'https://i.pravatar.cc/100?img=8',
    phone: '+84-908-444-555',
    bio: 'Giảng viên Khoa CNTT',
    status: 'active',
    role: 'instructor',
    email_verified: true,
    mfa_enabled: false,
    last_login_at: '2026-06-15T09:00:00Z',
    last_login_ip: '10.0.0.50',
    created_at: '2024-07-01T08:00:00Z',
    updated_at: '2026-08-15T10:00:00Z',
    deleted_at: null,
  } as User,
  {
    id: 'u-009',
    email: 'hang.lm@fpt.edu.vn',
    full_name: 'Lê Minh Hằng',
    avatar_url: null,
    phone: '+84-909-666-777',
    bio: 'Sinh viên năm 4',
    status: 'active',
    role: 'student',
    email_verified: true,
    mfa_enabled: false,
    last_login_at: '2026-08-21T20:00:00Z',
    last_login_ip: '10.0.0.115',
    created_at: '2024-07-15T08:00:00Z',
    updated_at: '2026-08-21T20:00:00Z',
    deleted_at: null,
  },
  {
    id: 'u-010',
    email: 'khoi.nb@fpt.edu.vn',
    full_name: 'Nguyễn Bá Khôi',
    avatar_url: 'https://i.pravatar.cc/100?img=12',
    phone: '+84-910-888-999',
    bio: 'Sinh viên',
    status: 'pending',
    role: 'student',
    email_verified: false,
    mfa_enabled: false,
    last_login_at: null,
    last_login_ip: null,
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z',
    deleted_at: null,
  },
  {
    id: 'u-011',
    email: 'guest@demo.ioes.vn',
    full_name: 'Khách thử nghiệm',
    avatar_url: null,
    phone: null,
    bio: null,
    status: 'active',
    role: 'guest',
    email_verified: false,
    mfa_enabled: false,
    last_login_at: null,
    last_login_ip: null,
    created_at: '2026-08-22T05:00:00Z',
    updated_at: '2026-08-22T05:00:00Z',
    deleted_at: null,
  },
  {
    id: 'u-012',
    email: 'thanh.ht@fpt.edu.vn',
    full_name: 'Hoàng Thanh Thanh',
    avatar_url: 'https://i.pravatar.cc/100?img=20',
    phone: '+84-911-000-111',
    bio: 'Sinh viên',
    status: 'suspended',
    role: 'student',
    email_verified: true,
    mfa_enabled: false,
    last_login_at: '2026-07-25T11:00:00Z',
    last_login_ip: '10.0.0.120',
    created_at: '2024-08-01T08:00:00Z',
    updated_at: '2026-08-10T10:00:00Z',
    deleted_at: null,
  },
];

// ============================================
// SEED DATA — COURSES (matches content-service.courses)
// ============================================

const courseStats = (enrollments: number, rating = 4.5): CourseStats => ({
  enrollments,
  completion_rate: Math.min(95, 30 + enrollments / 10),
  avg_rating: rating,
  total_reviews: Math.floor(enrollments / 5),
});

const seedCourses: Course[] = [
  {
    id: 'c-001',
    instructor_id: 'u-003',
    category_id: 'cat-ai',
    title: 'Machine Learning Fundamentals',
    slug: 'machine-learning-fundamentals',
    short_description: 'Khóa học nền tảng về ML với Python',
    description: 'Khóa học nền tảng về Machine Learning với Python, scikit-learn và TensorFlow. Phù hợp cho người mới bắt đầu.',
    thumbnail_url: null,
    preview_video_url: null,
    price: 0,
    currency: 'USD',
    duration_hours: 24,
    difficulty_level: 2,
    language: 'vi',
    status: 'draft',
    published_at: null,
    stats: courseStats(0),
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z',
    deleted_at: null,
    instructor_name: 'TS. Nguyễn Văn A',
    category_name: 'AI/ML',
    lessons_count: 24,
  },
  {
    id: 'c-002',
    instructor_id: 'u-004',
    category_id: 'cat-web',
    title: 'Modern Web Development',
    slug: 'modern-web-development',
    short_description: 'React, TypeScript, TailwindCSS',
    description: 'React, TypeScript, TailwindCSS và các công nghệ web hiện đại. Xây dựng production-grade web apps.',
    thumbnail_url: null,
    preview_video_url: null,
    price: 0,
    currency: 'USD',
    duration_hours: 32,
    difficulty_level: 2,
    language: 'vi',
    status: 'draft',
    published_at: null,
    stats: courseStats(0),
    created_at: '2026-08-19T08:00:00Z',
    updated_at: '2026-08-19T08:00:00Z',
    deleted_at: null,
    instructor_name: 'Trần Thị Hương',
    category_name: 'Web Dev',
    lessons_count: 32,
  },
  {
    id: 'c-003',
    instructor_id: 'u-008',
    category_id: 'cat-blockchain',
    title: 'Blockchain & Smart Contracts',
    slug: 'blockchain-smart-contracts',
    short_description: 'Solidity và Ethereum',
    description: 'Xây dựng smart contract với Solidity và Ethereum. Triển khai lên testnet và mainnet.',
    thumbnail_url: null,
    preview_video_url: null,
    price: 0,
    currency: 'USD',
    duration_hours: 18,
    difficulty_level: 4,
    language: 'vi',
    status: 'draft',
    published_at: null,
    stats: courseStats(0),
    created_at: '2026-08-18T10:00:00Z',
    updated_at: '2026-08-18T10:00:00Z',
    deleted_at: null,
    instructor_name: 'Phạm Văn Quang',
    category_name: 'Blockchain',
    lessons_count: 18,
  },
  {
    id: 'c-004',
    instructor_id: 'u-009',
    category_id: 'cat-data',
    title: 'Data Science with Python',
    slug: 'data-science-with-python',
    short_description: 'pandas, numpy, matplotlib',
    description: 'Phân tích dữ liệu với pandas, numpy, matplotlib. Trực quan hóa và thống kê.',
    thumbnail_url: null,
    preview_video_url: null,
    price: 0,
    currency: 'USD',
    duration_hours: 28,
    difficulty_level: 2,
    language: 'vi',
    status: 'draft',
    published_at: null,
    stats: courseStats(0),
    created_at: '2026-08-15T10:00:00Z',
    updated_at: '2026-08-15T10:00:00Z',
    deleted_at: null,
    instructor_name: 'Lê Minh Hằng',
    category_name: 'Data',
    lessons_count: 28,
  },
  {
    id: 'c-005',
    instructor_id: 'u-003',
    category_id: 'cat-cloud',
    title: 'Cloud Computing AWS',
    slug: 'cloud-computing-aws',
    short_description: 'AWS EC2, S3, Lambda',
    description: 'AWS EC2, S3, Lambda và các dịch vụ cloud. Chuẩn bị cho chứng chỉ AWS Solutions Architect.',
    thumbnail_url: null,
    preview_video_url: null,
    price: 0,
    currency: 'USD',
    duration_hours: 22,
    difficulty_level: 3,
    language: 'vi',
    status: 'published',
    published_at: '2026-08-10T10:00:00Z',
    stats: courseStats(156, 4.7),
    created_at: '2026-07-15T10:00:00Z',
    updated_at: '2026-08-10T10:00:00Z',
    deleted_at: null,
    instructor_name: 'TS. Nguyễn Văn A',
    category_name: 'Cloud',
    lessons_count: 22,
  },
  {
    id: 'c-006',
    instructor_id: 'u-008',
    category_id: 'cat-security',
    title: 'Cybersecurity Basics',
    slug: 'cybersecurity-basics',
    short_description: 'Bảo mật cơ bản',
    description: 'Bảo mật cơ bản cho developer. OWASP Top 10 và best practices.',
    thumbnail_url: null,
    preview_video_url: null,
    price: 0,
    currency: 'USD',
    duration_hours: 20,
    difficulty_level: 2,
    language: 'vi',
    status: 'draft',
    published_at: null,
    stats: courseStats(0),
    created_at: '2026-08-12T10:00:00Z',
    updated_at: '2026-08-12T10:00:00Z',
    deleted_at: null,
    instructor_name: 'Phạm Văn Quang',
    category_name: 'Security',
    lessons_count: 20,
  },
];

// Rejected courses are represented as archived with rejection_reason in metadata
// (we keep it simple in seed data; the approval table isn't yet in schema)

// ============================================
// API: USERS
// ============================================

let usersStore: User[] = JSON.parse(JSON.stringify(seedUsers));

export const usersApi = {
  async list(params: UserListParams = {}): Promise<PaginatedResponse<User>> {
    await sleep();
    const { page = 1, per_page = 10, search = '', role = 'all', status = 'all', sort = 'newest' } = params;
    let arr = usersStore.filter(u => !u.deleted_at);
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter(u => u.full_name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    if (role !== 'all') arr = arr.filter(u => u.role === role);
    if (status !== 'all') arr = arr.filter(u => u.status === status);

    if (sort === 'newest') arr = [...arr].sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sort === 'oldest') arr = [...arr].sort((a, b) => a.created_at.localeCompare(b.created_at));
    else if (sort === 'name_asc') arr = [...arr].sort((a, b) => a.full_name.localeCompare(b.full_name));
    else if (sort === 'name_desc') arr = [...arr].sort((a, b) => b.full_name.localeCompare(a.full_name));

    const total = arr.length;
    const total_pages = Math.max(1, Math.ceil(total / per_page));
    const start = (page - 1) * per_page;
    return {
      data: arr.slice(start, start + per_page),
      meta: { total, page, per_page, total_pages },
    };
  },

  async stats(): Promise<UserStats> {
    await sleep(150);
    const active = usersStore.filter(u => !u.deleted_at);
    return {
      total: active.length,
      students: active.filter(u => u.role === 'student').length,
      instructors: active.filter(u => u.role === 'instructor').length,
      admins: active.filter(u => u.role === 'admin').length,
      super_admins: active.filter(u => u.role === 'super_admin').length,
      suspended: active.filter(u => u.status === 'suspended').length,
      pending: active.filter(u => u.status === 'pending').length,
      active: active.filter(u => u.status === 'active').length,
    };
  },

  async getById(id: string): Promise<User | null> {
    await sleep(100);
    return usersStore.find(u => u.id === id) ?? null;
  },

  async create(payload: Partial<User>): Promise<User> {
    await sleep();
    const newUser: User = {
      id: `u-${Date.now()}`,
      email: payload.email ?? '',
      full_name: payload.full_name ?? '',
      avatar_url: payload.avatar_url ?? null,
      phone: payload.phone ?? null,
      bio: payload.bio ?? null,
      status: payload.status ?? 'pending',
      role: payload.role ?? 'student',
      email_verified: false,
      mfa_enabled: false,
      last_login_at: null,
      last_login_ip: null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    usersStore = [newUser, ...usersStore];
    return newUser;
  },

  async updateStatus(id: string, status: UserStatus): Promise<User | null> {
    await sleep();
    const idx = usersStore.findIndex(u => u.id === id);
    if (idx === -1) return null;
    usersStore[idx] = { ...usersStore[idx], status, updated_at: new Date().toISOString() };
    return usersStore[idx];
  },

  async updateRole(id: string, role: UserRole): Promise<User | null> {
    await sleep();
    const idx = usersStore.findIndex(u => u.id === id);
    if (idx === -1) return null;
    usersStore[idx] = { ...usersStore[idx], role, updated_at: new Date().toISOString() };
    return usersStore[idx];
  },

  async delete(id: string): Promise<boolean> {
    await sleep();
    // Soft delete (matches DB constraint: users.status includes 'deleted' + deleted_at).
    // Never run DELETE FROM users. Only the existing `deleted` status works,
    // and we mirror it with deleted_at so the row stays row-level auditable.
    const idx = usersStore.findIndex(u => u.id === id);
    if (idx === -1) return false;
    usersStore[idx] = {
      ...usersStore[idx],
      status: 'deleted',
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return true;
  },
};

// ============================================
// API: COURSES
// ============================================
// course_status (DB) and approval (UI workflow) are INDEPENDENT concepts:
//   - course_status: draft | published | archived   →  column `courses.status`
//   - metadata.review.status: pending | approved | rejected  →  column `courses.metadata` (JSONB)
//
// We do NOT add any new DB column. Refusing to map `archived` → `rejected`
// because a course can be archived for many reasons unrelated to rejection
// (e.g. instructor retires the course, end of term, etc).
//
// `approvalStore: Map` was REMOVED in favor of `course.metadata.review` so the
// reason survives page refresh and matches the JSONB column already in schema.

interface CourseMetaReview {
  status: CourseApprovalStatus;
  submitted_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
}

const reviewSeed: Record<string, CourseMetaReview> = {
  'c-001': { status: 'pending', submitted_at: '2026-08-20T10:00:00Z' },
  'c-002': { status: 'pending', submitted_at: '2026-08-19T08:00:00Z' },
  'c-003': { status: 'pending', submitted_at: '2026-08-18T10:00:00Z' },
  'c-004': { status: 'pending', submitted_at: '2026-08-15T10:00:00Z' },
  'c-005': { status: 'approved', submitted_at: '2026-07-15T10:00:00Z', reviewed_by: 'u-001', reviewed_at: '2026-08-10T10:00:00Z', rejection_reason: null },
  'c-006': { status: 'rejected', submitted_at: '2026-08-12T10:00:00Z', reviewed_by: 'u-001', reviewed_at: '2026-08-15T10:00:00Z', rejection_reason: 'Nội dung chưa đủ slide bài giảng' },
};

let coursesStore: Course[] = JSON.parse(JSON.stringify(seedCourses)).map((c: Course) => ({
  ...c,
  metadata: { ...(c.metadata ?? {}), review: reviewSeed[c.id] },
}));

const getReview = (c: Course): CourseMetaReview | undefined =>
  (c.metadata?.review as CourseMetaReview | undefined) ?? undefined;

const setReview = (idx: number, next: CourseMetaReview) => {
  coursesStore[idx] = {
    ...coursesStore[idx],
    metadata: { ...(coursesStore[idx].metadata ?? {}), review: next },
  };
};

export const coursesApi = {
  async list(params: CourseListParams = {}): Promise<PaginatedResponse<Course>> {
    await sleep();
    const { page = 1, per_page = 10, search = '', status = 'all' } = params;
    let arr = coursesStore.filter(c => !c.deleted_at);
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter(c =>
        c.title.toLowerCase().includes(s) ||
        (c.instructor_name ?? '').toLowerCase().includes(s)
      );
    }
    // course_status filter
    if (status === 'draft' || status === 'published' || status === 'archived') {
      arr = arr.filter(c => c.status === status);
    }
    // approval_status filter (read from metadata.review)
    if (status === 'pending' || status === 'approved' || status === 'rejected') {
      arr = arr.filter(c => getReview(c)?.status === status);
    }
    const total = arr.length;
    const total_pages = Math.max(1, Math.ceil(total / per_page));
    const start = (page - 1) * per_page;
    return { data: arr.slice(start, start + per_page), meta: { total, page, per_page, total_pages } };
  },

  async stats(): Promise<CourseStatsSummary> {
    await sleep(150);
    const active = coursesStore.filter(c => !c.deleted_at);
    const pendingCount = active.filter(c => getReview(c)?.status === 'pending').length;
    return {
      total: active.length,
      draft: active.filter(c => c.status === 'draft').length,
      published: active.filter(c => c.status === 'published').length,
      archived: active.filter(c => c.status === 'archived').length,
      pending_approval: pendingCount,
    };
  },

  async getApproval(id: string): Promise<CourseApprovalItem | null> {
    await sleep(100);
    const course = coursesStore.find(c => c.id === id);
    const review = course ? getReview(course) : undefined;
    if (!course || !review) return null;
    return { course, review };
  },

  async approve(id: string, reviewerId: string): Promise<Course | null> {
    await sleep();
    const idx = coursesStore.findIndex(c => c.id === id);
    if (idx === -1) return null;
    const review = getReview(coursesStore[idx]);
    if (review) {
      setReview(idx, {
        ...review,
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      });
    }
    // Approving the review also flips course_status to published (workflow side-effect).
    // This is still DB-correct because we only touch the existing course_status column.
    coursesStore[idx] = {
      ...coursesStore[idx],
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return coursesStore[idx];
  },

  async reject(id: string, reviewerId: string, reason: string): Promise<Course | null> {
    await sleep();
    const idx = coursesStore.findIndex(c => c.id === id);
    if (idx === -1) return null;
    const review = getReview(coursesStore[idx]);
    if (review) {
      setReview(idx, {
        ...review,
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      });
    }
    // We DO NOT touch course_status here. course_status=='archived' remains
    // orthogonal to rejection. The course stays in its current DB status.
    coursesStore[idx] = { ...coursesStore[idx], updated_at: new Date().toISOString() };
    return coursesStore[idx];
  },

  approvalStatus(courseId: string): CourseApprovalStatus {
    return getReview(coursesStore.find(c => c.id === courseId) as Course)?.status ?? 'pending';
  },

  approvalReason(courseId: string): string | undefined {
    return getReview(coursesStore.find(c => c.id === courseId) as Course)?.rejection_reason ?? undefined;
  },
};

// ============================================
// API: SYSTEM STATUS (mock health checks)
// ============================================

export interface SystemService {
  name: string;
  version: string;
  status: 'healthy' | 'warning' | 'down';
  uptime_ms: number;
  last_check: string;
}

export const systemApi = {
  async services(): Promise<SystemService[]> {
    await sleep(120);
    return [
      { name: 'API Gateway', version: 'v1.0.0', status: 'healthy', uptime_ms: 99.97, last_check: new Date().toISOString() },
      { name: 'Auth Service', version: 'v1.0.0', status: 'healthy', uptime_ms: 99.95, last_check: new Date().toISOString() },
      { name: 'Content Service', version: 'v1.0.0', status: 'healthy', uptime_ms: 99.92, last_check: new Date().toISOString() },
      { name: 'Exam Service', version: 'v1.0.0', status: 'healthy', uptime_ms: 99.89, last_check: new Date().toISOString() },
      { name: 'AI Suite', version: 'v1.0.0', status: 'warning', uptime_ms: 98.50, last_check: new Date().toISOString() },
      { name: 'Blockchain', version: 'v1.0.0', status: 'healthy', uptime_ms: 99.99, last_check: new Date().toISOString() },
      { name: 'Notification Service', version: 'v1.0.0', status: 'healthy', uptime_ms: 99.88, last_check: new Date().toISOString() },
    ];
  },
};

// ============================================
// API: NOTIFICATIONS (mock recent activity)
// ============================================

export interface RecentActivity {
  id: string;
  type: 'user_registered' | 'course_submitted' | 'course_approved' | 'course_rejected' | 'system_alert';
  title: string;
  description: string;
  created_at: string;
}

export const activityApi = {
  async recent(_limit = 10): Promise<RecentActivity[]> {
    await sleep(120);
    const now = Date.now();
    return [
      { id: 'a-1', type: 'course_submitted', title: 'Khóa học mới chờ duyệt', description: 'Machine Learning Fundamentals — TS. Nguyễn Văn A', created_at: new Date(now - 1000 * 60 * 30).toISOString() },
      { id: 'a-2', type: 'user_registered', title: 'Người dùng mới đăng ký', description: 'Nguyễn Bá Khôi — student', created_at: new Date(now - 1000 * 60 * 60 * 2).toISOString() },
      { id: 'a-3', type: 'course_approved', title: 'Đã duyệt khóa học', description: 'Cloud Computing AWS', created_at: new Date(now - 1000 * 60 * 60 * 24).toISOString() },
      { id: 'a-4', type: 'system_alert', title: 'AI Suite load cao', description: 'Response time tăng 12% trong 10 phút qua', created_at: new Date(now - 1000 * 60 * 60 * 3).toISOString() },
    ];
  },
};

// ============================================
// API: ANALYTICS (mock time-series data)
// ============================================

export interface AnalyticsKpi {
  activeUsers: number;
  newSignups: number;
  courseEnrolls: number;
  examSubmits: number;
  tokensIssued: number;
  avgSession: number;
}

export interface AnalyticsPoint {
  date: string;
  value: number;
}

export interface AnalyticsTopCourse {
  id: string;
  title: string;
  enrollments: number;
  completion: number;
  rating: number;
}

export const analyticsApi = {
  async kpi(): Promise<AnalyticsKpi> {
    await sleep(150);
    return {
      activeUsers: 12847,
      newSignups: 312,
      courseEnrolls: 1820,
      examSubmits: 4290,
      tokensIssued: 18420,
      avgSession: 24.6,
    };
  },

  async userGrowth(range: '7d' | '30d' | '90d' | 'ytd' = '30d'): Promise<AnalyticsPoint[]> {
    await sleep(120);
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 240;
    return generateSeries(days, 80, 320);
  },

  async enrollments(range: '7d' | '30d' | '90d' | 'ytd' = '30d'): Promise<AnalyticsPoint[]> {
    await sleep(120);
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 240;
    return generateSeries(days, 40, 180);
  },

  async examCompletion(range: '7d' | '30d' | '90d' | 'ytd' = '30d'): Promise<AnalyticsPoint[]> {
    await sleep(120);
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 240;
    return generateSeries(days, 60, 95);
  },

  async passRate(): Promise<AnalyticsPoint[]> {
    await sleep(120);
    return generateSeries(12, 60, 85);
  },

  async topCourses(): Promise<AnalyticsTopCourse[]> {
    await sleep(120);
    return [
      { id: 'c-001', title: 'Machine Learning Fundamentals', enrollments: 1840, completion: 78, rating: 4.8 },
      { id: 'c-002', title: 'Cloud Computing AWS', enrollments: 1620, completion: 82, rating: 4.7 },
      { id: 'c-003', title: 'React & TypeScript Pro', enrollments: 1480, completion: 71, rating: 4.9 },
      { id: 'c-004', title: 'Cybersecurity Essentials', enrollments: 1290, completion: 65, rating: 4.6 },
      { id: 'c-005', title: 'Data Structures & Algorithms', enrollments: 1100, completion: 73, rating: 4.7 },
    ];
  },

  async roleDistribution(): Promise<Array<{ role: string; count: number; color: string }>> {
    await sleep(120);
    return [
      { role: 'student', count: 8420, color: '#3b82f6' },
      { role: 'instructor', count: 412, color: '#f59e0b' },
      { role: 'admin', count: 32, color: '#06b6d4' },
      { role: 'super_admin', count: 6, color: '#a855f7' },
      { role: 'guest', count: 1820, color: '#94a3b8' },
    ];
  },
};

function generateSeries(days: number, min: number, max: number): AnalyticsPoint[] {
  const out: AnalyticsPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const v = min + Math.round(((Math.sin(i * 0.7) + 1) / 2) * (max - min) * (0.6 + Math.random() * 0.4));
    out.push({
      date: d.toISOString().slice(0, 10),
      value: Math.max(min, Math.min(max, v)),
    });
  }
  return out;
}

// ============================================
// API: EXAMS (admin oversight)
// ============================================

export type ExamStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface ExamItem {
  id: string;
  title: string;
  course: string;
  instructor: string;
  status: ExamStatus;
  duration_min: number;
  participants: number;
  avg_score: number;
  flagged: number;
  starts_at: string;
}

export interface ExamStats {
  total: number;
  active: number;
  completed: number;
  avgScore: number;
  passRate: number;
  flagged: number;
}

export const examApi = {
  async list(): Promise<ExamItem[]> {
    await sleep(120);
    const now = new Date();
    const iso = (offsetDays: number) =>
      new Date(now.getTime() + offsetDays * 86400000).toISOString();
    return [
      { id: 'e-001', title: 'Mid-term: Machine Learning', course: 'ML Fundamentals', instructor: 'TS. Nguyễn Văn A', status: 'active', duration_min: 90, participants: 184, avg_score: 7.6, flagged: 3, starts_at: iso(-1) },
      { id: 'e-002', title: 'AWS Cloud Practitioner', course: 'Cloud Computing AWS', instructor: 'ThS. Trần Thị B', status: 'scheduled', duration_min: 120, participants: 162, avg_score: 0, flagged: 0, starts_at: iso(2) },
      { id: 'e-003', title: 'React Hooks Final', course: 'React & TypeScript Pro', instructor: 'TS. Lê Văn C', status: 'completed', duration_min: 60, participants: 220, avg_score: 8.2, flagged: 1, starts_at: iso(-5) },
      { id: 'e-004', title: 'Cybersecurity Quiz 3', course: 'Cybersecurity Essentials', instructor: 'TS. Phạm Thị D', status: 'active', duration_min: 30, participants: 89, avg_score: 6.4, flagged: 5, starts_at: iso(0) },
      { id: 'e-005', title: 'DSA Final Exam', course: 'Data Structures & Algorithms', instructor: 'PGS. Hoàng Văn E', status: 'scheduled', duration_min: 180, participants: 312, avg_score: 0, flagged: 0, starts_at: iso(7) },
      { id: 'e-006', title: 'Database Normalization', course: 'Database Systems', instructor: 'TS. Vũ Thị F', status: 'draft', duration_min: 45, participants: 0, avg_score: 0, flagged: 0, starts_at: iso(14) },
      { id: 'e-007', title: 'Mid-term: Networking', course: 'Computer Networks', instructor: 'TS. Đặng Văn G', status: 'completed', duration_min: 75, participants: 156, avg_score: 7.1, flagged: 0, starts_at: iso(-10) },
      { id: 'e-008', title: 'AI Ethics — Pop quiz', course: 'AI Ethics', instructor: 'TS. Bùi Thị H', status: 'cancelled', duration_min: 20, participants: 0, avg_score: 0, flagged: 0, starts_at: iso(-2) },
    ];
  },
  async stats(): Promise<ExamStats> {
    await sleep(120);
    return { total: 248, active: 12, completed: 196, avgScore: 7.4, passRate: 78.5, flagged: 23 };
  },
};

// ============================================
// API: BLOCKCHAIN (token + transactions)
// ============================================

export interface TokenStats {
  totalSupply: number;
  circulating: number;
  minted: number;
  burned: number;
  holders: number;
  tx24h: number;
}

export interface TokenContract {
  address: string;
  network: string;
  deploy_block: number;
  version: string;
  verified: boolean;
}

export interface TxRecord {
  id: string;
  tx_hash: string;
  type: 'mint' | 'burn' | 'transfer' | 'reward';
  from: string;
  to: string;
  amount: number;
  status: 'confirmed' | 'pending' | 'failed';
  created_at: string;
}

export interface RewardWeekPoint {
  day: string;
  value: number;
}

export const blockchainApi = {
  async tokenStats(): Promise<TokenStats> {
    await sleep(120);
    return { totalSupply: 10_000_000, circulating: 6_842_310, minted: 248_120, burned: 12_540, holders: 8420, tx24h: 1284 };
  },
  async contract(): Promise<TokenContract> {
    await sleep(80);
    return {
      address: '0x9aBcDeF0123456789aBcDeF0123456789aBcDeF01',
      network: 'Polygon Amoy Testnet',
      deploy_block: 5_241_812,
      version: 'v1.2.0',
      verified: true,
    };
  },
  async transactions(): Promise<TxRecord[]> {
    await sleep(120);
    const now = Date.now();
    const mk = (i: number, offsetMin: number, type: TxRecord['type'], amount: number, status: TxRecord['status'] = 'confirmed'): TxRecord => ({
      id: `tx-${i}`,
      tx_hash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
      type,
      from: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
      to: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
      amount,
      status,
      created_at: new Date(now - offsetMin * 60000).toISOString(),
    });
    return [
      mk(1, 5, 'reward', 50),
      mk(2, 12, 'mint', 1000),
      mk(3, 18, 'transfer', 25),
      mk(4, 23, 'reward', 80),
      mk(5, 41, 'burn', 15),
      mk(6, 67, 'reward', 60, 'pending'),
      mk(7, 95, 'transfer', 200),
      mk(8, 142, 'reward', 45),
      mk(9, 188, 'mint', 5000),
      mk(10, 245, 'transfer', 30, 'failed'),
    ];
  },
  async weeklyRewards(): Promise<RewardWeekPoint[]> {
    await sleep(80);
    return [
      { day: 'Mon', value: 1240 },
      { day: 'Tue', value: 1820 },
      { day: 'Wed', value: 980 },
      { day: 'Thu', value: 2410 },
      { day: 'Fri', value: 3120 },
      { day: 'Sat', value: 1680 },
      { day: 'Sun', value: 2240 },
    ];
  },
};

// ============================================
// API: SECURITY (events + audit)
// ============================================

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type EventType = 'login_failed' | 'brute_force' | 'suspicious_ip' | 'mfa_disabled' | 'permission_escalation' | 'data_export' | 'rate_limit';

export interface SecurityEvent {
  id: string;
  severity: Severity;
  type: EventType;
  source_ip: string;
  user: string;
  description: string;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  actor_role: 'admin' | 'super_admin' | 'instructor' | 'student' | 'system';
  actor_avatar?: string | null;
  type: 'create' | 'update' | 'delete' | 'auth' | 'login' | 'error';
  action: string;
  target: string;
  changes?: string;
  ip: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
}

export interface SecurityStats {
  threats: number;
  blockedIPs: number;
  failedLogins: number;
  activeSessions: number;
}

export const securityApi = {
  async stats(): Promise<SecurityStats> {
    await sleep(120);
    return { threats: 17, blockedIPs: 142, failedLogins: 38, activeSessions: 284 };
  },
  async events(): Promise<SecurityEvent[]> {
    await sleep(120);
    const now = Date.now();
    const mk = (i: number, min: number, sev: Severity, type: EventType, ip: string, user: string, desc: string): SecurityEvent => ({
      id: `sec-${i}`,
      severity: sev,
      type,
      source_ip: ip,
      user,
      description: desc,
      created_at: new Date(now - min * 60000).toISOString(),
    });
    return [
      mk(1, 4, 'critical', 'brute_force', '203.0.113.42', 'unknown', '50+ failed logins from same IP within 2 min'),
      mk(2, 12, 'high', 'login_failed', '198.51.100.7', 'admin@ioes.vn', 'Failed admin login after 3 attempts'),
      mk(3, 25, 'high', 'suspicious_ip', '45.142.122.18', 'guest_user', 'Login from blacklisted country'),
      mk(4, 48, 'medium', 'rate_limit', '192.0.2.99', 'student_42', 'Exceeded 200 req/min on /api/exams'),
      mk(5, 75, 'medium', 'mfa_disabled', '10.0.0.15', 'instructor_b', 'MFA disabled for user instructor_b'),
      mk(6, 130, 'low', 'permission_escalation', '10.0.0.4', 'student_91', 'Attempt to access admin endpoint /admin/users'),
      mk(7, 210, 'info', 'data_export', '10.0.0.7', 'admin@ioes.vn', 'Exported users.csv (1284 rows)'),
      mk(8, 320, 'low', 'login_failed', '192.168.1.50', 'unknown', 'Single failed login'),
    ];
  },
  async auditLog(): Promise<AuditEntry[]> {
    await sleep(120);
    const now = Date.now();
    const mk = (
      i: number,
      min: number,
      actor: string,
      actor_role: AuditEntry['actor_role'],
      type: AuditEntry['type'],
      action: string,
      target: string,
      ip: string,
      severity: AuditEntry['severity'],
      changes?: string,
      avatar?: string,
    ): AuditEntry => ({
      id: `aud-${i}`,
      actor,
      actor_role,
      actor_avatar: avatar ?? null,
      type,
      action,
      target,
      changes,
      ip,
      severity,
      created_at: new Date(now - min * 60000).toISOString(),
    });
    return [
      mk(1, 2, 'admin@ioes.vn', 'admin', 'delete', 'user.delete', 'student_847 (deleted@fpt.edu.vn)', '10.0.0.7', 'critical', 'user_id: 1234, email: deleted@fpt.edu.vn', 'https://i.pravatar.cc/100?img=1'),
      mk(2, 7, 'unknown@hack.com', 'system', 'auth', 'auth.failed', 'Login Attempt', '45.33.32.156', 'high', 'reason: invalid password (3rd attempt)'),
      mk(3, 14, 'a.nv@fpt.edu.vn', 'instructor', 'create', 'course.create', 'Course CS201 - Advanced ML', '10.0.0.45', 'low', 'course_id: CS201, title: Advanced ML', 'https://i.pravatar.cc/100?img=5'),
      mk(4, 22, 'student@fpt.edu.vn', 'student', 'login', 'auth.login', 'Session (Google OAuth)', '192.168.1.89', 'low', 'method: Google OAuth, browser: Chrome', 'https://i.pravatar.cc/100?img=3'),
      mk(5, 31, 'system', 'system', 'error', 'db.timeout', 'Database (nightly backup)', 'localhost', 'critical', 'connection timeout, retry: 3'),
      mk(6, 47, 'b.nv@fpt.edu.vn', 'admin', 'update', 'settings.update', 'Settings (session_timeout)', '192.168.1.100', 'medium', 'session_timeout: 30 → 60 min', 'https://i.pravatar.cc/100?img=8'),
      mk(7, 64, 'admin@ioes.vn', 'admin', 'create', 'user.create', 'student_899 (new@fpt.edu.vn)', '10.0.0.7', 'low', 'role: student, dept: CS', 'https://i.pravatar.cc/100?img=1'),
      mk(8, 88, 'super@ioes.vn', 'super_admin', 'update', 'role.update', 'instructor_b → admin', '10.0.0.1', 'high', 'role: instructor → admin, scope: global', 'https://i.pravatar.cc/100?img=2'),
      mk(9, 112, 'c.nv@fpt.edu.vn', 'instructor', 'update', 'course.update', 'Course CS101 - Intro to AI', '10.0.0.46', 'medium', 'price: 0 → 199000', 'https://i.pravatar.cc/100?img=6'),
      mk(10, 145, 'student2@fpt.edu.vn', 'student', 'login', 'auth.login', 'Session (Email/Password)', '192.168.1.77', 'low', 'method: password, 2FA: enabled', 'https://i.pravatar.cc/100?img=4'),
      mk(11, 178, 'admin@ioes.vn', 'admin', 'delete', 'exam.delete', 'Exam E-021 (Pop Quiz)', '10.0.0.7', 'critical', 'exam_id: E-021, reason: duplicate', 'https://i.pravatar.cc/100?img=1'),
      mk(12, 210, 'system', 'system', 'error', 'api.500', 'External API (payment-gateway)', 'localhost', 'high', 'error: upstream 500, retry: 2'),
      mk(13, 245, 'd.nv@fpt.edu.vn', 'admin', 'update', 'user.suspend', 'student_91 (suspicious activity)', '192.168.1.105', 'high', 'status: active → suspended, reason: abnormal_login', 'https://i.pravatar.cc/100?img=10'),
      mk(14, 280, 'unknown@bot.com', 'system', 'auth', 'auth.failed', 'Login Attempt', '185.220.101.45', 'critical', 'reason: account not found, IP blocked after'),
    ];
  },
};

// ============================================
// API: NOTIFICATIONS (admin)
// ============================================

export type NotifCategory = 'system' | 'user' | 'course' | 'exam';
export type NotifChannel = 'inApp' | 'email' | 'push';

export interface AdminNotification {
  id: string;
  category: NotifCategory;
  channel: NotifChannel;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  audience: string;
}

export interface NotifTemplate {
  id: string;
  name: string;
  trigger: string;
  channel: NotifChannel;
  active: boolean;
}

export interface NotifStats {
  sent24h: number;
  unread: number;
  templates: number;
  subscribers: number;
}

export const notificationsApi = {
  async stats(): Promise<NotifStats> {
    await sleep(120);
    return { sent24h: 4218, unread: 17, templates: 24, subscribers: 10_690 };
  },
  async inbox(): Promise<AdminNotification[]> {
    await sleep(120);
    const now = Date.now();
    const mk = (i: number, min: number, category: NotifCategory, title: string, body: string, read: boolean): AdminNotification => ({
      id: `n-${i}`,
      category,
      channel: 'inApp',
      title,
      body,
      read,
      created_at: new Date(now - min * 60000).toISOString(),
      audience: 'Admin team',
    });
    return [
      mk(1, 2, 'exam', '12 bài thi đang diễn ra', 'Có 12 bài thi đang active trong hệ thống. 3 bài thi có dấu hiệu gian lận.', false),
      mk(2, 15, 'system', 'AI Suite load cao', 'Response time tăng 12% trong 10 phút qua. Đã tự động scale.', false),
      mk(3, 45, 'user', 'User mới đăng ký: Nguyễn Bá Khôi', 'Student mới cần phê duyệt thủ công.', false),
      mk(4, 78, 'course', 'Khóa học mới chờ duyệt', 'TS. Nguyễn Văn A vừa gửi khóa "Machine Learning Fundamentals" để duyệt.', false),
      mk(5, 180, 'system', 'Backup hoàn tất', 'Sao lưu nightly-backup-2026-08-22 đã chạy thành công.', true),
      mk(6, 240, 'exam', 'Bài thi e-008 đã bị hủy', 'TS. Bùi Thị H đã hủy bài thi AI Ethics Pop quiz do vi phạm nội quy.', true),
      mk(7, 360, 'user', '342 user đăng ký trong tuần', 'Tăng 18% so với tuần trước. 8% đến từ FPT University.', true),
      mk(8, 720, 'system', 'Cập nhật hệ thống v2.4.1', 'Patch bảo mật cho exam-service và content-service. Không downtime.', true),
    ];
  },
  async templates(): Promise<NotifTemplate[]> {
    await sleep(80);
    return [
      { id: 't-1', name: 'Welcome new user', trigger: 'user.registered', channel: 'email', active: true },
      { id: 't-2', name: 'Course approved', trigger: 'course.approved', channel: 'inApp', active: true },
      { id: 't-3', name: 'Exam graded', trigger: 'exam.graded', channel: 'push', active: true },
      { id: 't-4', name: 'Course pending', trigger: 'course.submitted', channel: 'inApp', active: true },
      { id: 't-5', name: 'Payment failed', trigger: 'payment.failed', channel: 'email', active: false },
      { id: 't-6', name: 'Token reward', trigger: 'token.minted', channel: 'push', active: true },
    ];
  },
};

// ============================================
// API: INSTRUCTOR (mock data for instructor pages)
// ============================================

export interface InstructorDashboardStats {
  courses: number;
  students: number;
  exams: number;
  rating: number;
  monthly_growth: {
    courses: number;
    students: number;
    exams: number;
    rating: number;
  };
}

export interface InstructorCourseRow {
  id: string;
  title: string;
  category: string;
  lessons_count: number;
  enrollments: number;
  progress: number;
  updated_at: string;
  status: 'draft' | 'published' | 'archived';
}

export interface InstructorExamRow {
  id: string;
  title: string;
  course: string;
  participants: number;
  pending_grading: number;
  expires_at: string | null;
  status: 'active' | 'scheduled' | 'completed' | 'draft';
}

export interface InstructorTopStudent {
  rank: number;
  id: string;
  full_name: string;
  course: string;
  score: number;
}

export interface InstructorActivityRow {
  id: string;
  type: 'enrollment' | 'submission' | 'graded' | 'review';
  message: string;
  created_at: string;
}

export interface GradingSession {
  id: string;
  student_name: string;
  student_avatar: string | null;
  exam_title: string;
  started_at: string;
  attention_score: number;
  violations: number;
  status: 'clean' | 'warning' | 'flagged';
}

export const instructorApi = {
  async dashboardStats(): Promise<InstructorDashboardStats> {
    await sleep(120);
    return {
      courses: 8,
      students: 1247,
      exams: 24,
      rating: 4.8,
      monthly_growth: { courses: 2, students: 156, exams: 5, rating: 0.2 },
    };
  },

  async myCourses(): Promise<InstructorCourseRow[]> {
    await sleep(140);
    const now = Date.now();
    const ago = (days: number) => new Date(now - days * 86400000).toISOString();
    return [
      { id: 'c-001', title: 'Lập trình Web với React.js — Từ cơ bản đến nâng cao', category: 'Web Dev', lessons_count: 24, enrollments: 456, progress: 68, updated_at: ago(2), status: 'published' },
      { id: 'c-002', title: 'UI/UX Design Fundamentals', category: 'Design', lessons_count: 18, enrollments: 312, progress: 45, updated_at: ago(7), status: 'published' },
      { id: 'c-003', title: 'Mobile App Development với Flutter', category: 'Mobile', lessons_count: 32, enrollments: 198, progress: 22, updated_at: ago(21), status: 'draft' },
      { id: 'c-004', title: 'Data Structures & Algorithms', category: 'Computer Science', lessons_count: 28, enrollments: 0, progress: 0, updated_at: ago(1), status: 'draft' },
      { id: 'c-005', title: 'Cloud Computing với AWS', category: 'Cloud', lessons_count: 22, enrollments: 281, progress: 58, updated_at: ago(5), status: 'published' },
    ];
  },

  async upcomingExams(): Promise<InstructorExamRow[]> {
    await sleep(120);
    const now = Date.now();
    const iso = (daysFromNow: number) => new Date(now + daysFromNow * 86400000).toISOString();
    return [
      { id: 'e-101', title: 'Toán Cao Cấp — Kiểm tra giữa kỳ', course: 'Toán Cao Cấp', participants: 56, pending_grading: 0, expires_at: iso(3), status: 'active' },
      { id: 'e-102', title: 'React.js — Kiểm tra tuần 5', course: 'React.js', participants: 32, pending_grading: 12, expires_at: null, status: 'completed' },
      { id: 'e-103', title: 'UI/UX Design — Final Project', course: 'UI/UX Design', participants: 28, pending_grading: 28, expires_at: null, status: 'completed' },
    ];
  },

  async topStudents(): Promise<InstructorTopStudent[]> {
    await sleep(100);
    return [
      { rank: 1, id: 's-001', full_name: 'Nguyễn Anh Tuấn', course: 'React.js', score: 95 },
      { rank: 2, id: 's-002', full_name: 'Trần Hương Giang', course: 'UI/UX', score: 92 },
      { rank: 3, id: 's-003', full_name: 'Lê Minh Đức', course: 'React.js', score: 89 },
      { rank: 4, id: 's-004', full_name: 'Phạm Ngọc Ánh', course: 'Flutter', score: 87 },
      { rank: 5, id: 's-005', full_name: 'Vũ Hoàng Nam', course: 'React.js', score: 85 },
    ];
  },

  async activity(): Promise<InstructorActivityRow[]> {
    await sleep(100);
    const now = Date.now();
    const ago = (min: number) => new Date(now - min * 60000).toISOString();
    return [
      { id: 'ia-1', type: 'enrollment', message: 'Nguyễn Văn A đã đăng ký khóa học React.js', created_at: ago(5) },
      { id: 'ia-2', type: 'submission', message: 'Trần Thị C đã nộp bài thi Toán CK1', created_at: ago(15) },
      { id: 'ia-3', type: 'graded', message: 'Bạn đã chấm điểm 8 bài thi React Week 4', created_at: ago(60) },
      { id: 'ia-4', type: 'review', message: 'Lê Hoàng Y đã đánh giá 5 sao cho UI/UX Design', created_at: ago(180) },
    ];
  },

  async gradingSessions(): Promise<GradingSession[]> {
    await sleep(120);
    const now = Date.now();
    const ago = (min: number) => new Date(now - min * 60000).toISOString();
    return [
      { id: 'g-001', student_name: 'Nguyễn Văn An', student_avatar: 'https://i.pravatar.cc/100?img=12', exam_title: 'JavaScript Fundamentals', started_at: ago(45), attention_score: 92, violations: 0, status: 'clean' },
      { id: 'g-002', student_name: 'Trần Thị Bình', student_avatar: 'https://i.pravatar.cc/100?img=23', exam_title: 'React Mid-term', started_at: ago(38), attention_score: 68, violations: 2, status: 'warning' },
      { id: 'g-003', student_name: 'Lê Minh Cường', student_avatar: 'https://i.pravatar.cc/100?img=33', exam_title: 'TypeScript Final', started_at: ago(28), attention_score: 31, violations: 5, status: 'flagged' },
      { id: 'g-004', student_name: 'Phạm Hồng Dương', student_avatar: 'https://i.pravatar.cc/100?img=44', exam_title: 'Algorithms Quiz', started_at: ago(20), attention_score: 88, violations: 0, status: 'clean' },
      { id: 'g-005', student_name: 'Hoàng Thị E', student_avatar: 'https://i.pravatar.cc/100?img=49', exam_title: 'CSS Advanced', started_at: ago(15), attention_score: 75, violations: 1, status: 'warning' },
    ];
  },

  async gradingStats(): Promise<{ total: number; clean: number; warning: number; flagged: number; avgAttention: number }> {
    await sleep(100);
    return { total: 248, clean: 196, warning: 38, flagged: 14, avgAttention: 82 };
  },

  async students(): Promise<Array<{
    id: string; full_name: string; email: string; avatar: string | null;
    courses_enrolled: number; lessons_completed: number; avg_score: number;
    last_active: string; status: 'active' | 'at_risk' | 'inactive';
  }>> {
    await sleep(120);
    const now = Date.now();
    const ago = (min: number) => new Date(now - min * 60000).toISOString();
    return [
      { id: 's-001', full_name: 'Nguyễn Anh Tuấn', email: 'tuan.na@fpt.edu.vn', avatar: 'https://i.pravatar.cc/100?img=12', courses_enrolled: 3, lessons_completed: 18, avg_score: 92, last_active: ago(15), status: 'active' },
      { id: 's-002', full_name: 'Trần Hương Giang', email: 'giang.th@fpt.edu.vn', avatar: 'https://i.pravatar.cc/100?img=23', courses_enrolled: 2, lessons_completed: 14, avg_score: 88, last_active: ago(45), status: 'active' },
      { id: 's-003', full_name: 'Lê Minh Đức', email: 'duc.lm@fpt.edu.vn', avatar: 'https://i.pravatar.cc/100?img=33', courses_enrolled: 4, lessons_completed: 22, avg_score: 76, last_active: ago(180), status: 'active' },
      { id: 's-004', full_name: 'Phạm Ngọc Ánh', email: 'anh.pn@fpt.edu.vn', avatar: null, courses_enrolled: 1, lessons_completed: 8, avg_score: 65, last_active: ago(720), status: 'at_risk' },
      { id: 's-005', full_name: 'Vũ Hoàng Nam', email: 'nam.vh@fpt.edu.vn', avatar: 'https://i.pravatar.cc/100?img=49', courses_enrolled: 3, lessons_completed: 16, avg_score: 81, last_active: ago(240), status: 'active' },
      { id: 's-006', full_name: 'Hoàng Thị Mai', email: 'mai.ht@fpt.edu.vn', avatar: 'https://i.pravatar.cc/100?img=45', courses_enrolled: 2, lessons_completed: 4, avg_score: 52, last_active: ago(4320), status: 'at_risk' },
      { id: 's-007', full_name: 'Đỗ Quang Vinh', email: 'vinh.dq@fpt.edu.vn', avatar: 'https://i.pravatar.cc/100?img=51', courses_enrolled: 3, lessons_completed: 19, avg_score: 84, last_active: ago(90), status: 'active' },
      { id: 's-008', full_name: 'Bùi Hà Linh', email: 'linh.bh@fpt.edu.vn', avatar: 'https://i.pravatar.cc/100?img=16', courses_enrolled: 1, lessons_completed: 0, avg_score: 0, last_active: ago(10080), status: 'inactive' },
      { id: 's-009', full_name: 'Ngô Minh Tuấn', email: 'tuan.nm@fpt.edu.vn', avatar: 'https://i.pravatar.cc/100?img=53', courses_enrolled: 2, lessons_completed: 12, avg_score: 73, last_active: ago(360), status: 'active' },
      { id: 's-010', full_name: 'Phan Thanh Thảo', email: 'thao.pt@fpt.edu.vn', avatar: null, courses_enrolled: 3, lessons_completed: 15, avg_score: 79, last_active: ago(600), status: 'active' },
    ];
  },

  async reportSummary(range: '7d' | '30d' | '90d' | 'ytd'): Promise<{
    enrollments: number; completion: number; revenue: number; avgWatch: number;
    breakdown: Array<{ label: string; current: number; previous: number }>;
  }> {
    await sleep(120);
    const mult = range === '7d' ? 1 : range === '30d' ? 4 : range === '90d' ? 12 : 18;
    return {
      enrollments: 156 * mult,
      completion: 84,
      revenue: 12_400_000 * mult,
      avgWatch: 42,
      breakdown: [
        { label: 'New Enrollments', current: 156 * mult, previous: 128 * mult },
        { label: 'Course Completions', current: 89 * mult, previous: 76 * mult },
        { label: 'Avg. Watch Time (min)', current: 42, previous: 38 },
        { label: 'Tokens Earned', current: 1_456, previous: 1_120 },
        { label: 'Active Students', current: 1_247, previous: 1_091 },
      ],
    };
  },

  async reportData(_tab: 'enrollment' | 'completion' | 'revenue' | 'engagement', range: '7d' | '30d' | '90d' | 'ytd'): Promise<Array<{ label: string; value: number }>> {
    await sleep(100);
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 12;
    const isYear = range === 'ytd';
    const out: Array<{ label: string; value: number }> = [];
    for (let i = 0; i < (isYear ? 12 : days); i++) {
      const base = Math.sin((i / (isYear ? 12 : days)) * Math.PI * 2) * 30 + 60;
      const noise = Math.cos(i * 1.7) * 12;
      out.push({
        label: isYear ? `T${i + 1}` : `D${i + 1}`,
        value: Math.max(10, Math.round(base + noise)),
      });
    }
    return out;
  },
};

// ============================================
// API: STUDENT (mock data for student pages)
// ============================================

export interface StudentDashboardStats {
  enrolledCourses: number;
  inProgress: number;
  completed: number;
  certificates: number;
  studyHours: number;
  weeklyHours: { day: string; value: number }[];
}

export interface StudentEnrolledCourse {
  id: string;
  title: string;
  instructor: string;
  thumbnail_color: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan';
  category: string;
  lessons_total: number;
  lessons_done: number;
  progress: number;
  next_lesson: string;
  last_accessed: string;
  rating: number;
  duration_hours: number;
  status: 'in_progress' | 'completed' | 'not_started';
}

export interface StudentExam {
  id: string;
  title: string;
  course: string;
  type: 'midterm' | 'final' | 'quiz' | 'practice';
  duration_min: number;
  questions: number;
  status: 'upcoming' | 'available' | 'in_progress' | 'completed' | 'missed';
  scheduled_at: string | null;
  attempts: number;
  max_attempts: number;
  best_score: number | null;
  due_in: string | null;
}

export interface StudentExamResult {
  exam_id: string;
  exam_title: string;
  course: string;
  submitted_at: string;
  score: number;
  max_score: number;
  passed: boolean;
  time_used_min: number;
  duration_min: number;
  rank: number;
  total_participants: number;
  breakdown: { section: string; score: number; max: number }[];
  feedback: string;
}

export interface StudentCertificate {
  id: string;
  title: string;
  course: string;
  instructor: string;
  issued_at: string;
  serial: string;
  grade: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  full_name: string;
  avatar: string | null;
  points: number;
  courses_completed: number;
  streak_days: number;
  badge: 'gold' | 'silver' | 'bronze' | null;
}

export interface StudentNotification {
  id: string;
  type: 'course' | 'exam' | 'achievement' | 'system' | 'message';
  title: string;
  body: string;
  created_at: string;
  read: boolean;
  action_url?: string;
}

export interface StudentMessage {
  id: string;
  from_name: string;
  from_avatar: string | null;
  preview: string;
  last_message_at: string;
  unread: number;
  is_online: boolean;
}

export interface StudentLearningPath {
  id: string;
  title: string;
  description: string;
  steps: { id: string; title: string; type: 'course' | 'exam' | 'project'; status: 'done' | 'current' | 'locked'; estimated_hours: number }[];
  progress: number;
}

export interface StudentCourseDetail {
  id: string;
  title: string;
  instructor: string;
  instructor_avatar: string | null;
  category: string;
  rating: number;
  reviews_count: number;
  enrolled_count: number;
  lessons_count: number;
  duration_hours: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  last_updated: string;
  short_description: string;
  description: string;
  what_you_learn: string[];
  requirements: string[];
  curriculum: { section: string; lessons: { title: string; duration_min: number; preview?: boolean }[] }[];
}

export interface StudentCourseLesson {
  id: string;
  title: string;
  type: 'video' | 'reading' | 'quiz' | 'project';
  duration_min: number;
  completed: boolean;
  video_url?: string;
  content?: string;
}

export interface DiscussionPost {
  id: string;
  author_name: string;
  author_avatar: string | null;
  is_instructor: boolean;
  posted_at: string;
  content: string;
  likes: number;
  replies: number;
}

export interface StudentCourseReview {
  id: string;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  posted_at: string;
  content: string;
  helpful: number;
}

export interface StudentPracticeQuestion {
  id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface StudentSearchResult {
  id: string;
  type: 'course' | 'lesson' | 'instructor' | 'exam';
  title: string;
  subtitle: string;
  meta?: string;
}

export interface StudentEnrollment {
  course_id: string;
  enrolled_at: string;
  expires_at: string | null;
  payment_method: 'free' | 'voucher' | 'token';
  status: 'active' | 'pending' | 'expired';
}

export const studentApi = {
  async dashboardStats(): Promise<StudentDashboardStats> {
    await sleep(120);
    return {
      enrolledCourses: 8,
      inProgress: 5,
      completed: 3,
      certificates: 3,
      studyHours: 142,
      weeklyHours: [
        { day: 'Mon', value: 3.5 },
        { day: 'Tue', value: 4.2 },
        { day: 'Wed', value: 2.8 },
        { day: 'Thu', value: 5.1 },
        { day: 'Fri', value: 4.6 },
        { day: 'Sat', value: 6.2 },
        { day: 'Sun', value: 3.4 },
      ],
    };
  },

  async myCourses(): Promise<StudentEnrolledCourse[]> {
    await sleep(140);
    const ago = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString();
    return [
      { id: 'sc-001', title: 'Lập trình Web với React.js', instructor: 'TS. Nguyễn Văn A', thumbnail_color: 'blue', category: 'Web Dev', lessons_total: 24, lessons_done: 18, progress: 75, next_lesson: 'Hooks nâng cao', last_accessed: ago(2), rating: 4.8, duration_hours: 32, status: 'in_progress' },
      { id: 'sc-002', title: 'Machine Learning Fundamentals', instructor: 'TS. Nguyễn Văn A', thumbnail_color: 'purple', category: 'AI/ML', lessons_total: 28, lessons_done: 28, progress: 100, next_lesson: '', last_accessed: ago(48), rating: 4.9, duration_hours: 36, status: 'completed' },
      { id: 'sc-003', title: 'UI/UX Design Fundamentals', instructor: 'Trần Thị Hương', thumbnail_color: 'rose', category: 'Design', lessons_total: 18, lessons_done: 8, progress: 44, next_lesson: 'Color Theory', last_accessed: ago(24), rating: 4.7, duration_hours: 22, status: 'in_progress' },
      { id: 'sc-004', title: 'Cloud Computing với AWS', instructor: 'TS. Nguyễn Văn A', thumbnail_color: 'amber', category: 'Cloud', lessons_total: 22, lessons_done: 14, progress: 64, next_lesson: 'EC2 & Load Balancer', last_accessed: ago(8), rating: 4.8, duration_hours: 28, status: 'in_progress' },
      { id: 'sc-005', title: 'Data Structures & Algorithms', instructor: 'Phạm Văn Quang', thumbnail_color: 'emerald', category: 'CS', lessons_total: 30, lessons_done: 4, progress: 13, next_lesson: 'Linked List', last_accessed: ago(72), rating: 4.6, duration_hours: 40, status: 'in_progress' },
      { id: 'sc-006', title: 'Cybersecurity Basics', instructor: 'Phạm Văn Quang', thumbnail_color: 'cyan', category: 'Security', lessons_total: 20, lessons_done: 0, progress: 0, next_lesson: 'OWASP Top 10', last_accessed: ago(168), rating: 4.5, duration_hours: 24, status: 'not_started' },
      { id: 'sc-007', title: 'Database Systems', instructor: 'Lê Minh Hằng', thumbnail_color: 'blue', category: 'Database', lessons_total: 26, lessons_done: 26, progress: 100, next_lesson: '', last_accessed: ago(336), rating: 4.7, duration_hours: 30, status: 'completed' },
      { id: 'sc-008', title: 'Modern Web Development', instructor: 'Trần Thị Hương', thumbnail_color: 'purple', category: 'Web Dev', lessons_total: 32, lessons_done: 32, progress: 100, next_lesson: '', last_accessed: ago(720), rating: 4.9, duration_hours: 38, status: 'completed' },
    ];
  },

  async upcomingExams(): Promise<StudentExam[]> {
    await sleep(120);
    const now = Date.now();
    const iso = (offsetHours: number) => new Date(now + offsetHours * 3600000).toISOString();
    const ago = (hours: number) => new Date(now - hours * 3600000).toISOString();
    return [
      { id: 'se-001', title: 'React.js — Kiểm tra giữa kỳ', course: 'Lập trình Web với React.js', type: 'midterm', duration_min: 90, questions: 40, status: 'available', scheduled_at: null, attempts: 0, max_attempts: 1, best_score: null, due_in: 'Còn 2 ngày' },
      { id: 'se-002', title: 'AWS — Pop Quiz 3', course: 'Cloud Computing với AWS', type: 'quiz', duration_min: 20, questions: 15, status: 'upcoming', scheduled_at: iso(26), attempts: 0, max_attempts: 3, best_score: null, due_in: 'Còn 26 giờ' },
      { id: 'se-003', title: 'UI/UX Final Project', course: 'UI/UX Design Fundamentals', type: 'final', duration_min: 180, questions: 5, status: 'in_progress', scheduled_at: ago(1), attempts: 1, max_attempts: 1, best_score: null, due_in: 'Còn 1 giờ 24 phút' },
      { id: 'se-004', title: 'ML Mid-term — Practice', course: 'Machine Learning Fundamentals', type: 'practice', duration_min: 60, questions: 30, status: 'completed', scheduled_at: ago(72), attempts: 2, max_attempts: 5, best_score: 88, due_in: null },
      { id: 'se-005', title: 'DSA Weekly Quiz', course: 'Data Structures & Algorithms', type: 'quiz', duration_min: 30, questions: 20, status: 'completed', scheduled_at: ago(168), attempts: 1, max_attempts: 3, best_score: 92, due_in: null },
      { id: 'se-006', title: 'Database Final', course: 'Database Systems', type: 'final', duration_min: 120, questions: 50, status: 'completed', scheduled_at: ago(720), attempts: 1, max_attempts: 1, best_score: 94, due_in: null },
      { id: 'se-007', title: 'OWASP Quiz', course: 'Cybersecurity Basics', type: 'quiz', duration_min: 15, questions: 10, status: 'missed', scheduled_at: ago(96), attempts: 0, max_attempts: 1, best_score: null, due_in: null },
    ];
  },

  async recentResults(): Promise<StudentExamResult[]> {
    await sleep(100);
    const ago = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString();
    return [
      { exam_id: 'se-006', exam_title: 'Database Final', course: 'Database Systems', submitted_at: ago(720), score: 94, max_score: 100, passed: true, time_used_min: 98, duration_min: 120, rank: 3, total_participants: 156, breakdown: [{ section: 'SQL', score: 38, max: 40 }, { section: 'Normalization', score: 28, max: 30 }, { section: 'Indexing', score: 18, max: 20 }, { section: 'Transactions', score: 10, max: 10 }], feedback: 'Excellent work! Bạn nắm rất chắc lý thuyết và áp dụng tốt vào thực hành.' },
      { exam_id: 'se-005', exam_title: 'DSA Weekly Quiz', course: 'Data Structures & Algorithms', submitted_at: ago(168), score: 92, max_score: 100, passed: true, time_used_min: 22, duration_min: 30, rank: 12, total_participants: 198, breakdown: [{ section: 'Linked List', score: 28, max: 30 }, { section: 'Trees', score: 32, max: 35 }, { section: 'Sorting', score: 32, max: 35 }], feedback: 'Tốt! Cần ôn thêm phần cây nhị phân và heap.' },
      { exam_id: 'se-004', exam_title: 'ML Mid-term — Practice', course: 'Machine Learning Fundamentals', submitted_at: ago(72), score: 88, max_score: 100, passed: true, time_used_min: 54, duration_min: 60, rank: 24, total_participants: 312, breakdown: [{ section: 'Regression', score: 38, max: 40 }, { section: 'Classification', score: 30, max: 35 }, { section: 'Evaluation', score: 20, max: 25 }], feedback: 'Bài làm tốt. Chú ý phần precision/recall.' },
    ];
  },

  async certificates(): Promise<StudentCertificate[]> {
    await sleep(100);
    const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
    return [
      { id: 'cert-001', title: 'Machine Learning Fundamentals', course: 'AI/ML', instructor: 'TS. Nguyễn Văn A', issued_at: ago(2), serial: 'IOES-2026-ML-000128', grade: 'Excellent' },
      { id: 'cert-002', title: 'Database Systems', course: 'Database', instructor: 'Lê Minh Hằng', issued_at: ago(30), serial: 'IOES-2026-DB-000412', grade: 'Excellent' },
      { id: 'cert-003', title: 'Modern Web Development', course: 'Web Dev', instructor: 'Trần Thị Hương', issued_at: ago(60), serial: 'IOES-2026-WEB-000198', grade: 'Honors' },
    ];
  },

  async leaderboard(): Promise<LeaderboardEntry[]> {
    await sleep(120);
    return [
      { rank: 1, user_id: 's-201', full_name: 'Nguyễn Anh Tuấn', avatar: 'https://i.pravatar.cc/100?img=12', points: 2840, courses_completed: 12, streak_days: 47, badge: 'gold' },
      { rank: 2, user_id: 's-202', full_name: 'Trần Hương Giang', avatar: 'https://i.pravatar.cc/100?img=23', points: 2710, courses_completed: 11, streak_days: 32, badge: 'silver' },
      { rank: 3, user_id: 's-203', full_name: 'Lê Minh Đức', avatar: 'https://i.pravatar.cc/100?img=33', points: 2580, courses_completed: 10, streak_days: 21, badge: 'bronze' },
      { rank: 4, user_id: 's-204', full_name: 'Phạm Ngọc Ánh', avatar: null, points: 2410, courses_completed: 9, streak_days: 18, badge: null },
      { rank: 5, user_id: 's-205', full_name: 'Vũ Hoàng Nam', avatar: 'https://i.pravatar.cc/100?img=49', points: 2280, courses_completed: 8, streak_days: 15, badge: null },
      { rank: 6, user_id: 's-206', full_name: 'Đỗ Quang Vinh', avatar: 'https://i.pravatar.cc/100?img=51', points: 2150, courses_completed: 8, streak_days: 12, badge: null },
      { rank: 7, user_id: 's-207', full_name: 'Hoàng Thị Mai', avatar: 'https://i.pravatar.cc/100?img=45', points: 1980, courses_completed: 7, streak_days: 9, badge: null },
      { rank: 8, user_id: 's-208', full_name: 'Ngô Minh Tuấn', avatar: 'https://i.pravatar.cc/100?img=53', points: 1840, courses_completed: 7, streak_days: 7, badge: null },
      { rank: 9, user_id: 's-209', full_name: 'Bùi Hà Linh', avatar: 'https://i.pravatar.cc/100?img=16', points: 1720, courses_completed: 6, streak_days: 5, badge: null },
      { rank: 10, user_id: 's-210', full_name: 'Phan Thanh Thảo', avatar: null, points: 1610, courses_completed: 6, streak_days: 4, badge: null },
    ];
  },

  async notifications(): Promise<StudentNotification[]> {
    await sleep(100);
    const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
    return [
      { id: 'sn-1', type: 'exam', title: 'Bài thi React.js Mid-term sắp đến hạn', body: 'Còn 2 ngày trước khi bài thi đóng. Chuẩn bị sớm nhé!', created_at: ago(10), read: false, action_url: '/student/exams' },
      { id: 'sn-2', type: 'achievement', title: 'Bạn đã nhận huy hiệu "30-day Streak"', body: 'Chuỗi học tập liên tục 30 ngày của bạn đã được ghi nhận.', created_at: ago(120), read: false, action_url: '/student/leaderboard' },
      { id: 'sn-3', type: 'course', title: 'Khóa học mới: Advanced TypeScript Patterns', body: 'TS. Nguyễn Văn A vừa ra mắt khóa học mới trong chuỗi Web Dev.', created_at: ago(360), read: false, action_url: '/student/courses' },
      { id: 'sn-4', type: 'system', title: 'Báo cáo tiến độ tuần này đã sẵn sàng', body: 'Bạn đã học 23.5 giờ tuần này, +12% so với tuần trước.', created_at: ago(720), read: true },
      { id: 'sn-5', type: 'message', title: 'TS. Nguyễn Văn A đã phản hồi câu hỏi của bạn', body: '"Câu trả lời của bạn rất tốt, tuy nhiên cần chú ý phần..."', created_at: ago(1440), read: true, action_url: '/student/messages' },
    ];
  },

  async messages(): Promise<StudentMessage[]> {
    await sleep(100);
    const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
    return [
      { id: 'sm-1', from_name: 'TS. Nguyễn Văn A', from_avatar: 'https://i.pravatar.cc/100?img=5', preview: 'Bạn làm bài tập rất tốt, nhưng phần useEffect...', last_message_at: ago(8), unread: 2, is_online: true },
      { id: 'sm-2', from_name: 'Trần Thị Hương', from_avatar: null, preview: 'Final project deadline đã được gia hạn đến...', last_message_at: ago(45), unread: 1, is_online: false },
      { id: 'sm-3', from_name: 'Lê Minh Đức', from_avatar: 'https://i.pravatar.cc/100?img=33', preview: 'Bạn có tài liệu về React Hooks không?', last_message_at: ago(180), unread: 0, is_online: true },
      { id: 'sm-4', from_name: 'Phạm Văn Quang', from_avatar: 'https://i.pravatar.cc/100?img=8', preview: 'Lịch học tuần sau đã cập nhật, vui lòng xem...', last_message_at: ago(720), unread: 0, is_online: false },
      { id: 'sm-5', from_name: 'Hỗ trợ IOES', from_avatar: null, preview: 'Cảm ơn bạn đã liên hệ. Vấn đề của bạn đã được...', last_message_at: ago(2880), unread: 0, is_online: true },
    ];
  },

  async learningPaths(): Promise<StudentLearningPath[]> {
    await sleep(120);
    return [
      { id: 'lp-001', title: 'Full-stack Web Developer', description: 'Lộ trình trở thành lập trình viên full-stack với React & Node.js', progress: 64, steps: [
        { id: 'lps-1', title: 'HTML, CSS cơ bản', type: 'course', status: 'done', estimated_hours: 20 },
        { id: 'lps-2', title: 'JavaScript Fundamentals', type: 'course', status: 'done', estimated_hours: 30 },
        { id: 'lps-3', title: 'React.js từ cơ bản đến nâng cao', type: 'course', status: 'current', estimated_hours: 40 },
        { id: 'lps-4', title: 'State Management (Redux/Zustand)', type: 'course', status: 'locked', estimated_hours: 15 },
        { id: 'lps-5', title: 'Node.js & Express', type: 'course', status: 'locked', estimated_hours: 35 },
        { id: 'lps-6', title: 'Database (SQL & NoSQL)', type: 'course', status: 'locked', estimated_hours: 25 },
        { id: 'lps-7', title: 'Capstone Project', type: 'project', status: 'locked', estimated_hours: 60 },
      ]},
      { id: 'lp-002', title: 'AI Engineer', description: 'Từ Python cơ bản đến triển khai mô hình ML production', progress: 28, steps: [
        { id: 'lps-21', title: 'Python cơ bản', type: 'course', status: 'done', estimated_hours: 25 },
        { id: 'lps-22', title: 'Statistics for ML', type: 'course', status: 'current', estimated_hours: 30 },
        { id: 'lps-23', title: 'Machine Learning Fundamentals', type: 'course', status: 'locked', estimated_hours: 40 },
        { id: 'lps-24', title: 'Deep Learning với PyTorch', type: 'course', status: 'locked', estimated_hours: 50 },
        { id: 'lps-25', title: 'MLOps cơ bản', type: 'course', status: 'locked', estimated_hours: 30 },
      ]},
    ];
  },

  async courseDetail(id: string): Promise<StudentCourseDetail | null> {
    await sleep(140);
    const map: Record<string, StudentCourseDetail> = {
      'sc-001': {
        id: 'sc-001',
        title: 'Lập trình Web với React.js',
        instructor: 'TS. Nguyễn Văn A',
        instructor_avatar: 'https://i.pravatar.cc/100?img=5',
        category: 'Web Dev',
        rating: 4.8,
        reviews_count: 1284,
        enrolled_count: 456,
        lessons_count: 24,
        duration_hours: 32,
        difficulty: 'intermediate',
        language: 'Tiếng Việt',
        last_updated: '2 ngày trước',
        short_description: 'Xây dựng ứng dụng web hiện đại với React, TypeScript và TailwindCSS.',
        description: 'Khóa học toàn diện về React.js từ cơ bản đến nâng cao. Bạn sẽ học cách xây dựng các ứng dụng web production-grade với React 18, TypeScript, TailwindCSS và các công cụ hiện đại. Khóa học bao gồm nhiều dự án thực tế và bài tập thử thách.',
        what_you_learn: [
          'Nắm vững React Hooks (useState, useEffect, useContext, useReducer)',
          'Quản lý state với Redux Toolkit và Zustand',
          'Xây dựng REST API client với React Query / TanStack Query',
          'TypeScript nâng cao cho React applications',
          'Testing với Jest và React Testing Library',
          'Triển khai ứng dụng lên Vercel/Netlify',
        ],
        requirements: [
          'Biết JavaScript ES6+ cơ bản',
          'Hiểu HTML & CSS',
          'Có máy tính cài đặt Node.js 18+',
        ],
        curriculum: [
          { section: 'Giới thiệu & Cài đặt', lessons: [
            { title: 'Tổng quan khóa học', duration_min: 8, preview: true },
            { title: 'Cài đặt môi trường', duration_min: 15, preview: true },
            { title: 'Khởi tạo dự án React', duration_min: 20 },
          ]},
          { section: 'React Cơ bản', lessons: [
            { title: 'JSX và Components', duration_min: 25 },
            { title: 'Props và State', duration_min: 30 },
            { title: 'Xử lý sự kiện', duration_min: 22 },
            { title: 'Conditional Rendering', duration_min: 18 },
          ]},
          { section: 'React Hooks', lessons: [
            { title: 'useState', duration_min: 28 },
            { title: 'useEffect', duration_min: 35 },
            { title: 'useContext', duration_min: 24 },
            { title: 'Custom Hooks', duration_min: 32 },
          ]},
          { section: 'Styling', lessons: [
            { title: 'TailwindCSS Setup', duration_min: 20 },
            { title: 'Component variants với CVA', duration_min: 25 },
            { title: 'Dark mode', duration_min: 18 },
          ]},
          { section: 'Routing & Data', lessons: [
            { title: 'React Router v6', duration_min: 30 },
            { title: 'React Query cơ bản', duration_min: 35 },
            { title: 'Form handling với React Hook Form', duration_min: 28 },
          ]},
        ],
      },
    };
    return map[id] ?? null;
  },

  async courseLessons(_courseId: string): Promise<StudentCourseLesson[]> {
    await sleep(100);
    return [
      { id: 'l-1', title: 'Tổng quan khóa học', type: 'video', duration_min: 8, completed: true, video_url: '#', content: 'Chào mừng bạn đến với khóa học React.js! Trong bài học đầu tiên này, chúng ta sẽ cùng nhau tìm hiểu về lộ trình học và những gì bạn sẽ đạt được sau khóa học.' },
      { id: 'l-2', title: 'Cài đặt môi trường', type: 'video', duration_min: 15, completed: true, video_url: '#', content: 'Cài đặt Node.js, VS Code và các extension cần thiết cho khóa học.' },
      { id: 'l-3', title: 'Khởi tạo dự án React với Vite', type: 'video', duration_min: 20, completed: true, video_url: '#' },
      { id: 'l-4', title: 'JSX và Components', type: 'video', duration_min: 25, completed: true, video_url: '#' },
      { id: 'l-5', title: 'Props và State', type: 'video', duration_min: 30, completed: false, video_url: '#', content: 'Trong bài học này, chúng ta sẽ tìm hiểu sâu về Props và State - hai khái niệm quan trọng nhất của React. Props giúp truyền dữ liệu từ component cha xuống component con, còn State giúp component quản lý dữ liệu nội tại của nó.' },
      { id: 'l-6', title: 'Xử lý sự kiện', type: 'video', duration_min: 22, completed: false, video_url: '#' },
      { id: 'l-7', title: 'Quiz: React cơ bản', type: 'quiz', duration_min: 15, completed: false },
      { id: 'l-8', title: 'useState Hook', type: 'video', duration_min: 28, completed: false, video_url: '#' },
      { id: 'l-9', title: 'useEffect Hook', type: 'reading', duration_min: 35, completed: false, content: 'useEffect là Hook cho phép bạn thực hiện side effects trong function component. Nó tương đương với componentDidMount, componentDidUpdate và componentWillUnmount trong class component.' },
      { id: 'l-10', title: 'Custom Hooks', type: 'video', duration_min: 32, completed: false, video_url: '#' },
      { id: 'l-11', title: 'Project: Todo App', type: 'project', duration_min: 90, completed: false },
      { id: 'l-12', title: 'TailwindCSS Setup', type: 'video', duration_min: 20, completed: false, video_url: '#' },
    ];
  },

  async courseDiscussion(_courseId: string): Promise<DiscussionPost[]> {
    await sleep(100);
    const ago = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString();
    return [
      { id: 'd-1', author_name: 'Nguyễn Văn Minh', author_avatar: 'https://i.pravatar.cc/100?img=1', is_instructor: false, posted_at: ago(2), content: 'Mọi người ơi, phần useEffect với cleanup function mình vẫn chưa hiểu rõ. Ai giải thích giúp mình với!', likes: 8, replies: 5 },
      { id: 'd-2', author_name: 'TS. Nguyễn Văn A', author_avatar: 'https://i.pravatar.cc/100?img=5', is_instructor: true, posted_at: ago(3), content: 'Chào Minh! Cleanup function trong useEffect chạy khi component unmount hoặc trước khi effect chạy lại. Nó thường dùng để cleanup subscriptions, timers, hoặc event listeners.', likes: 24, replies: 12 },
      { id: 'd-3', author_name: 'Trần Hương Giang', author_avatar: 'https://i.pravatar.cc/100?img=23', is_instructor: false, posted_at: ago(8), content: 'Cảm ơn thầy! Cho em hỏi thêm, khi nào nên dùng useEffect với empty deps array và khi nào nên truyền dependencies?', likes: 5, replies: 3 },
      { id: 'd-4', author_name: 'Lê Minh Đức', author_avatar: 'https://i.pravatar.cc/100?img=33', is_instructor: false, posted_at: ago(24), content: 'Mình share tip nhỏ: luôn include tất cả dependencies vào array, nếu thiếu thì ESLint sẽ warning ngay. Đừng ignore warning nhé!', likes: 15, replies: 7 },
    ];
  },

  async courseReviews(_courseId: string): Promise<StudentCourseReview[]> {
    await sleep(100);
    const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
    return [
      { id: 'r-1', user_name: 'Nguyễn Anh Tuấn', user_avatar: 'https://i.pravatar.cc/100?img=12', rating: 5, posted_at: ago(3), content: 'Khóa học rất chất lượng! Thầy giảng dễ hiểu, bài tập thực tế. Đặc biệt phần React Hooks giúp mình hiểu sâu hơn rất nhiều.', helpful: 42 },
      { id: 'r-2', user_name: 'Trần Hương Giang', user_avatar: 'https://i.pravatar.cc/100?img=23', rating: 5, posted_at: ago(7), content: 'Một trong những khóa học React tốt nhất mà mình từng học. Từ cơ bản đến nâng cao đều được cover kỹ lưỡng.', helpful: 28 },
      { id: 'r-3', user_name: 'Lê Minh Đức', user_avatar: 'https://i.pravatar.cc/100?img=33', rating: 4, posted_at: ago(14), content: 'Nội dung tốt, dự án cuối khóa rất thực tế. Chỉ tiếc là phần testing hơi ngắn, mong thầy bổ sung thêm.', helpful: 15 },
      { id: 'r-4', user_name: 'Phạm Ngọc Ánh', user_avatar: null, rating: 5, posted_at: ago(21), content: 'Recommend cho ai muốn học React bài bản. Mình đã đi làm 2 năm mà vẫn học được nhiều thứ mới.', helpful: 9 },
    ];
  },

  async practiceQuestions(topic?: string): Promise<StudentPracticeQuestion[]> {
    await sleep(100);
    const all: StudentPracticeQuestion[] = [
      { id: 'q-1', topic: 'React Hooks', difficulty: 'easy', question: 'Hook nào dùng để quản lý state trong function component?', options: ['useState', 'useEffect', 'useContext', 'useReducer'], correct_index: 0, explanation: 'useState là Hook cơ bản nhất để khai báo state trong function component. Nó trả về một cặp giá trị: state hiện tại và hàm setter để cập nhật state.' },
      { id: 'q-2', topic: 'React Hooks', difficulty: 'medium', question: 'Khi nào cleanup function trong useEffect được gọi?', options: ['Chỉ khi component unmount', 'Trước khi effect chạy lại và khi unmount', 'Sau mỗi lần render', 'Khi state thay đổi'], correct_index: 1, explanation: 'Cleanup function được gọi trước khi effect chạy lại (khi dependencies thay đổi) và khi component unmount. Nó giúp cleanup subscriptions, timers hoặc event listeners.' },
      { id: 'q-3', topic: 'JavaScript', difficulty: 'medium', question: 'Output của `console.log(typeof null)` là gì?', options: ['"null"', '"object"', '"undefined"', '"number"'], correct_index: 1, explanation: 'Đây là một quirk nổi tiếng của JavaScript. typeof null trả về "object" do bug lịch sử từ phiên bản đầu tiên của JS (1995).' },
      { id: 'q-4', topic: 'JavaScript', difficulty: 'hard', question: 'Kết quả của `[] + []` trong JavaScript?', options: ['"" (empty string)', '"[]"', '"[object Object]"', 'Error'], correct_index: 0, explanation: 'Cả hai array đều được convert sang chuỗi rỗng (vì Array.prototype.toString() nối các phần tử bằng dấu phẩy). Do đó "" + "" = "".' },
      { id: 'q-5', topic: 'CSS', difficulty: 'easy', question: 'Thuộc tính CSS nào dùng để tạo flex container?', options: ['display: flex', 'display: block', 'flex: 1', 'position: flex'], correct_index: 0, explanation: 'display: flex biến một element thành flex container, cho phép sử dụng các thuộc tính flexbox khác trên container và các item con.' },
    ];
    return topic ? all.filter(q => q.topic === topic) : all;
  },

  async search(query: string): Promise<StudentSearchResult[]> {
    await sleep(100);
    if (!query) return [];
    const q = query.toLowerCase();
    const all: StudentSearchResult[] = [
      { id: 's-1', type: 'course', title: 'Lập trình Web với React.js', subtitle: 'Web Dev · TS. Nguyễn Văn A', meta: '32 giờ · 4.8 ★' },
      { id: 's-2', type: 'course', title: 'Machine Learning Fundamentals', subtitle: 'AI/ML · TS. Nguyễn Văn A', meta: '36 giờ · 4.9 ★' },
      { id: 's-3', type: 'course', title: 'UI/UX Design Fundamentals', subtitle: 'Design · Trần Thị Hương', meta: '22 giờ · 4.7 ★' },
      { id: 's-4', type: 'course', title: 'Cloud Computing với AWS', subtitle: 'Cloud · TS. Nguyễn Văn A', meta: '28 giờ · 4.8 ★' },
      { id: 's-5', type: 'lesson', title: 'useEffect Hook', subtitle: 'Lập trình Web với React.js · Bài 9', meta: '35 phút' },
      { id: 's-6', type: 'lesson', title: 'JSX và Components', subtitle: 'Lập trình Web với React.js · Bài 4', meta: '25 phút' },
      { id: 's-7', type: 'instructor', title: 'TS. Nguyễn Văn A', subtitle: 'Giảng viên Khoa CNTT', meta: '8 khóa học · 4.8 ★' },
      { id: 's-8', type: 'instructor', title: 'Trần Thị Hương', subtitle: 'Giảng viên Khoa Design', meta: '5 khóa học · 4.7 ★' },
      { id: 's-9', type: 'exam', title: 'React.js — Kiểm tra giữa kỳ', subtitle: 'Lập trình Web với React.js', meta: '90 phút · 40 câu' },
    ];
    return all.filter(s => s.title.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q));
  },

  async enrollments(): Promise<StudentEnrollment[]> {
    await sleep(100);
    const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
    const future = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
    return [
      { course_id: 'sc-001', enrolled_at: ago(28), expires_at: future(180), payment_method: 'free', status: 'active' },
      { course_id: 'sc-002', enrolled_at: ago(60), expires_at: null, payment_method: 'voucher', status: 'active' },
      { course_id: 'sc-003', enrolled_at: ago(15), expires_at: future(180), payment_method: 'token', status: 'active' },
      { course_id: 'sc-004', enrolled_at: ago(20), expires_at: future(180), payment_method: 'free', status: 'active' },
      { course_id: 'sc-005', enrolled_at: ago(10), expires_at: future(180), payment_method: 'voucher', status: 'active' },
      { course_id: 'sc-007', enrolled_at: ago(120), expires_at: null, payment_method: 'token', status: 'active' },
    ];
  },
};

