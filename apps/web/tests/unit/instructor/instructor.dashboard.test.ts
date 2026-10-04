/** Wave 3A (instructor) — Unit: DashboardPage (`/instructor`). */
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
import { analyticsApi, type LeaderboardEntry } from '@/services/api/analytics.api';
import { examApi } from '@/services/api/exam.api';

type Envelope<T> = { success: boolean; message: string; data: T; timestamp: string };

/** A real backend envelope, which is what analytics/exam-service return. */
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

/** One full leaderboard row, shaped exactly like `LeaderboardEntryResponse`. */
const leaderboardEntry = (over: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
  userId: 'u-1',
  displayName: 'Nguyen Van A',
  avatarUrl: null,
  score: 98,
  rank: 1,
  rankDelta: 2,
  period: 'WEEKLY',
  examsCompleted: 7,
  avgExamScore: 88,
  currentStreak: 4,
  longestStreak: 9,
  coursesCompleted: 2,
  lastActivityAt: null,
  ...over,
});

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
});

// ---------------------------------------------------------------------------
// analyticsApi.getLeaderboard — the "Top học viên" card
// ---------------------------------------------------------------------------
describe('analyticsApi.getLeaderboard — the Top students card on DashboardPage', () => {
  it.each([
    {
      case: 'the defaults WEEKLY / 10',
      period: undefined,
      limit: undefined,
      expected: { period: 'WEEKLY', limit: 10 },
    },
    {
      case: 'the DashboardPage call WEEKLY / 5',
      period: 'WEEKLY' as const,
      limit: 5,
      expected: { period: 'WEEKLY', limit: 5 },
    },
    {
      case: 'ALL_TIME / 50',
      period: 'ALL_TIME' as const,
      limit: 50,
      expected: { period: 'ALL_TIME', limit: 50 },
    },
  ])(
    'UT-INSTRDASH-001: should request /api/analytics/leaderboard with $case',
    async ({ period, limit, expected }) => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: envelope([]) });

      await analyticsApi.getLeaderboard(period, limit);

      expect(apiClient.get).toHaveBeenCalledWith('/api/analytics/leaderboard', {
        params: expected,
      });
    }
  );

  it('UT-INSTRDASH-002: should unwrap ApiEnvelope.data into the leaderboard array', async () => {
    const entries = [leaderboardEntry()];
    vi.mocked(apiClient.get).mockResolvedValue({ data: envelope(entries) });

    await expect(analyticsApi.getLeaderboard('WEEKLY', 5)).resolves.toEqual(entries);
  });

  it('UT-INSTRDASH-003: should reject with ApiError carrying the message when the envelope has success:false', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: false, message: 'Forbidden', timestamp: '2026-10-04T00:00:00Z' },
    });

    await expect(analyticsApi.getLeaderboard()).rejects.toThrowError(ApiError);
    await expect(analyticsApi.getLeaderboard()).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Forbidden',
    });
  });

  it('UT-INSTRDASH-004: should reject when the envelope omits `data` even on success:true', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: '2026-10-04T00:00:00Z' },
    });

    await expect(analyticsApi.getLeaderboard()).rejects.toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// examApi.getGradingStats — the pending / graded KPI cards
// ---------------------------------------------------------------------------
describe('examApi.getGradingStats — the pending/graded KPI cards on DashboardPage', () => {
  it('UT-INSTRDASH-005: should read /api/exams/grading/stats and unwrap pending, graded and oldestPendingSubmittedAt', async () => {
    const stats = {
      pending: 4,
      graded: 21,
      oldestPendingSubmittedAt: '2026-09-01T00:00:00Z',
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: envelope(stats) });

    await expect(examApi.getGradingStats()).resolves.toEqual(stats);
    expect(apiClient.get).toHaveBeenCalledWith('/api/exams/grading/stats');
  });

  it('UT-INSTRDASH-006: should reject with ApiError carrying status 403 when the token is not an instructor', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(httpError(403, 'Forbidden'));

    await expect(examApi.getGradingStats()).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Forbidden',
    });
  });
});
