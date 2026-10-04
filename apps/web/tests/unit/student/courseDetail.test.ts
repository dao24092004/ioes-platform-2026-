/** Wave 2A — Unit: CourseDetailPage (student) data layer. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCourseDetail,
  getEnrollmentState,
  enroll,
  cancelEnrollment,
  listCategories,
} from '@/services/api/content.api';

vi.mock('@/config/api.config', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  toApiError: (err: unknown) => (err instanceof Error ? err : new Error(String(err))),
}));

import { apiClient } from '@/config/api.config';

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockDelete = vi.mocked(apiClient.delete);

// NOTE: content-service returns DTOs directly, NOT ApiEnvelope envelopes
// (see content.api.ts header comment). So the `body` wrapper extracts the
// axios `data` field and returns it as-is — we mock `{ data: payload }`.
const axiosResponse = <T>(data: T) => ({ data });

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockDelete.mockReset();
});

// ---------------------------------------------------------------------------
// getCourseDetail
// ---------------------------------------------------------------------------
describe('getCourseDetail', () => {
  it('UT-COURSEDETAIL-001: should call /api/v1/courses/:id/detail and return the detail object', async () => {
    const detail = {
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
      chapters: [
        {
          id: 'ch-1',
          courseId: 'c-1',
          title: 'Chapter 1',
          description: null,
          sortOrder: 1,
          isFree: null,
          lessons: [],
        },
      ],
    };
    mockGet.mockResolvedValueOnce(axiosResponse(detail));

    const result = await getCourseDetail('c-1');
    expect(result).toEqual(detail);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/courses/c-1/detail');
  });
});

// ---------------------------------------------------------------------------
// getEnrollmentState
// ---------------------------------------------------------------------------
describe('getEnrollmentState', () => {
  it('UT-COURSEDETAIL-002: should return the enrollment state for a course the user is enrolled in', async () => {
    const state = {
      enrolled: true,
      enrollment: {
        id: 'en-1',
        courseId: 'c-1',
        userId: 'u-1',
        status: 'active' as const,
        progressPercent: 30,
        enrolledAt: '2024-01-01T00:00:00Z',
        completedAt: null,
        lastAccessedAt: '2024-02-01T00:00:00Z',
      },
      completedLessonIds: ['l-1', 'l-2'],
    };
    mockGet.mockResolvedValueOnce(axiosResponse(state));

    const result = await getEnrollmentState('c-1');
    expect(result).toEqual(state);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/courses/c-1/enrollment');
  });
});

// ---------------------------------------------------------------------------
// enroll
// ---------------------------------------------------------------------------
describe('enroll', () => {
  it('UT-COURSEDETAIL-003: should POST to /api/v1/courses/:id/enrollment and return the new enrollment', async () => {
    const enrollment = {
      id: 'en-99',
      courseId: 'c-1',
      userId: 'u-1',
      status: 'active' as const,
      progressPercent: 0,
      enrolledAt: '2024-03-01T00:00:00Z',
      completedAt: null,
      lastAccessedAt: null,
    };
    mockPost.mockResolvedValueOnce(axiosResponse(enrollment));

    const result = await enroll('c-1');
    expect(result).toEqual(enrollment);
    expect(mockPost).toHaveBeenCalledWith('/api/v1/courses/c-1/enrollment');
  });
});

// ---------------------------------------------------------------------------
// cancelEnrollment
// ---------------------------------------------------------------------------
describe('cancelEnrollment', () => {
  it('UT-COURSEDETAIL-004: should DELETE /api/v1/courses/:id/enrollment and resolve with no value', async () => {
    mockDelete.mockResolvedValueOnce({});

    await expect(cancelEnrollment('c-1')).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/courses/c-1/enrollment');
  });
});

// ---------------------------------------------------------------------------
// listCategories
// ---------------------------------------------------------------------------
describe('listCategories', () => {
  it('UT-COURSEDETAIL-005: should GET /api/v1/categories and return the array of categories', async () => {
    const categories = [
      {
        id: 'cat-1',
        name: 'Programming',
        slug: 'programming',
        description: null,
        parentId: null,
        icon: null,
        sortOrder: 0,
      },
    ];
    mockGet.mockResolvedValueOnce(axiosResponse(categories));

    const result = await listCategories();
    expect(result).toEqual(categories);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/categories');
  });
});
