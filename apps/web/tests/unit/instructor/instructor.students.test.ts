/** Wave 3A (instructor) — Unit: StudentsPage (`/instructor/students`). */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the HTTP boundary only. `unwrap`, `toApiError` and `ApiError` stay real.
vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import { ApiError } from '@/config/api.config';
import { apiClient } from '@/config/api.config';
import { contentApi } from '@/services/api/content.api';

/** Minimal rejection shaped like an axios HTTP error with an ApiResponse body. */
const httpError = (status: number, message: string) => {
  const err = new Error(message) as Error & {
    isAxiosError: boolean;
    response: { status: number; data: { message: string; traceId: string } };
  };
  err.isAxiosError = true;
  err.response = { status, data: { message, traceId: 'trace-abc' } };
  return err;
};

/** The query params the service actually put on the wire. */
const paramsOf = (call: number): Record<string, unknown> => {
  const cfg = vi.mocked(apiClient.get).mock.calls[call]?.[1] as
    { params?: Record<string, unknown> } | undefined;
  return cfg?.params ?? {};
};

const emptyPage = { data: [], meta: { total: 0, page: 1, perPage: 100, totalPages: 0 } };

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
});

// ---------------------------------------------------------------------------
// contentApi.listStudents — GET /api/v1/courses/students
// ---------------------------------------------------------------------------
describe('contentApi.listStudents — the table read behind StudentsPage', () => {
  it.each([
    { case: 'no argument (the "all courses" option)', arg: undefined, expected: undefined },
    { case: 'an empty-string courseId (the <select> reset to "")', arg: '', expected: '' },
    { case: 'a selected courseId', arg: 'c-42', expected: 'c-42' },
  ])(
    'UT-STUDENTS-001: should send $case as the courseId query param',
    async ({ arg, expected }) => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

      await contentApi.listStudents(arg);

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/courses/students', {
        params: { courseId: expected },
      });
    }
  );

  it('UT-STUDENTS-002: should return the bare array because content-service does not wrap in ApiEnvelope', async () => {
    const rows = [
      {
        enrollment: {
          id: 'en-1',
          courseId: 'c-1',
          userId: 'u-1',
          status: 'completed' as const,
          progressPercent: 100,
          enrolledAt: '2026-01-02T00:00:00Z',
          completedAt: '2026-02-01T00:00:00Z',
          lastAccessedAt: null,
        },
        studentName: 'Nguyen Van A',
        studentEmail: 'a@ioes.com',
        courseTitle: 'React',
      },
    ];
    vi.mocked(apiClient.get).mockResolvedValue({ data: rows });

    await expect(contentApi.listStudents()).resolves.toEqual(rows);
  });

  it('UT-STUDENTS-003: should reject with ApiError carrying status and backend message on 403', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(httpError(403, 'Forbidden'));

    await expect(contentApi.listStudents()).rejects.toThrowError(ApiError);
    await expect(contentApi.listStudents()).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Forbidden',
    });
  });

  it('UT-STUDENTS-004: should resolve an empty list unchanged (drives the StudentsPage empty state)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

    await expect(contentApi.listStudents()).resolves.toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// contentApi.listCourses — GET /api/v1/courses (the <select> options)
// ---------------------------------------------------------------------------
describe('contentApi.listCourses — the course filter options on StudentsPage', () => {
  it('UT-STUDENTS-005: should send mine=true and rename perPage to per_page for the select options', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: emptyPage });

    await contentApi.listCourses({ mine: true, perPage: 100 });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/courses', {
      params: expect.objectContaining({ mine: true, per_page: 100 }),
    });
    // The camelCase name must never reach the backend.
    expect(paramsOf(0)).not.toHaveProperty('perPage');
  });

  it('UT-STUDENTS-006: should omit `mine` when it is false so every course is returned', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: emptyPage });

    await contentApi.listCourses({ mine: false });

    expect(paramsOf(0).mine).toBeUndefined();
  });
});
