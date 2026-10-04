/** Wave 3C — Unit: instructor-side exam API transport */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get, post } };
});

import { submitExam, getAdminOverview, getAdminStats, listExams } from '@/services/api/exam.api';
import { ApiError } from '@/config/api.config';

const ok = (data: unknown) => ({
  data: { success: true, message: 'ok', timestamp: '2026-10-04T00:00:00.000Z', data },
});

const adminRow = (over: Record<string, unknown> = {}) => ({
  id: 'e-1',
  title: 'Kiểm tra giữa kỳ',
  courseId: null,
  instructorId: 'i-1',
  examType: 'graded',
  timeLimitMinutes: 45,
  passingScore: null,
  participants: 12,
  gradedAttempts: 9,
  avgScore: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('UT-IEXAMS: submit + admin exam transport', () => {
  it('UT-IEXAMS-003: should post the answer list and the isAutoSubmit flag when an attempt is submitted', async () => {
    const answers = [
      { questionId: 'q1', selectedOptionIds: ['o-1'] },
      { questionId: 'q2', answerText: 'Hooks chỉ chạy ở cấp cao nhất' },
    ];
    post.mockResolvedValue(
      ok({ attemptId: 'att-1', submittedAt: '2026-09-02T00:00:00.000Z', autoSubmitted: true })
    );

    await expect(submitExam('e-1', answers, true)).resolves.toMatchObject({
      attemptId: 'att-1',
      autoSubmitted: true,
    });

    expect(post).toHaveBeenCalledWith('/api/exams/e-1/submissions', {
      answers,
      isAutoSubmit: true,
    });
  });

  it('UT-IEXAMS-004: should request the admin exam overview from the gateway overview path', async () => {
    get.mockResolvedValue(ok([adminRow()]));

    await expect(getAdminOverview()).resolves.toHaveLength(1);

    expect(get).toHaveBeenCalledWith('/api/exams/admin/overview');
  });

  it('UT-IEXAMS-005: should normalise the admin overview decimal columns when the backend returns them as strings', async () => {
    get.mockResolvedValue(ok([adminRow({ passingScore: '65.00', avgScore: '72.50' })]));

    await expect(getAdminOverview()).resolves.toEqual([
      expect.objectContaining({ passingScore: 65, avgScore: 72.5 }),
    ]);
  });

  it('UT-IEXAMS-006: should normalise the admin stats pass rate and average score columns', async () => {
    get.mockResolvedValue(
      ok({
        totalExams: 4,
        totalAttempts: 40,
        inProgress: 3,
        awaitingGrading: 2,
        graded: 35,
        passed: 28,
        passRate: '80.00',
        avgScore: '71.25',
      })
    );

    await expect(getAdminStats()).resolves.toEqual(
      expect.objectContaining({ passRate: 80, avgScore: 71.25 })
    );
  });

  it('UT-IEXAMS-007: should map a non-2xx response to an ApiError carrying the status and the backend message', async () => {
    // The instructor list page renders `common.loadError` off this rejection,
    // so the status and the message must survive the mapping.
    get.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 403'), {
        response: {
          status: 403,
          data: { success: false, message: 'Không có quyền xem đề thi', traceId: 'tr-403' },
        },
        isAxiosError: true,
      })
    );

    await expect(listExams()).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Không có quyền xem đề thi',
      status: 403,
      traceId: 'tr-403',
    });
  });

  it('UT-IEXAMS-008: should surface a missing data field as an ApiError when the envelope carries no payload', async () => {
    get.mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: '2026-10-04T00:00:00.000Z' },
    });

    const err = await listExams().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe('Phản hồi không có dữ liệu');
  });
});
