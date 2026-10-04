/** Wave 2A — Unit: CoursesPage (student) data layer. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listStudents } from '@/services/api/content.api';

// ---------------------------------------------------------------------------
// Mock the API boundary BEFORE importing the module under test.
// ---------------------------------------------------------------------------
vi.mock('@/config/api.config', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  toApiError: (err: unknown) => {
    if (err instanceof Error) return err;
    return new Error(String(err));
  },
}));

import { apiClient } from '@/config/api.config';

const mockGet = vi.mocked(apiClient.get);

// NOTE: content-service returns DTOs directly, NOT ApiEnvelope envelopes
// (see content.api.ts header comment). So `listStudents`'s `body` wrapper
// extracts the axios `data` field and returns it as-is.
const axiosResponse = <T>(data: T) => ({ data });

const fixtureStudent = (id: string, courseTitle: string) => ({
  enrollment: {
    id: `e-${id}`,
    courseId: `c-${id}`,
    userId: `u-${id}`,
    status: 'active' as const,
    progressPercent: 50,
    enrolledAt: '2024-01-01T00:00:00Z',
    completedAt: null,
    lastAccessedAt: '2024-02-01T00:00:00Z',
  },
  studentName: `Student ${id}`,
  studentEmail: `${id}@ioes.com`,
  courseTitle,
});

beforeEach(() => {
  mockGet.mockReset();
});

// ---------------------------------------------------------------------------
// listStudents
// ---------------------------------------------------------------------------
describe('listStudents', () => {
  it('UT-COURSES-001: should call apiClient.get on /api/v1/courses/students with courseId in query', async () => {
    mockGet.mockResolvedValueOnce(axiosResponse([fixtureStudent('1', 'React 101')]));

    await listStudents('c-99');

    expect(mockGet).toHaveBeenCalledTimes(1);
    const [url, config] = mockGet.mock.calls[0]!;
    expect(url).toBe('/api/v1/courses/students');
    expect((config as { params: { courseId: string } }).params.courseId).toBe('c-99');
  });

  it('UT-COURSES-002: should pass courseId as undefined in params when no id is provided (axios will omit it from the URL)', async () => {
    mockGet.mockResolvedValueOnce(axiosResponse([fixtureStudent('1', 'React 101')]));

    await listStudents();

    const [, config] = mockGet.mock.calls[0]!;
    const params = (config as { params: Record<string, unknown> }).params;
    // The implementation sets `params: { courseId }` with courseId = undefined.
    // axios serializes { courseId: undefined } as an absent URL param, so the
    // request hits `/api/v1/courses/students` (no `?courseId=`). We assert the
    // axios-level payload: courseId is `undefined`.
    expect(params.courseId).toBeUndefined();
  });

  it('UT-COURSES-003: should pass an empty-string courseId through unchanged (current implementation behavior)', async () => {
    mockGet.mockResolvedValueOnce(axiosResponse([]));

    await listStudents('');

    const [, config] = mockGet.mock.calls[0]!;
    const params = (config as { params: Record<string, unknown> }).params;
    // The implementation does NOT coerce `''` to `undefined`; an empty
    // string is passed to axios, which would serialise it as `?courseId=`.
    // This documents the current behavior so a future change is intentional.
    expect(params.courseId).toBe('');
  });

  it('UT-COURSES-004: should return the data array on a 200 response (content-service does not wrap in ApiEnvelope)', async () => {
    const payload = [fixtureStudent('1', 'Course A'), fixtureStudent('2', 'Course B')];
    mockGet.mockResolvedValueOnce(axiosResponse(payload));

    const result = await listStudents();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]?.courseTitle).toBe('Course A');
    expect(result[1]?.courseTitle).toBe('Course B');
  });

  it('UT-COURSES-005: should reject with an Error on network failure (delegated to toApiError)', async () => {
    mockGet.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const call = listStudents('c-1');
    await expect(call).rejects.toBeInstanceOf(Error);
    await expect(call).rejects.toThrow('ECONNREFUSED');
  });
});
