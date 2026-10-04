/** Wave 3A (instructor) — Unit: AnalyticsPage (`/instructor/analytics`). */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the HTTP boundary only. `unwrap`, `toApiError` and `ApiError` stay real.
vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import { apiClient } from '@/config/api.config';
import { examApi, type Exam, type GradingQueueItem } from '@/services/api/exam.api';

type Envelope<T> = { success: boolean; message: string; data: T; timestamp: string };

/** A real backend envelope, which is what exam-service returns. */
const envelope = <T>(data: T): Envelope<T> => ({
  success: true,
  message: 'ok',
  data,
  timestamp: '2026-10-04T00:00:00Z',
});

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

/** One row of `GET /exams` as the backend sends it. */
const exam = (over: Partial<Exam> = {}): Exam => ({
  id: 'e-1',
  courseId: 'c-1',
  instructorId: 'i-1',
  title: 'React Midterm',
  description: null,
  examType: 'graded',
  timeLimitMinutes: 45,
  passingScore: '60.5' as unknown as number,
  maxAttempts: 3,
  isRandomized: true,
  showResults: false,
  isProctored: true,
  metadata: {},
  createdAt: '2026-08-30T00:00:00Z',
  updatedAt: '2026-09-02T00:00:00Z',
  deletedAt: null,
  version: 1,
  ...over,
});

/** One row of `GET /exams/grading/queue`. */
const queueItem = (over: Partial<GradingQueueItem> = {}): GradingQueueItem => ({
  attemptId: 'att-1',
  examId: 'e-1',
  userId: 'u-1',
  submittedAt: '2026-10-01T00:00:00Z',
  waitingSeconds: 120,
  score: '8.5' as unknown as number,
  maxScore: '10' as unknown as number,
  ...over,
});

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
});

// ---------------------------------------------------------------------------
// examApi.listExams — the exam table on AnalyticsPage
// ---------------------------------------------------------------------------
describe('examApi.listExams — the exam table on AnalyticsPage', () => {
  it('UT-IANALYTICS-001: should read GET /api/exams and unwrap the envelope into an exam array', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: envelope([exam()]) });

    const rows = await examApi.listExams();

    expect(apiClient.get).toHaveBeenCalledWith('/api/exams');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(expect.objectContaining({ id: 'e-1', title: 'React Midterm' }));
  });

  it.each([
    { case: 'a string decimal from the numeric column', passingScore: '60.5', expected: 60.5 },
    { case: 'a null passing score on an unpublished exam', passingScore: null, expected: null },
  ])(
    'UT-IANALYTICS-002: should normalize $case into a number',
    async ({ passingScore, expected }) => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: envelope([exam({ passingScore: passingScore as unknown as number })]),
      });

      const [row] = await examApi.listExams();

      expect(row.passingScore).toBe(expected);
    }
  );

  it('UT-IANALYTICS-003: should reject with ApiError on 403 (caller is not an instructor)', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(httpError(403, 'Forbidden'));

    await expect(examApi.listExams()).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Forbidden',
    });
  });
});

// ---------------------------------------------------------------------------
// examApi.getGradingQueue — the per-exam pending count
// ---------------------------------------------------------------------------
describe('examApi.getGradingQueue — the per-exam pending count on AnalyticsPage', () => {
  it.each([
    { case: 'no argument (defaults to limit=50)', arg: undefined, expected: 50 },
    { case: 'an explicit limit=25', arg: 25, expected: 25 },
  ])(
    'UT-IANALYTICS-004: should request the grading queue with $case',
    async ({ arg, expected }) => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: envelope([]) });

      await examApi.getGradingQueue(arg);

      expect(apiClient.get).toHaveBeenCalledWith('/api/exams/grading/queue', {
        params: { limit: expected },
      });
    }
  );

  it.each([
    {
      case: 'a null score and a null maxScore on an ungraded attempt',
      score: null,
      maxScore: null,
      expectedScore: null,
      expectedMax: null,
    },
    {
      case: 'a non-numeric score',
      score: 'n/a',
      maxScore: 'n/a',
      expectedScore: null,
      expectedMax: null,
    },
  ])(
    'UT-IANALYTICS-005: should normalize grading-queue $case to null instead of NaN',
    async ({ score, maxScore, expectedScore, expectedMax }) => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: envelope([
          queueItem({ score: score as unknown as number, maxScore: maxScore as unknown as number }),
        ]),
      });

      const [row] = await examApi.getGradingQueue();

      expect(row.score).toBe(expectedScore);
      expect(row.maxScore).toBe(expectedMax);
    }
  );

  it('UT-IANALYTICS-006: should coerce a string decimal score into a real number', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: envelope([
        queueItem({ score: '8.5' as unknown as number, maxScore: '10' as unknown as number }),
      ]),
    });

    const [row] = await examApi.getGradingQueue();

    expect(row.score).toBe(8.5);
    expect(row.maxScore).toBe(10);
  });
});
