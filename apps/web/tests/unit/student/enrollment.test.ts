/** Wave 2A — Unit: EnrollmentPage (student) data layer. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listMyEnrollments,
  cancelEnrollment,
  getEnrollmentState,
} from '@/services/api/content.api';

vi.mock('@/config/api.config', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
  toApiError: (err: unknown) => (err instanceof Error ? err : new Error(String(err))),
}));

import { apiClient } from '@/config/api.config';

const mockGet = vi.mocked(apiClient.get);
const mockDelete = vi.mocked(apiClient.delete);

// NOTE: content-service returns DTOs directly, NOT ApiEnvelope envelopes
// (see content.api.ts header comment). So we mock `{ data: payload }`.
const axiosResponse = <T>(data: T) => ({ data });

const makeCourse = (id: string) => ({
  id,
  instructorId: 'i-1',
  categoryId: null,
  title: `Course ${id}`,
  slug: `course-${id}`,
  shortDescription: null,
  description: null,
  thumbnailUrl: null,
  previewVideoUrl: null,
  price: 0,
  currency: 'VND',
  durationHours: 5,
  difficultyLevel: 1,
  language: 'vi',
  status: 'published' as const,
  reviewStatus: 'approved' as const,
  rejectionReason: null,
  publishedAt: '2024-01-01T00:00:00Z',
  stats: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
});

const makeEnrollment = (id: string, status: 'active' | 'completed' | 'cancelled' | 'expired') => ({
  id: `en-${id}`,
  courseId: `c-${id}`,
  userId: 'u-1',
  status,
  progressPercent: status === 'completed' ? 100 : 25,
  enrolledAt: '2024-01-01T00:00:00Z',
  completedAt: status === 'completed' ? '2024-02-01T00:00:00Z' : null,
  lastAccessedAt: '2024-02-01T00:00:00Z',
});

beforeEach(() => {
  mockGet.mockReset();
  mockDelete.mockReset();
});

// ---------------------------------------------------------------------------
// listMyEnrollments
// ---------------------------------------------------------------------------
describe('listMyEnrollments', () => {
  it('UT-ENROLL-001: should return an array of MyEnrollment entries with their enrollment statuses', async () => {
    const payload = [
      { enrollment: makeEnrollment('1', 'active'), course: makeCourse('1') },
      { enrollment: makeEnrollment('2', 'completed'), course: makeCourse('2') },
      { enrollment: makeEnrollment('3', 'cancelled'), course: makeCourse('3') },
    ];
    mockGet.mockResolvedValueOnce(axiosResponse(payload));

    const result = await listMyEnrollments();
    expect(result).toHaveLength(3);
    expect(result[0]?.enrollment.status).toBe('active');
    expect(result[1]?.enrollment.status).toBe('completed');
    expect(result[2]?.enrollment.status).toBe('cancelled');
  });

  it('UT-ENROLL-002: should reject with an Error on network failure (delegated to toApiError)', async () => {
    mockGet.mockRejectedValueOnce(new Error('Connection reset'));

    const call = listMyEnrollments();
    await expect(call).rejects.toBeInstanceOf(Error);
    await expect(call).rejects.toThrow('Connection reset');
  });
});

// ---------------------------------------------------------------------------
// cancelEnrollment
// ---------------------------------------------------------------------------
describe('cancelEnrollment', () => {
  it('UT-ENROLL-003: should DELETE /api/v1/courses/:id/enrollment and resolve with undefined on success', async () => {
    mockDelete.mockResolvedValueOnce({});

    await expect(cancelEnrollment('c-1')).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/courses/c-1/enrollment');
  });

  it('UT-ENROLL-004: should propagate an Error when the backend rejects the cancellation', async () => {
    mockDelete.mockRejectedValueOnce(new Error('Forbidden'));

    const call = cancelEnrollment('c-1');
    await expect(call).rejects.toBeInstanceOf(Error);
    await expect(call).rejects.toThrow('Forbidden');
  });
});

// ---------------------------------------------------------------------------
// getEnrollmentState (used by CourseDetail + CourseLearn; tested here because
// the "not enrolled" branch drives the Enrollment page's empty-state case).
// ---------------------------------------------------------------------------
describe('getEnrollmentState', () => {
  it('UT-ENROLL-005: should return the "not enrolled" view when the student has not joined the course', async () => {
    const state = {
      enrolled: false,
      enrollment: null,
      completedLessonIds: [],
    };
    mockGet.mockResolvedValueOnce(axiosResponse(state));

    const result = await getEnrollmentState('c-not-enrolled');
    expect(result.enrolled).toBe(false);
    expect(result.enrollment).toBeNull();
    expect(result.completedLessonIds).toEqual([]);
  });
});
