/** Wave 4B (admin) — Integration: AnalyticsPage (`/admin/analytics`). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
  };
});

import AnalyticsPage from '@/pages/admin/AnalyticsPage';
import I18nProvider from '@/app/providers/I18nProvider';
import { ApiError, apiClient, type ApiEnvelope } from '@/config/api.config';
import type { AdminKpi, DailyCount } from '@/services/api/analytics.api';
import type { UserStats } from '@/services/api/users.api';
import { useAuthStore } from '@/app/store/authStore';

const envelope = <T,>(data: T): ApiEnvelope<T> => ({
  success: true,
  message: 'ok',
  data,
  timestamp: '2026-10-04T00:00:00.000Z',
});

/** Bilingual — the UI ships Vietnamese first, English after a language switch. */
const NO_DATA = /chưa có dữ liệu|no data yet/i;
const LOADING = /đang tải|loading/i;
const NO_SOURCE = /chưa có nguồn dữ liệu|no data source/i;
const LABELS = {
  activeUsers: /người dùng hoạt động|active users/i,
  trackedUsers: /người dùng được theo dõi|tracked users/i,
  courseEnrolls: /lượt ghi danh|enrollments/i,
  examSubmits: /bài thi nộp|exam submissions/i,
  passRate: /tỷ lệ đạt|pass rate/i,
  avgScore: /điểm trung bình|average score/i,
  range7d: /7 ngày qua|last 7 days/i,
  range30d: /30 ngày qua|last 30 days/i,
  range90d: /90 ngày qua|last 90 days/i,
  rangeYtd: /từ đầu năm|year to date/i,
} as const;

const EM_DASH = '—';

/**
 * `Number.prototype.toLocaleString` groups with the runtime's default locale,
 * which is `,` in Node and `.` in a `vi` runtime. The page calls it bare, so
 * the assertion accepts either separator instead of pinning a locale.
 */
const grouped = (n: number) =>
  new RegExp(
    n
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '[.,]')
      .replace('.', '\\.')
  );

const kpi = (over: Partial<AdminKpi> = {}): AdminKpi => ({
  trackedUsers: 120,
  activeUsers: 87,
  activeWithinDays: 30,
  examAttempts: 640,
  examsPassed: 512,
  examsFailed: 128,
  passRate: 80,
  avgScore: 7.25,
  courseEnrollments: 1234,
  courseCompletions: 96,
  studyMinutes: 12345,
  ...over,
});

const stats = (over: Partial<UserStats> = {}): UserStats => ({
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

const growth = (n: number): DailyCount[] =>
  Array.from({ length: n }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    value: i,
  }));

/** A flat series: max === min, which is exactly what `range || 1` guards. */
const flatGrowth = (n: number, value = 7): DailyCount[] =>
  Array.from({ length: n }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    value,
  }));

type Reply = { data: ApiEnvelope<unknown> } | Promise<{ data: ApiEnvelope<unknown> }>;

/** The number of days since 1 January, computed independently of the page. */
const dayOfYear = () => {
  const now = new Date();
  return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86_400_000) + 1;
};

/** Route the three reads to per-endpoint outcomes. */
const makeGet = (opts: { kpi?: () => Reply; growth?: () => Reply; stats?: () => Reply }) =>
  // `apiClient.get` is a generic axios method, so `mockImplementation` demands a
  // full `AxiosResponse`. These factories only ever need `.data` — the pages under
  // test read nothing else — so the cast is taken here, once, at the boundary.
  ((url: string, config?: { params?: Record<string, unknown> }) => {
    const u = String(url ?? '');
    if (u.includes('/admin/kpi')) {
      expect(config?.params).toEqual({ activeWithinDays: expect.any(Number) });
      return opts.kpi?.() ?? { data: envelope(kpi()) };
    }
    if (u.includes('/admin/user-growth')) {
      expect(config?.params).toEqual({ days: expect.any(Number) });
      return opts.growth?.() ?? { data: envelope(growth(3)) };
    }
    if (u.includes('/api/auth/users/stats')) return opts.stats?.() ?? { data: envelope(stats()) };
    throw new Error(`unexpected GET ${u}`);
  }) as unknown as typeof apiClient.get;

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/admin/analytics']}>
          <AnalyticsPage />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
};

const kpiCards = () => screen.getAllByTestId('analytics-kpi');
const rangeButtons = () => screen.getAllByTestId('analytics-range');

/** Collect the `activeWithinDays` / `days` param of every call to a path. */
const paramsFor = (needle: string) =>
  vi
    .mocked(apiClient.get)
    .mock.calls.filter(([url]) => String(url).includes(needle))
    .map(([, config]) => config?.params as Record<string, number>);

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'admin.ops@ioes.test',
      full_name: 'IOES Ops Admin',
      role: 'admin' as const,
      avatar_url: null,
    },
    accessToken: 'fake-access-token',
    refreshToken: 'fake-refresh-token',
    isAuthenticated: true,
    isLoading: false,
  });
  vi.mocked(apiClient.get).mockReset();
});

// ---------------------------------------------------------------------------
// IT-ADMANALYTICS-001 — KPI derivation and formatting
// ---------------------------------------------------------------------------
describe('IT-ADMANALYTICS-001: AnalyticsPage KPI cards', () => {
  it('IT-ADMANALYTICS-001: should show six em-dash placeholder cards while the KPI read is pending, then the six formatted values and the role donut total once it resolves', async () => {
    let releaseKpi: ((v: { data: ApiEnvelope<AdminKpi> }) => void) | undefined;
    vi.mocked(apiClient.get).mockImplementation(
      makeGet({
        kpi: () =>
          new Promise((resolve) => {
            releaseKpi = resolve;
          }),
        stats: () => ({ data: envelope(stats()) }),
        growth: () => ({ data: envelope([]) }),
      })
    );

    renderPage();

    // Six cards exist immediately; every value is the shared "none" em dash
    // until `kpi` is defined, never a fake 0.
    expect(kpiCards()).toHaveLength(6);
    for (const card of kpiCards()) expect(card).toHaveTextContent(EM_DASH);
    // The six labels, in the page's own order.
    expect(kpiCards().map((c) => c.textContent ?? '')).toEqual([
      expect.stringMatching(LABELS.activeUsers),
      expect.stringMatching(LABELS.trackedUsers),
      expect.stringMatching(LABELS.courseEnrolls),
      expect.stringMatching(LABELS.examSubmits),
      expect.stringMatching(LABELS.passRate),
      expect.stringMatching(LABELS.avgScore),
    ]);

    await act(async () => {
      releaseKpi?.({
        data: envelope(
          kpi({ activeUsers: 1234, courseEnrollments: 1234, examAttempts: 640, avgScore: 7.25 })
        ),
      });
    });

    await waitFor(() => expect(kpiCards()[0]).not.toHaveTextContent(new RegExp(EM_DASH, 'g')));
    // activeUsers and courseEnrollments are grouped (1,234 / 1.234).
    expect(kpiCards()[0]).toHaveTextContent(grouped(1234));
    // examAttempts is under 1000, so no separator at all.
    expect(kpiCards()[3]).toHaveTextContent('640');
    // passRate is rendered as a bare percentage string, not a number.
    expect(kpiCards()[4]).toHaveTextContent('80%');
    // avgScore goes through toLocaleString as a plain decimal.
    expect(kpiCards()[5]).toHaveTextContent(/7[.,]25/);

    // The role donut sums students + instructors + admins + superAdmins, and
    // the legend lists every one of the four roles.
    const roles = await screen.findByTestId('admin-analytics-roles');
    expect(within(roles).getByTestId('admin-analytics-roles-donut')).toBeInTheDocument();
    expect(roles).toHaveTextContent('430'); // students
    expect(roles).toHaveTextContent('60'); // instructors
    expect(roles).toHaveTextContent('8'); // admins
    expect(roles).toHaveTextContent('2'); // superAdmins
    // The donut centre shows total = 430 + 60 + 8 + 2 = 500.
    expect(within(roles).getByText('500')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// IT-ADMANALYTICS-002 — the date-range selector
// ---------------------------------------------------------------------------
describe('IT-ADMANALYTICS-002: AnalyticsPage date-range selector', () => {
  it('IT-ADMANALYTICS-002: should open on 30d, send activeWithinDays/days of 30, and on every range change refetch both windows with the mapped day count and clear the stale values while pending', async () => {
    const user = userEvent.setup();
    let release: ((v: { data: ApiEnvelope<AdminKpi> }) => void) | undefined;
    let hold = false;

    vi.mocked(apiClient.get).mockImplementation(
      makeGet({
        kpi: () =>
          hold
            ? new Promise((resolve) => {
                release = resolve;
              })
            : { data: envelope(kpi()) },
        growth: () => ({ data: envelope(growth(3)) }),
        stats: () => ({ data: envelope(stats()) }),
      })
    );

    renderPage();
    await waitFor(() => expect(kpiCards()[0]).toHaveTextContent('87'));

    // Four ranges, the 30d one checked, and the header badge reads "30D".
    expect(rangeButtons()).toHaveLength(4);
    expect(rangeButtons().map((b) => b.textContent ?? '')).toEqual([
      expect.stringMatching(LABELS.range7d),
      expect.stringMatching(LABELS.range30d),
      expect.stringMatching(LABELS.range90d),
      expect.stringMatching(LABELS.rangeYtd),
    ]);
    expect(rangeButtons()[1]).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('admin-analytics-range-label')).toHaveTextContent('30D');
    // Both windows are 30 on first paint.
    expect(paramsFor('/admin/kpi')[0]).toEqual({ activeWithinDays: 30 });
    expect(paramsFor('/admin/user-growth')[0]).toEqual({ days: 30 });

    // --- 7d: both reads refetch with 7, and the stale values clear. ---
    hold = true;
    await user.click(rangeButtons()[0]!);
    await waitFor(() => expect(paramsFor('/admin/kpi')).toHaveLength(2));
    expect(paramsFor('/admin/kpi')[1]).toEqual({ activeWithinDays: 7 });
    expect(paramsFor('/admin/user-growth')[1]).toEqual({ days: 7 });
    expect(rangeButtons()[0]).toHaveAttribute('aria-checked', 'true');
    expect(rangeButtons()[1]).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('admin-analytics-range-label')).toHaveTextContent('7D');
    // React Query has no `keepPreviousData` here, so the new key starts empty.
    expect(kpiCards()[0]).toHaveTextContent(EM_DASH);

    await act(async () => {
      release?.({ data: envelope(kpi({ activeUsers: 12 })) });
    });
    await waitFor(() => expect(kpiCards()[0]).toHaveTextContent('12'));

    // --- 90d ---
    hold = false;
    await user.click(rangeButtons()[2]!);
    await waitFor(() => expect(paramsFor('/admin/kpi')).toHaveLength(3));
    expect(paramsFor('/admin/kpi')[2]).toEqual({ activeWithinDays: 90 });
    expect(paramsFor('/admin/user-growth')[2]).toEqual({ days: 90 });
    expect(screen.getByTestId('admin-analytics-range-label')).toHaveTextContent('90D');

    // --- ytd: not a fixed constant, but the day-of-year. ---
    await user.click(rangeButtons()[3]!);
    await waitFor(() => expect(paramsFor('/admin/kpi')).toHaveLength(4));
    const ytd = dayOfYear();
    expect(ytd).toBeGreaterThanOrEqual(1);
    expect(ytd).toBeLessThanOrEqual(366);
    expect(paramsFor('/admin/kpi')[3]).toEqual({ activeWithinDays: ytd });
    expect(paramsFor('/admin/user-growth')[3]).toEqual({ days: ytd });
    expect(screen.getByTestId('admin-analytics-range-label')).toHaveTextContent('YTD');
  });
});

// ---------------------------------------------------------------------------
// IT-ADMANALYTICS-003 — chart data mapping: line + donut
// ---------------------------------------------------------------------------
describe('IT-ADMANALYTICS-003: AnalyticsPage chart data mapping', () => {
  it('IT-ADMANALYTICS-003: should show the loading box while the growth read is pending, the line chart with one marker per point for a 3-point series and every second point for a 16-point series, and a donut that drops zero-count roles', async () => {
    const user = userEvent.setup();
    let release: ((v: { data: ApiEnvelope<DailyCount[]> }) => void) | undefined;
    let hold = true;
    let points = 3;
    let flat = false;
    const series = () => (flat ? flatGrowth(points) : growth(points));

    vi.mocked(apiClient.get).mockImplementation(
      makeGet({
        kpi: () => ({ data: envelope(kpi()) }),
        growth: () =>
          hold
            ? new Promise((resolve) => {
                release = resolve;
              })
            : { data: envelope(series()) },
        stats: () => ({ data: envelope(stats({ superAdmins: 0 })) }),
      })
    );

    renderPage();

    // Pending: the growth panel shows the loading label, not the chart.
    const growthPanel = screen.getByTestId('admin-analytics-growth');
    expect(within(growthPanel).getByText(LOADING)).toBeInTheDocument();
    expect(screen.queryByTestId('admin-analytics-growth-line')).not.toBeInTheDocument();

    await act(async () => {
      hold = false;
      release?.({ data: envelope(growth(3)) });
    });

    const svg = await screen.findByTestId('admin-analytics-growth-line');
    // ceil(3/8) === 1, so `i % 1 === 0` marks every one of the 3 points.
    expect(svg.querySelectorAll('circle')).toHaveLength(3);
    // The line and its filled area are two <path> elements over those points.
    expect(svg.querySelectorAll('path')).toHaveLength(2);

    // Switch range so the growth query refetches, now with a 16-point FLAT
    // series: ceil(16/8) === 2, so only every second index is marked — 8
    // circles, not 16. That is the marker-density rule, not the data length.
    // Every value is equal here, so `max - min` is 0 and the `|| 1` guard is
    // what keeps the y coordinate finite instead of dividing by zero.
    points = 16;
    flat = true;
    await user.click(rangeButtons()[0]!);
    await waitFor(() =>
      expect(
        screen.getByTestId('admin-analytics-growth-line').querySelectorAll('circle')
      ).toHaveLength(8)
    );
    // A flat series is drawn along the top edge: y = 100 - ((7-7)/1)*100 = 100.
    const flatPoints = [
      ...screen.getByTestId('admin-analytics-growth-line').querySelectorAll('circle'),
    ];
    for (const point of flatPoints) expect(point.getAttribute('cy')).toBe('100');

    // A truly empty series takes the EmptyChart branch, not the chart.
    points = 0;
    await user.click(rangeButtons()[1]!);
    await waitFor(() =>
      expect(screen.queryByTestId('admin-analytics-growth-line')).not.toBeInTheDocument()
    );
    expect(
      within(screen.getByTestId('admin-analytics-growth')).getByText(NO_DATA)
    ).toBeInTheDocument();

    // The role donut filters out zero-count roles: superAdmins was 0, so the
    // legend keeps its row but the donut draws only 3 arcs.
    const donut = screen.getByTestId('admin-analytics-roles-donut');
    expect(donut.querySelectorAll('path')).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// IT-ADMANALYTICS-004 — the failure path and the four "no data source" panels
// ---------------------------------------------------------------------------
describe('IT-ADMANALYTICS-004: AnalyticsPage failure path and the un-sourced panels', () => {
  it('IT-ADMANALYTICS-004: should fall back to em-dash KPI cards, the no-data growth box and the empty role donut when all three reads fail, while the four panels with no endpoint keep their own copy', async () => {
    const down = () =>
      Promise.reject(new ApiError('Unable to find instance for analytics-suite', 503));
    vi.mocked(apiClient.get).mockImplementation(makeGet({ kpi: down, growth: down, stats: down }));

    renderPage();

    // The growth panel is the settling signal: it starts on "loading" and
    // flips to "no data" only once the failed read is no longer in flight.
    const growthPanel = screen.getByTestId('admin-analytics-growth');
    expect(within(growthPanel).getByText(LOADING)).toBeInTheDocument();
    expect(await within(growthPanel).findByText(NO_DATA)).toBeInTheDocument();

    // A failed KPI read leaves every card on the shared "none" em dash, never
    // a fake 0.
    for (const card of kpiCards()) expect(card).toHaveTextContent(EM_DASH);
    expect(screen.queryByTestId('admin-analytics-growth-line')).not.toBeInTheDocument();
    // The role donut is gone: rolesTotal is 0, so the panel is an EmptyChart.
    expect(screen.queryByTestId('admin-analytics-roles-donut')).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('admin-analytics-roles')).getByText(NO_DATA)
    ).toBeInTheDocument();

    // The four panels whose endpoints do not exist are ALWAYS empty, even on
    // the happy path — this is the documented state, not a failure.
    for (const id of [
      'admin-analytics-enrollments',
      'admin-analytics-exam-completion',
      'admin-analytics-pass-rate',
      'admin-analytics-top-courses',
    ]) {
      expect(within(screen.getByTestId(id)).getByText(NO_SOURCE)).toBeInTheDocument();
    }
  });
});
