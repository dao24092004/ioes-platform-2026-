/** Wave 4B (admin) — Unit: AnalyticsPage (`/admin/analytics`) read layer. */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Replace ONLY the HTTP boundary; the envelope helpers stay real.
vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
  };
});

import { apiClient } from '@/config/api.config';
import { analyticsApi, type AdminKpi, type DailyCount } from '@/services/api/analytics.api';
import { usersApi, type UserStats } from '@/services/api/users.api';

type Envelope<T> = { success: boolean; message: string; data?: T; timestamp: string };

/** What analytics-service and auth-service actually put on the wire. */
const envelope = <T>(data: T): Envelope<T> => ({
  success: true,
  message: 'ok',
  data,
  timestamp: '2026-10-04T00:00:00Z',
});

/** A 200 whose envelope says `success: false` — the shape `unwrap` must reject. */
const softFailure = (message: string): Envelope<never> => ({
  success: false,
  message,
  timestamp: '2026-10-04T00:00:00Z',
});

/** A real axios HTTP failure carrying an `ApiResponse` body. */
const httpError = (status: number, message: string) => {
  const err = new Error(message) as Error & {
    isAxiosError: boolean;
    response: { status: number; data: { message: string; traceId: string } };
  };
  err.isAxiosError = true;
  err.response = { status, data: { message, traceId: 'trace-analytics' } };
  return err;
};

const kpi = (over: Partial<AdminKpi> = {}): AdminKpi => ({
  trackedUsers: 120,
  activeUsers: 87,
  activeWithinDays: 30,
  examAttempts: 640,
  examsPassed: 512,
  examsFailed: 128,
  passRate: 80,
  avgScore: 7.25,
  courseEnrollments: 431,
  courseCompletions: 96,
  studyMinutes: 12345,
  ...over,
});

const userStats = (over: Partial<UserStats> = {}): UserStats => ({
  total: 500,
  students: 430,
  instructors: 60,
  admins: 8,
  superAdmins: 2,
  suspended: 3,
  pending: 1,
  active: 496,
  ...over,
});

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
});

// ---------------------------------------------------------------------------
// analyticsApi.getAdminKpi — the six KPI cards
// ---------------------------------------------------------------------------
describe('analyticsApi.getAdminKpi — the six KPI cards on AnalyticsPage', () => {
  it('UT-ADMANALYTICS-001: should read GET /api/analytics/admin/kpi with activeWithinDays and unwrap the envelope', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: envelope(kpi()) });

    const result = await analyticsApi.getAdminKpi(90);

    expect(apiClient.get).toHaveBeenCalledWith('/api/analytics/admin/kpi', {
      params: { activeWithinDays: 90 },
    });
    expect(result).toEqual(
      expect.objectContaining({ activeUsers: 87, passRate: 80, avgScore: 7.25 })
    );
  });

  it('UT-ADMANALYTICS-002: should default the active-users window to 30 days when the page passes nothing', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: envelope(kpi()) });

    await analyticsApi.getAdminKpi();

    expect(apiClient.get).toHaveBeenCalledWith('/api/analytics/admin/kpi', {
      params: { activeWithinDays: 30 },
    });
  });

  it('UT-ADMANALYTICS-003: should turn a 403 into an ApiError carrying the backend message', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(httpError(403, 'Cần quyền admin'));

    await expect(analyticsApi.getAdminKpi(30)).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Cần quyền admin',
    });
  });

  it('UT-ADMANALYTICS-004: should reject on HTTP 200 with success:false, because unwrap checks the flag too', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: softFailure('Cửa sổ không hợp lệ') });

    await expect(analyticsApi.getAdminKpi(0)).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Cửa sổ không hợp lệ',
    });
  });
});

// ---------------------------------------------------------------------------
// analyticsApi.getUserGrowth — the user-growth line chart
// ---------------------------------------------------------------------------
describe('analyticsApi.getUserGrowth — the line chart on AnalyticsPage', () => {
  it.each([
    {
      id: 'UT-ADMANALYTICS-005',
      case: 'a populated series',
      series: [
        { date: '2026-10-01', value: 3 },
        { date: '2026-10-02', value: 5 },
      ] as DailyCount[],
    },
    {
      id: 'UT-ADMANALYTICS-007',
      case: 'an empty series',
      series: [] as DailyCount[],
    },
  ])(
    '$id: should read GET /api/analytics/admin/user-growth with days and unwrap $case verbatim',
    async ({ series }) => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: envelope(series) });

      const result = await analyticsApi.getUserGrowth(7);

      expect(apiClient.get).toHaveBeenCalledWith('/api/analytics/admin/user-growth', {
        params: { days: 7 },
      });
      // Returned as-is — never nulled — because the page branches on
      // `userGrowth && userGrowth.length > 0` to pick the chart or the empty box.
      expect(result).toEqual(series);
      expect(result).not.toBeNull();
    }
  );

  it('UT-ADMANALYTICS-006: should default the growth window to 30 days when the page passes nothing', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: envelope([]) });

    await analyticsApi.getUserGrowth();

    expect(apiClient.get).toHaveBeenCalledWith('/api/analytics/admin/user-growth', {
      params: { days: 30 },
    });
  });

  it('UT-ADMANALYTICS-008: should surface a 503 from an unregistered analytics instance as an ApiError', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      httpError(503, 'Unable to find instance for analytics-suite')
    );

    await expect(analyticsApi.getUserGrowth(30)).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      message: 'Unable to find instance for analytics-suite',
    });
  });
});

// ---------------------------------------------------------------------------
// usersApi.stats — the role-distribution donut
// ---------------------------------------------------------------------------
describe('usersApi.stats — the role-distribution donut on AnalyticsPage', () => {
  it('UT-ADMANALYTICS-009: should read GET /api/auth/users/stats and unwrap the role counts', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: envelope(userStats()) });

    const result = await usersApi.stats();

    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/users/stats');
    expect(result).toEqual(
      expect.objectContaining({
        students: 430,
        instructors: 60,
        admins: 8,
        superAdmins: 2,
      })
    );
  });

  it('UT-ADMANALYTICS-010: should surface a 403 when the caller is not an admin as an ApiError', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(httpError(403, 'Forbidden'));

    await expect(usersApi.stats()).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
    });
  });
});
