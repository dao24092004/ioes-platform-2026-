/** Wave 4 / subagent 2C — E2E: admin exam management page (/admin/exams) */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AdminExamManagementPage } from '../pages/admin/AdminExamManagementPage';

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
  timestamp: '2026-09-01T00:00:00Z',
});

const OVERVIEW = [
  {
    id: 'e-1',
    title: 'React giữa kỳ',
    courseId: 'abcdef12-3456-7890-abcd-ef1234567890',
    instructorId: '11112222-3333-4444-5555-666677778888',
    examType: 'graded',
    timeLimitMinutes: 45,
    passingScore: '70.00',
    participants: 12,
    gradedAttempts: 9,
    avgScore: '78.50',
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'e-2',
    title: 'Python luyện tập',
    courseId: null,
    instructorId: '11112222-3333-4444-5555-666677778888',
    examType: 'practice',
    timeLimitMinutes: null,
    passingScore: null,
    participants: 4,
    gradedAttempts: 0,
    avgScore: null,
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'e-3',
    title: 'Java chứng chỉ',
    courseId: '99998888-7777-6666-5555-444433332222',
    instructorId: 'aaaabbbb-cccc-dddd-eeee-ffff00001111',
    examType: 'certification',
    timeLimitMinutes: 90,
    passingScore: '80.00',
    participants: 7,
    gradedAttempts: 7,
    avgScore: '91.20',
    createdAt: '2026-09-01T00:00:00Z',
  },
];

const STATS = {
  totalExams: 3,
  totalAttempts: 23,
  inProgress: 2,
  awaitingGrading: 1,
  graded: 20,
  passed: 14,
  passRate: '67.90',
  avgScore: '72.25',
};

/**
 * Stub both admin exam reads in one handler.
 *
 * Matching on `pathname` (never a "star-star slash api star-star slash" glob)
 * is mandatory: a glob also matches Vite's module URLs and kills the bundle.
 */
async function stubExamEndpoints(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname.startsWith('/api/exams/admin/'),
    (route) => {
      const { pathname } = new URL(route.request().url());
      const data = pathname.endsWith('/stats') ? STATS : OVERVIEW;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(data)),
      });
    }
  );
}

/** Replay the gateway's real answer for the unregistered exam service. */
async function stubExamEndpointsAsGateway503(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname.startsWith('/api/exams/admin/'),
    (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Unable to find instance for exam-suite',
          timestamp: '2026-09-01T00:00:00Z',
        }),
      })
  );
}

test.describe('TC-ADMEXAMS-001: /admin/exams lists exams with stat cards, per-type tab counts, tab filtering and case-insensitive title search, and logs no console errors', () => {
  test('should render six stat cards, four type tabs with counts, three exam rows, and narrow the list by tab and by search', async ({
    page,
  }) => {
    test.skip(
      !adminEmail || !adminPassword,
      'missing env: TEST_ADMIN_EMAIL or TEST_ADMIN_PASSWORD'
    );

    await stubExamEndpoints(page);

    const errors = await catchConsoleErrors(page, async () => {
      const page_ = new AdminExamManagementPage(page);
      await page_.goto();
      await page_.expectLoaded();

      // Six stat cards, fed by /api/exams/admin/stats. percent() formats with
      // toFixed(1), so 72.25 renders as "72.3%".
      await page_.expectKpiCount(6);
      expect(await page_.kpiValue(0)).toBe('3');
      expect(await page_.kpiValue(1)).toBe('23');
      expect(await page_.kpiValue(2)).toBe('2');
      expect(await page_.kpiValue(3)).toBe('1');
      expect(await page_.kpiValue(4)).toBe('72.3%');
      expect(await page_.kpiValue(5)).toBe('67.9%');

      // Four type tabs: "all" plus the three ExamType values, each carrying
      // the count of the whole list.
      expect(await page_.tabCount(0)).toBe('3');
      expect(await page_.tabCount(1)).toBe('1');
      expect(await page_.tabCount(2)).toBe('1');
      expect(await page_.tabCount(3)).toBe('1');
      await page_.expectActiveTab(0);

      // One row per exam, with the ids truncated to eight characters and the
      // nullable columns falling back to the shared em dash.
      await page_.expectRowCount(3);
      const first = await page_.rowText(0);
      expect(first).toContain('React giữa kỳ');
      expect(first).toContain('abcdef12');
      expect(first).toContain('11112222');
      expect(first).toContain('78.5%');
      const second = await page_.rowText(1);
      expect(second).toContain('Python luyện tập');
      expect(second).toContain('—');

      // Narrow to the "graded" tab: only the first exam survives.
      await page_.clickTypeTab(2);
      await page_.expectRowCount(1);
      await page_.expectActiveTab(2);
      expect(await page_.rowText(0)).toContain('React giữa kỳ');

      // Back to "all", then search case-insensitively on the title.
      await page_.clickTypeTab(0);
      await page_.expectRowCount(3);
      await page_.searchFor('REACT');
      await page_.expectRowCount(1);
      expect(await page_.rowText(0)).toContain('React giữa kỳ');

      // A term that matches nothing leaves the empty row, and the table keeps
      // its seven columns.
      await page_.searchFor('khong-co-exam-nay');
      await page_.expectEmptyRow();
      await page_.expectRowCount(0);
    });

    expect(errors).toHaveLength(0);
  });
});

test.describe('TC-ADMEXAMS-002: /admin/exams shows the stats-error banner and the colSpan=7 table error row when both exam endpoints return the gateway 503', () => {
  test('should render the load-error banner, em-dash stat cards and one full-width error cell instead of rows', async ({
    page,
  }) => {
    test.skip(
      !adminEmail || !adminPassword,
      'missing env: TEST_ADMIN_EMAIL or TEST_ADMIN_PASSWORD'
    );

    // exam-suite is not registered with the gateway today, so this IS the real
    // production answer for /api/exams/admin/*. Asserting it is a BACKEND-gap
    // regression test, not an app-behaviour test.
    await stubExamEndpointsAsGateway503(page);

    const page_ = new AdminExamManagementPage(page);
    await page_.goto();
    await page_.expectLoaded();

    await page_.expectStatsError();
    // The stats query failed, so every card falls back to the em dash.
    await page_.expectKpiCount(6);
    expect(await page_.kpiValue(0)).toBe('—');
    expect(await page_.kpiValue(4)).toBe('—');

    // The list query failed too: one error cell spanning all seven columns,
    // and no exam rows.
    await page_.expectErrorRowSpanningSevenColumns();
    await page_.expectRowCount(0);
    // The empty row is a different state from the error row.
    await expect(page_.emptyRow).toHaveCount(0);

    // The search box and the tabs stay usable on top of the error state.
    await expect(page_.search).toBeEnabled();
    await page_.searchFor('react');
    await expect(page_.errorRow).toBeVisible();
  });
});
