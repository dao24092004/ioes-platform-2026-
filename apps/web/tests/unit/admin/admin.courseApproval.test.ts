/** Wave 4B (admin) — Unit: CourseApprovalPage (`/admin/courses/approval`). */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
  };
});

import { apiClient } from '@/config/api.config';
import {
  approveCourse,
  getCourseStats,
  listCourses,
  rejectCourse,
  type CoursePage,
  type CourseStats,
} from '@/services/api/content.api';

/** content-service error body: it is NOT wrapped in an envelope. */
const httpError = (status: number, message: string) => {
  const err = new Error(message) as Error & {
    isAxiosError: boolean;
    response: { status: number; data: { message: string; traceId: string } };
  };
  err.isAxiosError = true;
  err.response = { status, data: { message, traceId: 'trace-content' } };
  return err;
};

const stats = (over: Partial<CourseStats> = {}): CourseStats => ({
  total: 42,
  draft: 10,
  published: 25,
  archived: 7,
  pendingReview: 5,
  approved: 20,
  rejected: 2,
  ...over,
});

const emptyPage: CoursePage = { data: [], meta: { total: 0, page: 1, perPage: 50, totalPages: 0 } };

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
});

// ---------------------------------------------------------------------------
// getCourseStats — the four stat cards that double as status tabs
// ---------------------------------------------------------------------------
describe('contentApi.getCourseStats — the stat cards on CourseApprovalPage', () => {
  it('UT-ADMCOURSE-001: should read GET /api/v1/courses/stats and return the bare DTO, not an envelope, keeping a zero count as 0', async () => {
    // `rejected: 0` is a real count, not a missing value: the stat card renders
    // `stats?.total ?? 0`, so a 0 must survive the wrapper as 0.
    vi.mocked(apiClient.get).mockResolvedValue({ data: stats({ rejected: 0 }) });

    const result = await getCourseStats();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/courses/stats');
    // No envelope wrapper: content-service returns the record directly.
    expect(result).toEqual(stats({ rejected: 0 }));
    expect(result).not.toHaveProperty('success');
    expect(result.rejected).toBe(0);
  });

  it('UT-ADMCOURSE-003: should turn a 401 from the admin-only /stats route into an ApiError with the backend message', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(httpError(401, 'Chưa đăng nhập'));

    await expect(getCourseStats()).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Chưa đăng nhập',
    });
  });
});

// ---------------------------------------------------------------------------
// listCourses — the review-status filter behind the stat-card tabs
// ---------------------------------------------------------------------------
describe('contentApi.listCourses — the review-status filter behind the stat cards', () => {
  it('UT-ADMCOURSE-004: should forward reviewStatus=pending, the filter the page opens with', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: emptyPage });

    await listCourses({ page: 1, perPage: 50, reviewStatus: 'pending' });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/courses', {
      params: { page: 1, reviewStatus: 'pending', per_page: 50 },
    });
  });

  it('UT-ADMCOURSE-005: should forward reviewStatus=all and drop a blank search so the "all courses" tab is not filtered', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: emptyPage });

    await listCourses({ page: 1, perPage: 50, search: '   ', reviewStatus: 'all' });

    const [, config] = vi.mocked(apiClient.get).mock.calls[0]!;
    expect(config?.params).toMatchObject({ reviewStatus: 'all' });
    // `search` is trimmed to '' and then folded to `undefined`, which axios
    // serialises as absent from the query string.
    expect((config?.params as { search?: string }).search).toBeUndefined();
  });

  it('UT-ADMCOURSE-006: should trim the search term before sending it', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: emptyPage });

    await listCourses({ search: '  React  ', reviewStatus: 'approved' });

    const [, config] = vi.mocked(apiClient.get).mock.calls[0]!;
    expect(config?.params).toMatchObject({ search: 'React', reviewStatus: 'approved' });
  });
});

// ---------------------------------------------------------------------------
// approveCourse / rejectCourse — the two mutations
// ---------------------------------------------------------------------------
describe('contentApi.approveCourse / rejectCourse — the two review mutations', () => {
  it('UT-ADMCOURSE-007: should POST to /approve with no request body', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'c-9' } });

    await approveCourse('c-9');

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/courses/c-9/approve');
  });

  it('UT-ADMCOURSE-008: should surface the 403 that content-service returns when an admin approves their own course', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(
      httpError(403, 'Bạn không thể duyệt khoá học do chính mình tạo')
    );

    await expect(approveCourse('c-9')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Bạn không thể duyệt khoá học do chính mình tạo',
    });
  });

  it('UT-ADMCOURSE-009: should POST the trimmed reason to /reject, verbatim, including characters that must not be escaped client-side', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'c-9' } });
    // The page already runs `.trim()` before calling; the wrapper must not
    // re-sanitise or re-escape a reason the admin typed.
    const reason = "Thiếu mục 3: <script>alert('x')</script> — nội dung chưa đúng";

    await rejectCourse('c-9', reason);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/courses/c-9/reject', { reason });
    expect(vi.mocked(apiClient.post).mock.calls[0]![1]).toEqual({ reason });
  });

  it('UT-ADMCOURSE-010: should surface a 400 from the empty-reason guard as an ApiError with status 400', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(httpError(400, 'Lý do từ chối là bắt buộc'));

    await expect(rejectCourse('c-9', '')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Lý do từ chối là bắt buộc',
    });
  });
});
