import { apiClient, toApiError } from '@/config/api.config';

/**
 * Khoá học, chương, bài học và danh mục của content-service (Spring, cổng 9001).
 *
 * Gateway khai `Path=/api/v1/courses/**,/api/v1/categories/**` và KHÔNG cắt
 * tiền tố, vì controller đã mang sẵn `/api/v1`.
 *
 * Khác exam-suite hay analytics-service: content-service trả thẳng DTO chứ
 * không bọc trong `ApiEnvelope`, nên ở đây không dùng `unwrap` mà tự lấy
 * `response.data`.
 *
 * Quyền (xem `SecurityConfig` phía service):
 * - Mọi route khoá học đều cần đăng nhập, kể cả GET. Gateway cũng không mở
 *   `/api/v1/**` cho khách, nên trang công khai chỉ gọi được khi đã có token.
 * - `GET /stats`, `POST /{id}/approve`, `POST /{id}/reject`: chỉ admin/super_admin.
 * - Sửa, xoá, gửi duyệt, xuất bản, thêm/xoá chương và bài học: chủ khoá hoặc admin.
 * - `GET` danh sách không tự lọc theo trạng thái: học viên muốn xem catalogue
 *   thì phải tự truyền `status=published`.
 */

const COURSES = '/api/v1/courses';
const CATEGORIES = '/api/v1/categories';

/** Khớp enum `CourseStatus`. */
export type CourseStatus = 'draft' | 'published' | 'archived';

/** Khớp enum `ReviewStatus`. `null` ở `CourseView` nghĩa là chưa từng gửi duyệt. */
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

/** Khớp enum `LessonType`. */
export type LessonType = 'video' | 'document' | 'quiz' | 'assignment' | 'live';

/**
 * Khớp record `CourseView`.
 *
 * Không có tên giảng viên, tên danh mục hay số bài học: phía gọi phải tự ghép
 * `categoryId` với `listCategories()` và đếm bài học từ `getCourseDetail()`.
 */
export interface Course {
  id: string;
  instructorId: string;
  categoryId: string | null;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  previewVideoUrl: string | null;
  /** Cột `decimal`, Jackson ghi ra số. */
  price: number | null;
  currency: string | null;
  durationHours: number | null;
  /** 1..5 */
  difficultyLevel: number | null;
  language: string | null;
  status: CourseStatus;
  reviewStatus: ReviewStatus | null;
  rejectionReason: string | null;
  publishedAt: string | null;
  /** JSONB do trigger DB duy trì, chỉ đọc. Xem `courseStat()`. */
  stats: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/** Khớp record `LessonView`. */
export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  description: string | null;
  lessonType: LessonType;
  contentUrl: string | null;
  durationMinutes: number | null;
  sortOrder: number | null;
  isFree: boolean | null;
  isPreview: boolean | null;
}

/** Khớp record `ChapterView`. */
export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  sortOrder: number | null;
  isFree: boolean | null;
  lessons: Lesson[];
}

/** Khớp record `CourseDetailView`. */
export interface CourseDetail {
  course: Course;
  chapters: Chapter[];
}

/** Khớp record `CategoryView`. */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  icon: string | null;
  sortOrder: number | null;
}

/** Khớp record `CourseStatsView`. `total` đếm theo trạng thái xuất bản. */
export interface CourseStats {
  total: number;
  draft: number;
  published: number;
  archived: number;
  pendingReview: number;
  approved: number;
  rejected: number;
}

/** Khớp record `PageView<T>`. Lưu ý backend dùng `perPage` (camelCase) ở `meta`. */
export interface CoursePage {
  data: Course[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

export interface CourseListParams {
  search?: string;
  categoryId?: string;
  /** `'all'` hoặc bỏ trống là không lọc. */
  status?: CourseStatus | 'all';
  reviewStatus?: ReviewStatus | 'all';
  /** Chỉ khoá của người gọi (id lấy từ token). */
  mine?: boolean;
  page?: number;
  /** Backend chặn tối đa 100. */
  perPage?: number;
}

/** Khớp record `CreateCourse`. `instructorId` luôn lấy từ token. */
export interface CreateCoursePayload {
  title: string;
  slug: string;
  categoryId?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  previewVideoUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  durationHours?: number | null;
  difficultyLevel?: number | null;
  language?: string | null;
}

/** Khớp record `UpdateCourse`. Trường bỏ trống/null là giữ nguyên, không phải xoá. */
export type UpdateCoursePayload = Partial<Omit<CreateCoursePayload, 'slug'>> & {
  status?: CourseStatus;
};

/** Khớp record `CreateChapter`. */
export interface CreateChapterPayload {
  title: string;
  description?: string | null;
  sortOrder?: number | null;
  isFree?: boolean | null;
}

/**
 * Trường null/bỏ trống là giữ nguyên, không phải xoá — khớp với backend
 * `UpdateChapter`. {@link title} nếu gửi phải khớp {@link CreateChapterPayload}.
 */
export type UpdateChapterPayload = Partial<CreateChapterPayload>;

/** Khớp record `CreateLesson`. */
export interface CreateLessonPayload {
  title: string;
  description?: string | null;
  lessonType: LessonType;
  contentUrl?: string | null;
  durationMinutes?: number | null;
  sortOrder?: number | null;
  isFree?: boolean | null;
  isPreview?: boolean | null;
}

/**
 * Trường null/bỏ trống là giữ nguyên. {@link lessonType} là tuỳ chọn: nếu
 * client muốn đổi kiểu bài thì phải gửi rõ.
 */
export type UpdateLessonPayload = Partial<CreateLessonPayload>;

/** Lấy thân response và đổi lỗi axios thành `ApiError`, thay cho `unwrap`. */
async function body<T>(promise: Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await promise;
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

async function noContent(promise: Promise<unknown>): Promise<void> {
  try {
    await promise;
  } catch (err) {
    throw toApiError(err);
  }
}

/**
 * Đọc một số trong `course.stats`.
 *
 * Mặc định của cột là `{"enrollments":0, ..., "avg_rating":0, ...}`, nhưng
 * JSONB không có schema nên khoá có thể thiếu — trả `null` để giao diện ẩn
 * đi thay vì hiện số 0 như thể đã đo.
 */
export function courseStat(course: Pick<Course, 'stats'>, key: string): number | null {
  const raw = course.stats?.[key];
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Giá hiển thị; `null`/0 coi là miễn phí vì cột `price` mặc định 0. */
export function formatCoursePrice(course: Pick<Course, 'price' | 'currency'>, freeLabel: string): string {
  const price = course.price ?? 0;
  if (price === 0) return freeLabel;
  const currency = course.currency ?? 'VND';
  if (currency === 'VND') return `${price.toLocaleString('vi-VN')}đ`;
  return `${price.toFixed(2)} ${currency}`;
}

/** Tổng số bài học trong cây chương. */
export function countLessons(chapters: Chapter[]): number {
  return chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
}

export function listCourses(params: CourseListParams = {}): Promise<CoursePage> {
  const { perPage, ...rest } = params;
  return body(
    apiClient.get<CoursePage>(COURSES, {
      params: {
        ...rest,
        search: rest.search?.trim() || undefined,
        mine: rest.mine || undefined,
        per_page: perPage,
      },
    }),
  );
}

export function getCourseStats(): Promise<CourseStats> {
  return body(apiClient.get<CourseStats>(`${COURSES}/stats`));
}

export function getCourse(id: string): Promise<Course> {
  return body(apiClient.get<Course>(`${COURSES}/${id}`));
}

export function getCourseDetail(id: string): Promise<CourseDetail> {
  return body(apiClient.get<CourseDetail>(`${COURSES}/${id}/detail`));
}

/**
 * Backend không có route tra theo slug. Tìm bằng `search` (khớp cả tiêu đề
 * lẫn slug) rồi lọc đúng slug; `null` nếu không thấy.
 */
export async function findCourseBySlug(
  slug: string,
  status: CourseStatus | 'all' = 'published',
): Promise<Course | null> {
  const page = await listCourses({ search: slug, status, perPage: 100 });
  return page.data.find((c) => c.slug === slug) ?? null;
}

export function createCourse(payload: CreateCoursePayload): Promise<Course> {
  return body(apiClient.post<Course>(COURSES, payload));
}

export function updateCourse(id: string, payload: UpdateCoursePayload): Promise<Course> {
  return body(apiClient.patch<Course>(`${COURSES}/${id}`, payload));
}

export function deleteCourse(id: string): Promise<void> {
  return noContent(apiClient.delete(`${COURSES}/${id}`));
}

export function submitCourseForReview(id: string): Promise<Course> {
  return body(apiClient.post<Course>(`${COURSES}/${id}/submit`));
}

/** Admin không duyệt được khoá do chính mình tạo — backend trả 403. */
export function approveCourse(id: string): Promise<Course> {
  return body(apiClient.post<Course>(`${COURSES}/${id}/approve`));
}

/** `reason` bắt buộc, không rỗng, tối đa 1000 ký tự. */
export function rejectCourse(id: string, reason: string): Promise<Course> {
  return body(apiClient.post<Course>(`${COURSES}/${id}/reject`, { reason }));
}

/** Chỉ khoá đã được duyệt mới xuất bản được. */
export function publishCourse(id: string): Promise<Course> {
  return body(apiClient.post<Course>(`${COURSES}/${id}/publish`));
}

export function addChapter(courseId: string, payload: CreateChapterPayload): Promise<Chapter> {
  return body(apiClient.post<Chapter>(`${COURSES}/${courseId}/chapters`, payload));
}

/**
 * Cập nhật một phần chương. Trường null/bỏ trống là giữ nguyên — khớp với
 * backend `UpdateChapter`.
 */
export function updateChapter(
  courseId: string,
  chapterId: string,
  payload: UpdateChapterPayload,
): Promise<Chapter> {
  return body(apiClient.patch<Chapter>(`${COURSES}/${courseId}/chapters/${chapterId}`, payload));
}

export function deleteChapter(courseId: string, chapterId: string): Promise<void> {
  return noContent(apiClient.delete(`${COURSES}/${courseId}/chapters/${chapterId}`));
}

export function listLessons(courseId: string, chapterId: string): Promise<Lesson[]> {
  return body(apiClient.get<Lesson[]>(`${COURSES}/${courseId}/chapters/${chapterId}/lessons`));
}

export function addLesson(
  courseId: string,
  chapterId: string,
  payload: CreateLessonPayload,
): Promise<Lesson> {
  return body(
    apiClient.post<Lesson>(`${COURSES}/${courseId}/chapters/${chapterId}/lessons`, payload),
  );
}

/**
 * Cập nhật một phần bài học. Trường null/bỏ trống là giữ nguyên — khớp với
 * backend `UpdateLesson`.
 */
export function updateLesson(
  courseId: string,
  chapterId: string,
  lessonId: string,
  payload: UpdateLessonPayload,
): Promise<Lesson> {
  return body(
    apiClient.patch<Lesson>(
      `${COURSES}/${courseId}/chapters/${chapterId}/lessons/${lessonId}`,
      payload,
    ),
  );
}

export function deleteLesson(courseId: string, chapterId: string, lessonId: string): Promise<void> {
  return noContent(
    apiClient.delete(`${COURSES}/${courseId}/chapters/${chapterId}/lessons/${lessonId}`),
  );
}

// ===== Ghi danh và tiến độ bài học =====

/** Khớp enum `EnrollmentStatus`. Huỷ ghi danh xoá hẳn bản ghi nên client không gặp `cancelled`. */
export type EnrollmentStatus = 'active' | 'completed' | 'cancelled' | 'expired';

/** Khớp record `EnrollmentView`. */
export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  status: EnrollmentStatus;
  /** 0..100, làm tròn xuống nên chỉ đạt 100 khi xong hết bài. */
  progressPercent: number;
  enrolledAt: string;
  completedAt: string | null;
  lastAccessedAt: string | null;
}

/** Khớp record `EnrollmentStateView`. Chưa ghi danh vẫn là 200 với `enrolled: false`. */
export interface EnrollmentState {
  enrolled: boolean;
  enrollment: Enrollment | null;
  completedLessonIds: string[];
}

/** Khớp record `MyEnrollmentView`. */
export interface MyEnrollment {
  enrollment: Enrollment;
  course: Course;
}

/** Khớp record `StudentEnrollmentView`. Tên và email là bản chụp lúc ghi danh, có thể null. */
export interface StudentEnrollment {
  enrollment: Enrollment;
  studentName: string | null;
  studentEmail: string | null;
  courseTitle: string;
}

/** Khoá có giá: backend trả 402 khi ghi danh vì hệ thống chưa có thanh toán. */
export function isPaidCourse(course: Pick<Course, 'price'>): boolean {
  return (course.price ?? 0) > 0;
}

export function getEnrollmentState(courseId: string): Promise<EnrollmentState> {
  return body(apiClient.get<EnrollmentState>(`${COURSES}/${courseId}/enrollment`));
}

/** Gọi lại khi đã ghi danh không lỗi, backend trả lượt đang có. */
export function enroll(courseId: string): Promise<Enrollment> {
  return body(apiClient.post<Enrollment>(`${COURSES}/${courseId}/enrollment`));
}

/** Xoá lượt ghi danh cùng toàn bộ tiến độ bài học của khoá. */
export function cancelEnrollment(courseId: string): Promise<void> {
  return noContent(apiClient.delete(`${COURSES}/${courseId}/enrollment`));
}

export function setLessonCompleted(
  courseId: string,
  lessonId: string,
  completed: boolean,
): Promise<EnrollmentState> {
  return body(
    apiClient.put<EnrollmentState>(`${COURSES}/${courseId}/lessons/${lessonId}/progress`, { completed }),
  );
}

export function listMyEnrollments(): Promise<MyEnrollment[]> {
  return body(apiClient.get<MyEnrollment[]>(`${COURSES}/enrollments/me`));
}

/** Học viên của một khoá, hoặc mọi khoá người gọi đứng tên khi bỏ trống. Chỉ giảng viên/quản trị. */
export function listStudents(courseId?: string): Promise<StudentEnrollment[]> {
  return body(apiClient.get<StudentEnrollment[]>(`${COURSES}/students`, { params: { courseId } }));
}

/** Danh mục đang hoạt động. Service cho GET công khai, nhưng gateway vẫn đòi token. */
export function listCategories(): Promise<Category[]> {
  return body(apiClient.get<Category[]>(CATEGORIES));
}

export const contentApi = {
  listCourses,
  getCourseStats,
  getCourse,
  getCourseDetail,
  findCourseBySlug,
  createCourse,
  updateCourse,
  deleteCourse,
  submitCourseForReview,
  approveCourse,
  rejectCourse,
  publishCourse,
  addChapter,
  updateChapter,
  deleteChapter,
  listLessons,
  addLesson,
  updateLesson,
  deleteLesson,
  getEnrollmentState,
  enroll,
  cancelEnrollment,
  setLessonCompleted,
  listMyEnrollments,
  listStudents,
  listCategories,
};
