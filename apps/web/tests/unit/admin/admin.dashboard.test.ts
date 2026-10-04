/** Wave 4A (admin) — Unit: AdminDashboardPage (`/admin`). */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import { ApiError, apiClient } from '@/config/api.config';
import { analyticsApi, type AdminKpi } from '@/services/api/analytics.api';
import { usersApi, type PagedUsers, type UserStats } from '@/services/api/users.api';

const TS = '2026-10-04T00:00:00Z';

const httpError = (status: number, message: string, traceId?: string) => {
  const err = new Error(message) as Error & {
    isAxiosError: boolean;
    response: { status: number; data: { message: string; traceId?: string } };
  };
  err.isAxiosError = true;
  err.response = { status, data: { message, traceId } };
  return err;
};

const adminKpi = (over: Partial<AdminKpi> = {}): AdminKpi => ({
  trackedUsers: 18,
  activeUsers: 12,
  activeWithinDays: 30,
  examAttempts: 340,
  examsPassed: 250,
  examsFailed: 90,
  passRate: 73.5,
  avgScore: 7.4,
  courseEnrollments: 96,
  courseCompletions: 40,
  studyMinutes: 12_500,
  ...over,
});

const userStats = (over: Partial<UserStats> = {}): UserStats => ({
  total: 18,
  students: 10,
  instructors: 5,
  admins: 2,
  superAdmins: 1,
  suspended: 2,
  pending: 1,
  active: 15,
  ...over,
});

const pagedUsers = (): PagedUsers => ({
  data: [],
  meta: { total: 0, page: 1, perPage: 4, totalPages: 1 },
});

const ok = <T>(data: T) => ({ data: { success: true, message: 'ok', data, timestamp: TS } });
const softFail = (message: string) => ({
  data: { success: false, message, data: null, timestamp: TS, traceId: 'trace-soft' },
});

const paramsOf = (call: number): Record<string, unknown> => {
  const cfg = vi.mocked(apiClient.get).mock.calls[call]?.[1] as
    { params?: Record<string, unknown> } | undefined;
  return cfg?.params ?? {};
};

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
  vi.mocked(apiClient.patch).mockReset();
  vi.mocked(apiClient.delete).mockReset();
});

// ---------------------------------------------------------------------------
// analyticsApi.getAdminKpi — GET /api/analytics/admin/kpi
// ---------------------------------------------------------------------------
describe('analyticsApi.getAdminKpi — the read behind the three analytics KPI cards', () => {
  it('UT-ADMDASH-001: should GET /api/analytics/admin/kpi with the 30-day window and unwrap the AdminKpi record', async () => {
    const kpi = adminKpi();
    vi.mocked(apiClient.get).mockResolvedValue(ok(kpi));

    // AdminDashboardPage.tsx:12 pins ACTIVE_WINDOW_DAYS = 30.
    await expect(analyticsApi.getAdminKpi(30)).resolves.toEqual(kpi);
    expect(apiClient.get).toHaveBeenCalledWith('/api/analytics/admin/kpi', {
      params: { activeWithinDays: 30 },
    });
  });

  it('UT-ADMDASH-002: should default activeWithinDays to 30 when the caller passes no window', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(ok(adminKpi()));

    await analyticsApi.getAdminKpi();

    expect(paramsOf(0).activeWithinDays).toBe(30);
  });

  it('UT-ADMDASH-003: should not repeat the /analytics segment, because the gateway strips exactly one path element', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(ok(adminKpi()));

    await analyticsApi.getAdminKpi(30);

    // `/api/analytics/analytics/admin/kpi` would 404 at the service.
    expect(apiClient.get).toHaveBeenCalledWith('/api/analytics/admin/kpi', expect.anything());
  });

  it('UT-ADMDASH-004: should pass passRate through as the raw 0..100 number so the page can append its own % sign', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(ok(adminKpi({ passRate: 87.5 })));

    const kpi = await analyticsApi.getAdminKpi(30);

    // AdminDashboardPage.tsx:71 renders `${kpi.passRate}%` — a pre-scaled value
    // would render "8750%".
    expect(kpi.passRate).toBe(87.5);
    expect(`${kpi.passRate}%`).toBe('87.5%');
  });

  it('UT-ADMDASH-005: should resolve an all-zero KPI unchanged for a brand-new platform, instead of reporting it as a failure', async () => {
    const zero = adminKpi({
      trackedUsers: 0,
      activeUsers: 0,
      examAttempts: 0,
      examsPassed: 0,
      examsFailed: 0,
      passRate: 0,
      avgScore: 0,
      courseEnrollments: 0,
      courseCompletions: 0,
      studyMinutes: 0,
    });
    vi.mocked(apiClient.get).mockResolvedValue(ok(zero));

    await expect(analyticsApi.getAdminKpi(30)).resolves.toEqual(zero);
  });

  it('UT-ADMDASH-006: should reject with ApiError(403) when a non-admin caller hits the admin-only KPI endpoint', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(httpError(403, 'Forbidden', 'trace-403'));

    await expect(analyticsApi.getAdminKpi(30)).rejects.toThrowError(ApiError);
    await expect(analyticsApi.getAdminKpi(30)).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Forbidden',
      traceId: 'trace-403',
    });
  });

  it('UT-ADMDASH-007: should reject when the KPI read answers HTTP 200 with success=false', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(softFail('Không đủ quyền xem số liệu'));

    // The dashboard has no isError branch for the KPI query, so this surfaces
    // as the `shared.none` placeholder on the three analytics cards.
    await expect(analyticsApi.getAdminKpi(30)).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Không đủ quyền xem số liệu',
    });
  });
});

// ---------------------------------------------------------------------------
// usersApi.stats + usersApi.list — the shared auth-service reads
// ---------------------------------------------------------------------------
describe('usersApi reads shared with AdminDashboardPage', () => {
  it('UT-ADMDASH-008: should request the four newest users with sort=newest and send no search, role or status key so the backend applies no filter', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(ok(pagedUsers()));

    // AdminDashboardPage.tsx:29 — `usersApi.list({ page: 1, perPage: 4, sort: 'newest' })`.
    await usersApi.list({ page: 1, perPage: 4, sort: 'newest' });

    expect(paramsOf(0)).toEqual({ page: 1, sort: 'newest', per_page: 4 });
    expect(paramsOf(0)).not.toHaveProperty('search');
    expect(paramsOf(0)).not.toHaveProperty('role');
    expect(paramsOf(0)).not.toHaveProperty('status');
  });

  it('UT-ADMDASH-009: should unwrap two different envelope shapes — a flat UserStats for the KPI card and a {data,meta} page for the table', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce(ok(userStats({ total: 18 })));
    await expect(usersApi.stats()).resolves.toMatchObject({ total: 18, active: 15 });

    const paged = {
      data: [
        {
          id: 'u-1',
          email: 'a@ioes.com',
          fullName: 'Nguyen Van A',
          avatarUrl: null,
          phone: null,
          bio: null,
          role: 'student' as const,
          status: 'active' as const,
          emailVerified: true,
          mfaEnabled: false,
          lastLoginAt: null,
          lastLoginIp: null,
          createdAt: '2026-09-30T00:00:00Z',
          updatedAt: '2026-09-30T00:00:00Z',
          deletedAt: null,
        },
      ],
      meta: { total: 18, page: 1, perPage: 4, totalPages: 5 },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce(ok(paged));

    const page = await usersApi.list({ page: 1, perPage: 4, sort: 'newest' });
    // `?? []` on the page means a missing `data` would silently render nothing;
    // the unwrapped shape must keep both halves.
    expect(page.data).toHaveLength(1);
    expect(page.meta).toEqual({ total: 18, page: 1, perPage: 4, totalPages: 5 });
  });
});
