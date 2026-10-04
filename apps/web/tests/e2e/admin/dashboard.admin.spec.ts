/** Wave 4A (admin) — E2E: admin dashboard (`/admin`). */
import { test, expect, type Page } from '@playwright/test';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';

const TS = '2026-10-04T00:00:00Z';

const envelope = <T>(data: T) => ({ success: true, message: 'ok', data, timestamp: TS });

const json = (data: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(envelope(data)),
});

const user = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  email: `${id}@ioes.test`,
  fullName: `Dash ${id}`,
  avatarUrl: null as string | null,
  phone: null as string | null,
  bio: null as string | null,
  role: 'student',
  status: 'active',
  emailVerified: true,
  mfaEnabled: false,
  lastLoginAt: '2026-09-30T08:15:00Z',
  lastLoginIp: '10.0.0.9',
  createdAt: '2026-01-05T00:00:00Z',
  updatedAt: '2026-01-05T00:00:00Z',
  deletedAt: null,
  ...over,
});

/** total=1234 so the `toLocaleString()` grouping separator is observable. */
const userStats = {
  total: 1234,
  students: 900,
  instructors: 300,
  admins: 30,
  superAdmins: 4,
  suspended: 12,
  pending: 5,
  active: 1200,
};

const kpi = {
  trackedUsers: 900,
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
};

/** Exactly four rows: the page asks for perPage=4. */
const recent = [
  user('dash-01', { fullName: 'Nguyen Van A', role: 'super_admin', status: 'active' }),
  user('dash-02', {
    fullName: 'Tran Thi B',
    role: 'instructor',
    status: 'suspended',
    avatarUrl: '/e2e-dash-avatar.svg',
  }),
  user('dash-03', { fullName: 'Le Van C', role: 'student', status: 'pending' }),
  user('dash-04', { fullName: 'Pham Thi D', role: 'student', status: 'active' }),
];

const recentPage = {
  data: recent,
  meta: { total: 4, page: 1, perPage: 4, totalPages: 1 },
};

/** The dashboard's three reads. Exact pathname matching, no globs. */
async function mockReads(page: Page): Promise<URLSearchParams[]> {
  const listCalls: URLSearchParams[] = [];
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (u.pathname === '/api/auth/users') listCalls.push(u.searchParams);
  });

  await page.route(
    (url) => url.pathname === '/api/auth/users/stats',
    (route) => route.fulfill(json(userStats))
  );
  await page.route(
    (url) => url.pathname === '/api/analytics/admin/kpi',
    (route) => route.fulfill(json(kpi))
  );
  await page.route(
    (url) => url.pathname === '/api/auth/users',
    (route) => route.fulfill(json(recentPage))
  );
  return listCalls;
}

test.describe('TC-ADMDASH-001: /admin renders the four KPI cards, the newest users, the quick actions and the two no-data-source panels', () => {
  test('should render four locale-formatted KPI cards, four recent-user rows with role/status badges, and every link with its documented href', async ({
    page,
  }) => {
    const listCalls = await mockReads(page);

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // One recent row has an avatarUrl; fulfil it so the <img> branch is
    // covered without a real network fetch.
    await page.route(
      (url) => url.pathname === '/e2e-dash-avatar.svg',
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg"/>',
        })
    );

    const dash = new AdminDashboardPage(page);
    await dash.goto();
    await dash.expectKpiCards();
    await dash.expectRecentRowCount(4);

    // The recent-users read asks for the four newest with no filter applied.
    expect(listCalls).not.toHaveLength(0);
    expect(listCalls[0]!.get('per_page')).toBe('4');
    expect(listCalls[0]!.get('sort')).toBe('newest');
    expect(listCalls[0]!.get('page')).toBe('1');
    expect(listCalls[0]!.has('role')).toBe(false);
    expect(listCalls[0]!.has('status')).toBe(false);

    // Card 0 groups the thousands separator, cards 1-2 are plain counts and
    // card 3 is the raw 0..100 pass rate with the page's own % sign. The
    // separator character itself is locale-dependent, so only its presence
    // is asserted.
    await expect(dash.statValue(0)).toHaveText(/^1\D234$/);
    await expect(dash.statValue(1)).toHaveText('12');
    await expect(dash.statValue(2)).toHaveText('340');
    await expect(dash.statValue(3)).toHaveText('73.5%');

    // Bilingual labels so the assertions survive a language switch.
    await expect(dash.statLabel(0)).toHaveText(/^(Người dùng|Users)$/);
    await expect(dash.statLabel(1)).toHaveText(/^(Người dùng hoạt động|Active users)$/);
    await expect(dash.statLabel(2)).toHaveText(/^(Bài thi nộp|Exam submissions)$/);
    await expect(dash.statLabel(3)).toHaveText(/^(Tỷ lệ đạt|Pass rate)$/);

    // Recent users: the role and status badge of one row each, scoped to the
    // row so a repeated label on another row cannot satisfy the assertion.
    await expect(dash.recentRow('dash-01').getByText('Super Admin')).toBeVisible();
    await expect(dash.recentRow('dash-02').getByText(/^Giảng viên$|^Instructor$/)).toBeVisible();
    await expect(dash.recentRow('dash-03').getByText(/^Học viên$|^Student$/)).toBeVisible();
    await expect(dash.recentRow('dash-02').getByText(/^Tạm khóa$|^Suspended$/)).toBeVisible();
    await expect(dash.recentRow('dash-03').getByText(/^Chờ duyệt$|^Pending$/)).toBeVisible();
    await expect(dash.recentRow('dash-04').getByText(/^Đang hoạt động$|^Active$/)).toBeVisible();
    // A super_admin row must not also carry a student or instructor badge.
    await expect(dash.recentRow('dash-01').getByText(/^Học viên$|^Student$/)).toHaveCount(0);

    // LOCKED LOGIC (getInitials, AdminDashboardPage.tsx:41): the first two
    // whitespace-separated words of "Nguyen Van A" give "NV"; the third word
    // is sliced off. The row with an avatarUrl has no initials tile at all.
    await expect(dash.initials('dash-01')).toHaveText('NV');
    await expect(dash.initials('dash-02')).toHaveCount(0);
    await expect(dash.avatar('dash-02')).toBeVisible();

    // The joined column is the page's own toLocaleDateString('vi-VN'), so the
    // d/M/yyyy shape is asserted without pinning the timezone offset.
    await expect(dash.joinedCell('dash-01')).toHaveText(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    await expect(dash.recentIdentity('dash-01')).toContainText('dash-01@ioes.test');

    await dash.expectNoDataSourcePanels();
    await expect(dash.viewAllLink).toHaveAttribute('href', '/admin/users');
    for (const id of ['dash-01', 'dash-02', 'dash-03', 'dash-04']) {
      await expect(dash.recentRowLink(id)).toHaveAttribute('href', '/admin/users');
    }

    // Quick actions: the four documented hrefs, in order. Two of them point at
    // the same course-approval route because the page has no dedicated exam
    // approval destination yet.
    await expect(dash.quickActionLinks).toHaveCount(4);
    const hrefs = await dash.quickActionLinks.evaluateAll((els) =>
      els.map((e) => e.getAttribute('href'))
    );
    expect(hrefs).toEqual([
      '/admin/users',
      '/admin/courses/approval',
      '/admin/courses/approval',
      '/admin',
    ]);
    await expect(dash.quickAction(/thêm người dùng|add user/i)).toHaveAttribute(
      'href',
      '/admin/users'
    );
    await expect(dash.quickAction(/duyệt bài thi|review exams/i)).toHaveAttribute(
      'href',
      '/admin/courses/approval'
    );
    await expect(dash.quickAction(/triển khai token|deploy token/i)).toHaveAttribute(
      'href',
      '/admin'
    );

    expect(errors, 'console errors').toHaveLength(0);
  });
});

test.describe('TC-ADMDASH-002: /admin degrades to the shared.none em-dash and the no-results row when all three reads fail', () => {
  test('should fall back to the em-dash on every KPI card and to the no-results row when the stats, KPI and recent-users reads all fail', async ({
    page,
  }) => {
    // A 500 for the auth-service reads and a 403 for the admin-only analytics
    // read, so this exercises the real axios -> ApiError -> react-query error
    // path rather than a mocked rejection. (The `!isRecentLoading` guard that
    // keeps the no-results row from flashing during load is covered
    // deterministically by IT-ADMDASH-003; a request parked in a page.route()
    // handler also parks page.goto, so it cannot be reproduced here.)
    const fail = (message: string) => ({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message, data: null, timestamp: TS }),
    });

    await page.route(
      (url) => url.pathname === '/api/auth/users/stats',
      (route) => route.fulfill(fail('Lỗi hệ thống'))
    );
    await page.route(
      (url) => url.pathname === '/api/analytics/admin/kpi',
      (route) =>
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Forbidden', data: null, timestamp: TS }),
        })
    );
    await page.route(
      (url) => url.pathname === '/api/auth/users',
      (route) => route.fulfill(fail('Lỗi hệ thống'))
    );

    const dash = new AdminDashboardPage(page);
    await dash.goto();
    await dash.expectKpiCards();

    // The page has no isError branch for these two reads, so all four cards
    // degrade to the shared.none em-dash rather than showing a stale zero.
    for (const i of [0, 1, 2, 3]) {
      await expect(dash.statValue(i)).toHaveText('—');
    }
    // The labels stay put so the four-card grid never collapses.
    await expect(dash.statLabel(0)).toHaveText(/^(Người dùng|Users)$/);
    await expect(dash.statLabel(3)).toHaveText(/^(Tỷ lệ đạt|Pass rate)$/);

    // A failed list leaves `data` undefined, so `?? []` drives the no-results
    // row — an error is indistinguishable from "no users" on this table.
    await expect(dash.recentEmpty).toBeVisible();
    await expect(dash.recentEmpty).toContainText(/Không tìm thấy người dùng|No users found/i);
    await expect(dash.recentRows).toHaveCount(0);

    // The two panels with no backend at all are unaffected by the failures.
    await dash.expectNoDataSourcePanels();
  });
});
