/** Wave 4B (admin) — E2E: /admin/analytics */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AdminAnalyticsPage } from '../pages/admin/AdminAnalyticsPage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDotenvOnce(file: string): void {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    const value = m[2].replace(/^['"]|['"]$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}
loadDotenvOnce(path.resolve(__dirname, '..', '..', '..', '.env'));
loadDotenvOnce(path.resolve(__dirname, '..', '..', '..', '..', '..', '.env'));

// The web-admin project depends on the setup project, which needs these. Read
// them WITHOUT ever printing them; the session itself comes from storageState.
const adminEmail = process.env.TEST_ADMIN_EMAIL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;

type ConsoleErrorListener = (msg: { type: () => string; text: () => string }) => void;

function catchConsoleErrors(page: Page, fn: () => Promise<void>): Promise<string[]> {
  const errors: string[] = [];
  const listener: ConsoleErrorListener = (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  };
  page.on('console', listener);
  return fn()
    .finally(() => page.off('console', listener))
    .then(() => errors);
}

const envelope = <T>(data: T) => ({
  success: true,
  message: 'ok',
  data,
  timestamp: '2026-10-04T00:00:00Z',
});

const KPI = {
  trackedUsers: 1200,
  activeUsers: 1234,
  activeWithinDays: 30,
  examAttempts: 640,
  examsPassed: 512,
  examsFailed: 128,
  passRate: 80,
  avgScore: 7.25,
  courseEnrollments: 4310,
  courseCompletions: 96,
  studyMinutes: 12345,
};

const STATS = {
  total: 500,
  students: 430,
  instructors: 60,
  admins: 8,
  superAdmins: 0, // zero-count roles are dropped from the donut
  suspended: 3,
  pending: 1,
  active: 496,
};

/** 16 points: ceil(16/8) === 2, so the chart marks every second index = 8 dots. */
const GROWTH_16 = Array.from({ length: 16 }, (_, i) => ({
  date: `2026-09-${String(i + 1).padStart(2, '0')}`,
  value: i + 1,
}));

/**
 * Stub the three reads, recording the `activeWithinDays` / `days` window the
 * page actually asks for on each request.
 */
async function stubAnalytics(
  page: Page,
  calls: { kpi: string[]; growth: string[] }
): Promise<void> {
  const json = (body: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

  await page.route(
    (url) => url.pathname === '/api/analytics/admin/kpi',
    (route) => {
      calls.kpi.push(new URL(route.request().url()).searchParams.get('activeWithinDays') ?? '');
      return route.fulfill(json(envelope(KPI)));
    }
  );

  await page.route(
    (url) => url.pathname === '/api/analytics/admin/user-growth',
    (route) => {
      calls.growth.push(new URL(route.request().url()).searchParams.get('days') ?? '');
      return route.fulfill(json(envelope(GROWTH_16)));
    }
  );

  await page.route(
    (url) => url.pathname === '/api/auth/users/stats',
    (route) => route.fulfill(json(envelope(STATS)))
  );
}

/** The number of days since 1 January, computed independently of the page. */
function dayOfYear(): number {
  const now = new Date();
  return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86_400_000) + 1;
}

test.describe('TC-ADMANALYTICS-001: /admin/analytics shows six KPI cards, a marker-dense growth line and a role donut, and refetches both windows on every range change', () => {
  test('should render the six formatted KPI values, draw 8 markers for a 16-point series, drop the zero-count super-admin arc, and send 7 / 90 / day-of-year windows as the range changes', async ({
    page,
  }) => {
    test.skip(
      !adminEmail || !adminPassword,
      'missing env: TEST_ADMIN_EMAIL or TEST_ADMIN_PASSWORD'
    );

    const calls = { kpi: [] as string[], growth: [] as string[] };
    await stubAnalytics(page, calls);

    const errors = await catchConsoleErrors(page, async () => {
      const analytics = new AdminAnalyticsPage(page);
      await analytics.goto();
      await analytics.expectLoaded();

      // First paint asks for the 30-day window on BOTH endpoints.
      expect(calls.kpi[0]).toBe('30');
      expect(calls.growth[0]).toBe('30');
      expect(await analytics.checkedRangeIndex()).toBe(1);
      await expect(analytics.rangeLabel).toHaveText('30D');

      // Six KPI cards, values grouped per the runtime locale (1,234 / 1.234).
      expect(await analytics.kpiText(0)).toMatch(/1[.,]234/);
      expect(await analytics.kpiText(1)).toMatch(/1[.,]200/);
      expect(await analytics.kpiText(2)).toMatch(/4[.,]310/);
      expect(await analytics.kpiText(3)).toMatch(/640/);
      // passRate is a bare percentage, avgScore a plain decimal.
      expect(await analytics.kpiText(4)).toMatch(/80%/);
      expect(await analytics.kpiText(5)).toMatch(/7[.,]25/);

      // 16 points, ceil(16/8) === 2 -> 8 markers, not 16.
      expect(await analytics.growthMarkerCount()).toBe(8);
      // The role donut draws an arc per NON-ZERO role: superAdmins is 0.
      expect(await analytics.roleArcCount()).toBe(3);
      await expect(analytics.rolesPanel).toContainText('430');

      // The four panels with no endpoint behind them always say so.
      await expect(analytics.noSourcePanels).toHaveCount(4);
      for (let i = 0; i < 4; i += 1) {
        await expect(analytics.noSourcePanels.nth(i)).toContainText(
          /chưa có nguồn dữ liệu|no data source/i
        );
      }

      // --- switch to 7d ---
      await analytics.selectRange(0);
      await expect(analytics.rangeLabel).toHaveText('7D');
      expect(calls.kpi.at(-1)).toBe('7');
      expect(calls.growth.at(-1)).toBe('7');
      expect(await analytics.checkedRangeIndex()).toBe(0);

      // --- switch to 90d ---
      await analytics.selectRange(2);
      await expect(analytics.rangeLabel).toHaveText('90D');
      expect(calls.kpi.at(-1)).toBe('90');
      expect(calls.growth.at(-1)).toBe('90');

      // --- switch to ytd: a day-of-year, not a fixed constant ---
      const ytd = String(dayOfYear());
      expect(Number(ytd)).toBeGreaterThanOrEqual(1);
      expect(Number(ytd)).toBeLessThanOrEqual(366);
      await analytics.selectRange(3);
      await expect(analytics.rangeLabel).toHaveText('YTD');
      expect(calls.kpi.at(-1)).toBe(ytd);
      expect(calls.growth.at(-1)).toBe(ytd);
    });

    expect(errors).toHaveLength(0);
  });
});
