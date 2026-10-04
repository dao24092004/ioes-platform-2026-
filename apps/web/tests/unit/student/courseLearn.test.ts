/** Wave 2A — Unit: CourseLearnPage (student) data layer. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setLessonCompleted, listMyEnrollments } from '@/services/api/content.api';

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
const mockPut = vi.mocked(apiClient.put);

// NOTE: content-service returns DTOs directly, NOT ApiEnvelope envelopes
// (see content.api.ts header comment). The `body()` wrapper extracts the
// axios `data` field and returns it as-is — we mock `{ data: payload }`.
const axiosResponse = <T>(data: T) => ({ data });

beforeEach(() => {
  mockGet.mockReset();
  mockPut.mockReset();
});

// ---------------------------------------------------------------------------
// setLessonCompleted
// ---------------------------------------------------------------------------
describe('setLessonCompleted', () => {
  it('UT-LEARN-001: should PUT /api/v1/courses/:courseId/lessons/:lessonId/progress with { completed: true } when marking complete', async () => {
    const state = {
      enrolled: true,
      enrollment: null,
      completedLessonIds: ['l-1'],
    };
    mockPut.mockResolvedValueOnce(axiosResponse(state));

    const result = await setLessonCompleted('c-1', 'l-1', true);
    expect(result).toEqual(state);
    expect(mockPut).toHaveBeenCalledWith('/api/v1/courses/c-1/lessons/l-1/progress', {
      completed: true,
    });
  });

  it('UT-LEARN-002: should send { completed: false } when un-marking a lesson', async () => {
    const state = {
      enrolled: true,
      enrollment: null,
      completedLessonIds: [],
    };
    mockPut.mockResolvedValueOnce(axiosResponse(state));

    const result = await setLessonCompleted('c-1', 'l-1', false);
    expect(result.completedLessonIds).toEqual([]);
    expect(mockPut).toHaveBeenCalledWith('/api/v1/courses/c-1/lessons/l-1/progress', {
      completed: false,
    });
  });

  it('UT-LEARN-003: should encode both courseId and lessonId in the URL path', async () => {
    mockPut.mockResolvedValueOnce(
      axiosResponse({ enrolled: false, enrollment: null, completedLessonIds: [] })
    );

    await setLessonCompleted('c-42', 'l-99', true);

    const [url] = mockPut.mock.calls[0]!;
    expect(url).toBe('/api/v1/courses/c-42/lessons/l-99/progress');
  });

  it('UT-LEARN-004: should return the updated EnrollmentState from the response body', async () => {
    const state = {
      enrolled: true,
      enrollment: {
        id: 'en-1',
        courseId: 'c-1',
        userId: 'u-1',
        status: 'active' as const,
        progressPercent: 50,
        enrolledAt: '2024-01-01T00:00:00Z',
        completedAt: null,
        lastAccessedAt: '2024-02-01T00:00:00Z',
      },
      completedLessonIds: ['l-1', 'l-2', 'l-3'],
    };
    mockPut.mockResolvedValueOnce(axiosResponse(state));

    const result = await setLessonCompleted('c-1', 'l-3', true);
    expect(result.enrolled).toBe(true);
    expect(result.completedLessonIds).toEqual(['l-1', 'l-2', 'l-3']);
    expect(result.enrollment?.progressPercent).toBe(50);
  });

  it('UT-LEARN-005: should reject with an Error when the network call fails', async () => {
    mockPut.mockRejectedValueOnce(new Error('Network unreachable'));

    const call = setLessonCompleted('c-1', 'l-1', true);
    await expect(call).rejects.toBeInstanceOf(Error);
    await expect(call).rejects.toThrow('Network unreachable');
  });
});

// ---------------------------------------------------------------------------
// listMyEnrollments
// ---------------------------------------------------------------------------
describe('listMyEnrollments', () => {
  it('UT-LEARN-006: should GET /api/v1/courses/enrollments/me and return the MyEnrollment[] array', async () => {
    const payload = [
      {
        enrollment: {
          id: 'en-1',
          courseId: 'c-1',
          userId: 'u-1',
          status: 'active' as const,
          progressPercent: 25,
          enrolledAt: '2024-01-01T00:00:00Z',
          completedAt: null,
          lastAccessedAt: null,
        },
        course: {
          id: 'c-1',
          instructorId: 'i-1',
          categoryId: null,
          title: 'Course One',
          slug: 'course-one',
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
        },
      },
    ];
    mockGet.mockResolvedValueOnce(axiosResponse(payload));

    const result = await listMyEnrollments();
    expect(result).toEqual(payload);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/courses/enrollments/me');
  });

  it('UT-LEARN-007: should return an empty array when the user has no enrollments', async () => {
    mockGet.mockResolvedValueOnce(axiosResponse([]));

    const result = await listMyEnrollments();
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });
});
