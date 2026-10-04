/** Wave 4 / subagent 2C — Unit: admin exam management data layer */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import { examApi, type AdminExamRow, type AdminExamStats } from '@/services/api/exam.api';
import { ApiError, apiClient, type ApiEnvelope } from '@/config/api.config';

const TS = '2026-09-01T00:00:00.000Z';

const envelope = <T>(data: T): ApiEnvelope<T> => ({
  success: true,
  message: 'ok',
  data,
  timestamp: TS,
});

/** The gateway's actual answer when exam-suite has no instance registered. */
const NO_INSTANCE_503 = (service: string) =>
  ({
    isAxiosError: true,
    message: `Request failed with status code 503`,
    toJSON: () => ({}),
    name: 'AxiosError',
    response: {
      status: 503,
      data: {
        success: false,
        message: `Unable to find instance for ${service}`,
        timestamp: TS,
      },
    },
  }) as unknown as Error;

const overviewRow = (over: Partial<AdminExamRow>): AdminExamRow => ({
  id: 'e-1',
  title: 'React giữa kỳ',
  courseId: 'c-1',
  instructorId: 'i-1',
  examType: 'graded',
  timeLimitMinutes: 45,
  passingScore: 60,
  participants: 12,
  gradedAttempts: 9,
  avgScore: 78.5,
  createdAt: TS,
  ...over,
});

const stats = (over: Partial<AdminExamStats>): AdminExamStats => ({
  totalExams: 4,
  totalAttempts: 31,
  inProgress: 2,
  awaitingGrading: 1,
  graded: 28,
  passed: 19,
  passRate: 67.9,
  avgScore: 72.25,
  ...over,
});

const rows = (...data: AdminExamRow[]) => ({ data: envelope(data) });

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
});

describe('examApi.getAdminOverview', () => {
  it('UT-ADMEXAMS-001: should GET /api/exams/admin/overview', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(rows());

    await examApi.getAdminOverview();

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.get).mock.calls[0]![0]).toBe('/api/exams/admin/overview');
  });

  it('UT-ADMEXAMS-002: should return one row per exam carrying the id, title, type, participant and graded-attempt counts verbatim', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      rows(
        overviewRow({
          id: 'e-1',
          title: 'React giữa kỳ',
          examType: 'graded',
          participants: 12,
          gradedAttempts: 9,
        }),
        overviewRow({
          id: 'e-2',
          title: 'Python cuối kỳ',
          examType: 'practice',
          participants: 4,
          gradedAttempts: 0,
        })
      )
    );

    const result = await examApi.getAdminOverview();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'e-1',
      title: 'React giữa kỳ',
      examType: 'graded',
      participants: 12,
      gradedAttempts: 9,
    });
    expect(result[1]).toMatchObject({
      id: 'e-2',
      title: 'Python cuối kỳ',
      examType: 'practice',
      participants: 4,
      gradedAttempts: 0,
    });
  });

  it('UT-ADMEXAMS-003: should coerce the passingScore decimal string "70.00" to the number 70', async () => {
    // TypeORM hands pg `numeric` back as a string; without the coercion the
    // page would print "70.00" and arithmetic on it would concatenate.
    vi.mocked(apiClient.get).mockResolvedValue(
      rows(overviewRow({ passingScore: '70.00' as unknown as number }))
    );

    const [row] = await examApi.getAdminOverview();

    expect(row!.passingScore).toBe(70);
    expect(typeof row!.passingScore).toBe('number');
  });

  it('UT-ADMEXAMS-004: should coerce the avgScore decimal string "82.50" to the number 82.5 so the cell can call toFixed(1)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      rows(overviewRow({ avgScore: '82.50' as unknown as number }))
    );

    const [row] = await examApi.getAdminOverview();

    expect(row!.avgScore).toBe(82.5);
    expect(typeof row!.avgScore).toBe('number');
  });

  it('UT-ADMEXAMS-005: should keep a null passingScore and a null avgScore as null instead of turning them into 0', async () => {
    // 0 would render as "0.0%" in the avg-score cell; null is what makes the
    // page fall back to the shared em dash.
    vi.mocked(apiClient.get).mockResolvedValue(
      rows(overviewRow({ passingScore: null, avgScore: null }))
    );

    const [row] = await examApi.getAdminOverview();

    expect(row!.passingScore).toBeNull();
    expect(row!.avgScore).toBeNull();
  });

  it('UT-ADMEXAMS-006: should map an unparseable numeric string to null rather than propagating NaN', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      rows(
        overviewRow({
          avgScore: 'n/a' as unknown as number,
          passingScore: 'n/a' as unknown as number,
        })
      )
    );

    const [row] = await examApi.getAdminOverview();

    expect(row!.avgScore).toBeNull();
    expect(row!.passingScore).toBeNull();
  });

  it('UT-ADMEXAMS-007: should reject with ApiError 503 carrying the gateway message when exam-suite has no registered instance', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(NO_INSTANCE_503('exam-suite'));

    const err = await examApi.getAdminOverview().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 503, message: 'Unable to find instance for exam-suite' });
  });
});

describe('examApi.getAdminStats', () => {
  it('UT-ADMEXAMS-008: should GET /api/exams/admin/stats', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: envelope(stats({})) });

    await examApi.getAdminStats();

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.get).mock.calls[0]![0]).toBe('/api/exams/admin/stats');
  });

  it('UT-ADMEXAMS-009: should coerce the avgScore and passRate decimal strings to numbers', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: envelope(
        stats({
          avgScore: '72.25' as unknown as number,
          passRate: '67.90' as unknown as number,
        })
      ),
    });

    const result = await examApi.getAdminStats();

    expect(result.avgScore).toBe(72.25);
    expect(result.passRate).toBe(67.9);
    expect(typeof result.avgScore).toBe('number');
    expect(typeof result.passRate).toBe('number');
  });

  it('UT-ADMEXAMS-010: should keep a null avgScore and a null passRate as null so the two percent KPI cards can show the em dash', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: envelope(stats({ avgScore: null, passRate: null })),
    });

    const result = await examApi.getAdminStats();

    expect(result.avgScore).toBeNull();
    expect(result.passRate).toBeNull();
  });

  it('UT-ADMEXAMS-011: should reject with ApiError when the envelope reports success:false even though the HTTP status is 200', async () => {
    // `unwrap` refuses to trust the status code alone, and the gateway does
    // answer 200 + success:false on some error branches.
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: false,
        message: 'Unable to find instance for exam-suite',
        timestamp: TS,
      },
    });

    const err = await examApi.getAdminStats().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe('Unable to find instance for exam-suite');
  });

  it('UT-ADMEXAMS-012: should pass every ExamType through unchanged and keep the graded/passed counters the page does not display', async () => {
    const types = ['practice', 'graded', 'certification'] as const;
    vi.mocked(apiClient.get).mockResolvedValue(
      rows(
        ...types.map((examType, i) =>
          overviewRow({ id: `e-${i}`, examType, title: `Bài ${examType}` })
        )
      )
    );

    const result = await examApi.getAdminOverview();

    expect(result.map((r) => r.examType)).toEqual([...types]);

    vi.mocked(apiClient.get).mockResolvedValue({
      data: envelope(stats({ graded: 28, passed: 19 })),
    });
    const stat = await examApi.getAdminStats();
    // The page only renders six of the nine fields; dropping the rest here
    // would be a silent lossy mapping.
    expect(stat.graded).toBe(28);
    expect(stat.passed).toBe(19);
  });
});
