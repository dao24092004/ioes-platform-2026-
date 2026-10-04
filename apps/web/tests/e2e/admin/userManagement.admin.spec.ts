/** Wave 4A (admin) — E2E: user management page (`/admin/users`). */
import { test, expect, type Page, type Route } from '@playwright/test';
import { AdminUserManagementPage } from '../pages/admin/AdminUserManagementPage';

const TS = '2026-10-04T00:00:00Z';

const envelope = <T>(data: T) => ({ success: true, message: 'ok', data, timestamp: TS });

const user = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  email: `${id}@ioes.test`,
  fullName: `E2E ${id}`,
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

/** Six counters; the page adds `admins + superAdmins` for the admin tile. */
const stats = {
  total: 18,
  students: 10,
  instructors: 5,
  admins: 2,
  superAdmins: 1,
  suspended: 2,
  pending: 1,
  active: 15,
};

/**
 * Twelve rows so the pagination has exactly two pages at the page's fixed
 * `perPage` of 6. The first two carry the roles/statuses the assertions need,
 * the third has an avatar so the <img> branch is reachable, and the filler
 * names all sort after "Tran Thi B" so the `name_asc` order has a stable,
 * obvious first row ("Le Van C").
 */
const pool = [
  user('e2e-01', { fullName: 'Nguyen Van A', role: 'super_admin', status: 'active' }),
  user('e2e-02', {
    fullName: 'Tran Thi B',
    role: 'instructor',
    status: 'suspended',
    mfaEnabled: true,
  }),
  user('e2e-03', { fullName: 'Le Van C', role: 'student', status: 'pending' }),
  user('e2e-04', {
    fullName: 'Pham Thi D',
    role: 'student',
    status: 'active',
    avatarUrl: '/e2e-avatar.svg',
  }),
  ...Array.from({ length: 8 }, (_, i) =>
    user(`e2e-${String(i + 5).padStart(2, '0')}`, {
      fullName: `User Vo ${String(i + 5).padStart(2, '0')}`,
      role: 'student',
      status: 'active',
    })
  ),
];

/** The page's own filter + sort, re-implemented so the assertions stay honest. */
const applyQuery = (
  search: string | null,
  role: string | null,
  status: string | null,
  sort: string | null
) => {
  let out = pool;
  if (search) {
    const q = search.toLowerCase();
    out = out.filter(
      (u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }
  if (role && role !== 'all') out = out.filter((u) => u.role === role);
  if (status && status !== 'all') out = out.filter((u) => u.status === status);
  if (sort === 'name_asc') out = [...out].sort((a, b) => a.fullName.localeCompare(b.fullName));
  return out;
};

/** Intercept the two read endpoints. Exact pathname matching, no globs. */
async function mockReads(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname === '/api/auth/users/stats',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(stats)),
      })
  );
  await page.route(
    (url) => url.pathname === '/api/auth/users',
    (route) => {
      const params = new URL(route.request().url()).searchParams;
      const pageNo = Math.max(1, Number(params.get('page') ?? '1'));
      const perPage = Number(params.get('per_page') ?? '6');
      const all = applyQuery(
        params.get('search'),
        params.get('role'),
        params.get('status'),
        params.get('sort')
      );
      const body = {
        data: all.slice((pageNo - 1) * perPage, pageNo * perPage),
        meta: {
          total: all.length,
          page: pageNo,
          perPage,
          totalPages: Math.ceil(all.length / perPage) || 1,
        },
      };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(body)),
      });
    }
  );
}

/**
 * Fence the three mutating endpoints. The ids can only be `e2e-*` (the list
 * read is mocked), so even a regression cannot reach a real account — these
 * handlers exist so the write is observable and never leaves the browser.
 */
async function mockWrites(page: Page, sink: { path: string; body: unknown }[]): Promise<void> {
  const fulfil = (route: Route, data: unknown) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope(data)),
    });

  /** `/api/auth/users/<id>/<verb>` — the id is always the second-to-last segment. */
  const idOf = (route: Route) => {
    const segments = new URL(route.request().url()).pathname.split('/');
    return segments[segments.length - 2]!;
  };

  await page.route(
    (url) => /^\/api\/auth\/users\/[^/]+\/status$/.test(url.pathname),
    (route) => {
      const id = idOf(route);
      sink.push({ path: `${id}/status`, body: route.request().postDataJSON() });
      return fulfil(route, user(id, { status: 'suspended' }));
    }
  );

  await page.route(
    (url) => /^\/api\/auth\/users\/[^/]+\/role$/.test(url.pathname),
    (route) => {
      const id = idOf(route);
      sink.push({ path: `${id}/role`, body: route.request().postDataJSON() });
      return fulfil(route, user(id, { role: 'instructor' }));
    }
  );

  await page.route(
    (url) => /^\/api\/auth\/users\/[^/]+$/.test(url.pathname),
    (route) => {
      // Only DELETE reaches this branch; a GET already matched the list route.
      if (route.request().method() !== 'DELETE') return route.fallback();
      const segments = new URL(route.request().url()).pathname.split('/');
      sink.push({ path: `${segments[segments.length - 1]} (DELETE)`, body: null });
      return fulfil(route, null);
    }
  );
}

test.describe('TC-ADMUSERS-001: /admin/users renders the stat cards, the user table with role/status badges, and the user detail modal', () => {
  test('should render five stat cards, six table rows with the super-admin/instructor/student badges, the per-status action set, and the detail modal', async ({
    page,
  }) => {
    const writes: { path: string; body: unknown }[] = [];
    await mockReads(page);
    await mockWrites(page, writes);

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // The one row with an avatarUrl points at a same-origin path; fulfil it so
    // the assertion covers the <img> branch without a real network fetch.
    await page.route(
      (url) => url.pathname === '/e2e-avatar.svg',
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg"/>',
        })
    );

    const users = new AdminUserManagementPage(page);
    await users.goto();
    await users.waitForTable();

    await users.expectStatCards();
    // The admin tile is admins + superAdmins = 2 + 1 = 3.
    await expect(users.statAdmins).toContainText('3');
    await expect(users.statAll).toContainText('18');
    await expect(users.statStudents).toContainText('10');
    await expect(users.statInstructors).toContainText('5');
    await expect(users.statSuspended).toContainText('2');

    // Twelve mocked rows at the page's fixed perPage of 6 → six rows here.
    await users.expectRowCount(6);
    await users.expectPageInfo(/1-6/);
    await expect(users.pageButton(2)).toBeVisible();
    await expect(users.pageButton(3)).toHaveCount(0);

    // The joined column is the page's own dd/MM/yyyy formatter.
    await expect(users.joinedCell('e2e-01')).toHaveText(/^\d{2}\/\d{2}\/\d{4}$/);

    // Role and status badges are plain spans with no testid, so every badge
    // assertion is scoped to the row it belongs to — a repeated label on
    // another row can then never satisfy it.
    await expect(users.row('e2e-01').getByText('Super Admin')).toBeVisible();
    await expect(users.row('e2e-02').getByText(/^Giảng viên$|^Instructor$/)).toBeVisible();
    await expect(users.row('e2e-03').getByText(/^Học viên$|^Student$/)).toBeVisible();
    await expect(users.row('e2e-02').getByText(/^Tạm khóa$|^Suspended$/)).toBeVisible();
    await expect(users.row('e2e-03').getByText(/^Chờ duyệt$|^Pending$/)).toBeVisible();
    await expect(users.row('e2e-04').getByText(/^Đang hoạt động$|^Active$/)).toBeVisible();
    // A super_admin row must not also carry an instructor badge.
    await expect(users.row('e2e-01').getByText(/^Giảng viên$|^Instructor$/)).toHaveCount(0);

    // Avatar branch: one row has an avatarUrl, the rest fall back to initials.
    await expect(users.avatar('e2e-04')).toBeVisible();
    await expect(users.initials('e2e-01')).toHaveText('NV');
    await expect(users.initials('e2e-04')).toHaveCount(0);

    // Row actions are keyed by the user id and depend on the row's status:
    // active → lock, suspended → unlock, pending → approve.
    await expect(users.viewButton('e2e-01')).toBeVisible();
    await expect(users.resetButton('e2e-01')).toBeVisible();
    await expect(users.deleteButton('e2e-01')).toBeVisible();
    await expect(users.lockButton('e2e-01')).toBeVisible();
    await expect(users.unlockButton('e2e-01')).toHaveCount(0);
    await expect(users.approveButton('e2e-01')).toHaveCount(0);

    await expect(users.unlockButton('e2e-02')).toBeVisible();
    await expect(users.lockButton('e2e-02')).toHaveCount(0);

    await expect(users.approveButton('e2e-03')).toBeVisible();
    await expect(users.lockButton('e2e-03')).toHaveCount(0);

    // Detail modal: role, status, the populated last-login IP and the em-dash
    // fallbacks for the two nullable fields.
    await users.openDetail('e2e-01');
    await expect(users.detailName).toHaveText('Nguyen Van A');
    await expect(users.detailRole).toHaveText(/^Super Admin$/);
    await expect(users.detailStatus).toHaveText(/^Đang hoạt động$|^Active$/);
    await expect(page.getByTestId('admin-users-detail-ip')).toHaveText('10.0.0.9');
    await expect(page.getByTestId('admin-users-detail-phone')).toHaveText('—');
    await expect(page.getByTestId('admin-users-detail-bio')).toHaveText('—');
    await expect(page.getByTestId('admin-users-detail-created')).toHaveText(
      /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/
    );
    // emailVerified=true and mfaEnabled=false on this row.
    await expect(page.getByTestId('admin-users-detail-verified')).toBeVisible();
    await expect(page.getByTestId('admin-users-detail-mfa')).toHaveCount(0);
    await users.closeDetail();

    expect(writes, 'no mutating request was made').toHaveLength(0);
    expect(errors, 'console errors').toHaveLength(0);
  });
});

test.describe('TC-ADMUSERS-002: /admin/users search, role filter, sort, pagination and an intercepted bulk lock', () => {
  test('should re-query on search, role filter and sort, move the showing range to 7-12 on page 2, and dispatch the bulk lock to an intercepted endpoint', async ({
    page,
  }) => {
    const writes: { path: string; body: unknown }[] = [];
    await mockReads(page);
    await mockWrites(page, writes);

    const users = new AdminUserManagementPage(page);
    await users.goto();
    await users.waitForTable();
    await users.expectRowCount(6);

    /**
     * Resolve once a GET /api/auth/users carrying `key=value` goes out.
     *
     * Registered BEFORE the interaction that changes the query key. This is
     * only awaited for a key the page has NEVER fetched: react-query serves a
     * revisited key straight from its cache and revalidates in the background,
     * so a returning filter change legitimately produces no network round-trip
     * and is asserted on the rendered result instead.
     */
    const listCall = (key: string, value: string) =>
      page.waitForRequest((req) => {
        const u = new URL(req.url());
        return u.pathname === '/api/auth/users' && u.searchParams.get(key) === value;
      });

    // Search narrows the list to the one matching row.
    const searched = listCall('search', 'Nguyen');
    await users.search.fill('Nguyen');
    await searched;
    await expect(users.tbody).toContainText('Nguyen Van A');
    await users.expectRowCount(1);

    // Clearing the box returns the unfiltered rows out of the react-query
    // cache, so the rendered table is the assertion — no request is promised.
    await users.search.fill('');
    await users.expectRowCount(6);
    await expect(users.search).toHaveValue('');

    // Role filter: "instructor" is the option value, whatever the label reads.
    const byInstructor = listCall('role', 'instructor');
    await users.roleFilter.selectOption('instructor');
    await byInstructor;
    await expect(users.tbody).toContainText('Tran Thi B');
    await users.expectRowCount(1);
    // The suspended instructor is the only row left, so no super-admin badge.
    await expect(users.row('e2e-01')).toHaveCount(0);

    await users.roleFilter.selectOption('all');
    await users.expectRowCount(6);

    // Sort actually reorders the rows the backend returns: the table leads
    // with "Nguyen Van A" in the default newest-first order but with "Le Van C"
    // once the backend is asked for name_asc.
    await expect(users.rows.first()).toContainText('Nguyen Van A');
    const byName = listCall('sort', 'name_asc');
    await users.sortBy.selectOption('name_asc');
    await byName;
    await expect(users.rows.first()).toContainText('Le Van C');
    await users.sortBy.selectOption('newest');
    await expect(users.rows.first()).toContainText('Nguyen Van A');

    // Pagination: twelve mocked rows at perPage 6 means exactly two pages.
    await users.expectPageInfo(/1-6/);
    await expect(users.prev).toBeDisabled();
    await expect(users.next).toBeEnabled();
    await users.pageButton(2).click();
    await users.expectPageInfo(/7-12/);
    await expect(users.prev).toBeEnabled();
    await expect(users.next).toBeDisabled();
    await users.prev.click();
    await users.expectPageInfo(/1-6/);
    await users.pageButton(2).click();
    await users.expectPageInfo(/7-12/);

    // Bulk lock — intercepted, so nothing is written to a real account.
    await users.rowCheckbox('e2e-07').click();
    await users.rowCheckbox('e2e-08').click();
    await expect(users.bulkBar).toContainText('2');
    await users.bulkLock.click();

    await expect(users.bulkBar).toHaveCount(0);
    expect(writes.map((w) => w.path).sort()).toEqual(['e2e-07/status', 'e2e-08/status']);
    for (const w of writes) {
      expect(w.body).toEqual({ status: 'suspended' });
    }
  });
});
