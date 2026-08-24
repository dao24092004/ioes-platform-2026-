// Types matching database migrations (auth-service, content-service)

export type UserStatus = 'pending' | 'active' | 'suspended' | 'deleted';
export type UserRole = 'super_admin' | 'admin' | 'instructor' | 'student' | 'guest';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  bio?: string | null;
  status: UserStatus;
  role: UserRole;
  email_verified: boolean;
  mfa_enabled: boolean;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface UserStats {
  total: number;
  students: number;
  instructors: number;
  admins: number;
  super_admins: number;
  suspended: number;
  pending: number;
  active: number;
}

export interface UserListParams {
  page?: number;
  per_page?: number;
  search?: string;
  role?: UserRole | 'all';
  status?: UserStatus | 'all';
  sort?: 'newest' | 'oldest' | 'name_asc' | 'name_desc';
}

// ============================================
// COURSES (content-service)
// ============================================

export type CourseStatus = 'draft' | 'published' | 'archived';
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;
export type LessonType = 'video' | 'document' | 'quiz' | 'assignment' | 'live';

// Approval workflow is stored inside course.metadata (JSONB).
// `course_status` and approval_status are independent:
//   - course_status: lifecycle of the course on the platform (draft/published/archived)
//   - metadata.review.status: latest admin review outcome (pending/approved/rejected)
export type CourseApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface CourseReviewMeta {
  status: CourseApprovalStatus;
  submitted_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
}

export interface CourseStats {
  enrollments: number;
  completion_rate: number;
  avg_rating: number;
  total_reviews: number;
}

export interface Course {
  id: string;
  instructor_id: string;
  category_id?: string | null;
  title: string;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  preview_video_url?: string | null;
  price: number;
  currency: string;
  duration_hours?: number | null;
  difficulty_level?: DifficultyLevel | null;
  language: string;
  status: CourseStatus;
  published_at?: string | null;
  // JSONB column — approval workflow lives here, NOT a separate DB column.
  metadata?: Record<string, any> & { review?: CourseReviewMeta };
  stats: CourseStats;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Joined fields (denormalized for display)
  instructor_name?: string;
  instructor_avatar?: string | null;
  category_name?: string | null;
  lessons_count?: number;
}

export interface CourseApprovalItem {
  course: Course;
  review: CourseReviewMeta;
}

export interface CourseListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: CourseStatus | CourseApprovalStatus | 'all';
  category_id?: string;
  instructor_id?: string;
}

export interface CourseStatsSummary {
  total: number;
  draft: number;
  published: number;
  archived: number;
  pending_approval: number;
}

// ============================================
// API Response
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}
