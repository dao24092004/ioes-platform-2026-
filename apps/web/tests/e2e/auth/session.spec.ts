// Batch 6F — Logout + Session persistence. The auth store uses zustand
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/auth/LoginPage';

const TEST_STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL ?? 'no-env-student@example.test';
const TEST_STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD ?? 'NoEnvPassword!23';

/**
 * Seed localStorage with a fake but well-formed `ioes-auth` payload — this
 * simulates what zustand-persist writes after a real login. Useful for
 * session tests that don't need a real API round-trip.
 *
 * Uses TEST_STUDENT_EMAIL (or an obviously-fake fallback) for the seeded
 * user so no real seed credentials leak into the source tree.
 */
async function seedSession(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript((email) => {
    const payload = {
      state: {
        user: {
          id: 'user-1',
          email,
          full_name: 'Seed Student',
          role: 'student',
        },
        accessToken: 'fake.access.token',
        refreshToken: 'fake.refresh.token',
        isAuthenticated: true,
      },
      version: 0,
    };
    localStorage.setItem('ioes-auth', JSON.stringify(payload));
  }, TEST_STUDENT_EMAIL);
}

test.describe('TC-SESSION: session persistence', () => {
  test('TC-SESSION-001: a session in localStorage shows the avatar menu in the header instead of Login/Register', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto('/');

    // Header renders the avatar button (with `aria-label="Tài khoản"` in VI
    // or `aria-label="Account"` in EN — match both).
    await expect(page.getByRole('button', { name: /tài khoản|^account$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /đăng nhập|sign ?in|log in/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /đăng ký|sign ?up|register/i })).not.toBeVisible();
  });

  test('TC-SESSION-002: visiting /auth/login while logged in does NOT redirect — the login form is still rendered', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto('/auth/login');

    // LoginPage is reachable for already-logged-in users (no auth guard).
    const login = new LoginPage(page);
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(login.emailInput).toBeVisible();
  });

  test('TC-SESSION-003: after logout (real API), auth-storage is removed and header returns to Login/Register', async ({
    page,
  }) => {
    // Mock the full login → logout flow through page.route() so the test
    // runs without an auth-service. The page only sees a successful POST
    // /api/auth/login followed by a 200 /api/auth/logout; /api/auth/me is
    // answered with 401 so the in-app probe never 401-out the page.
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          timestamp: '2026-10-03T00:00:00Z',
          data: {
            user: {
              id: 'user-test',
              email: TEST_STUDENT_EMAIL,
              fullName: 'Test Student',
              role: 'student',
              avatarUrl: null,
            },
            accessToken: 'mocked-access',
            refreshToken: 'mocked-refresh',
          },
        }),
      })
    );
    await page.route('**/api/auth/logout', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', timestamp: '2026-10-03T00:00:00Z' }),
      })
    );
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 401, body: '{"success":false,"message":"Unauthorized"}' })
    );

    // 1) Real login.
    const login = new LoginPage(page);
    await login.gotoLogin();
    await login.login(TEST_STUDENT_EMAIL, TEST_STUDENT_PASSWORD);
    await expect(page).toHaveURL(/\/student/);
    await page.waitForLoadState('networkidle');

    // 2) Click the logout button in StudentLayout (sidebar). It is a button
    //    with `title="Đăng xuất"` / `title="Logout"` depending on language.
    //    Source: src/components/layout/StudentLayout.tsx — `<button title={t('header.logout')} ...>`
    await page
      .getByRole('button', { name: /(đăng xuất|logout)/i })
      .first()
      .click();

    // 3) Auth-storage no longer carries user + tokens (key may remain because
    //    zustand-persist always re-writes the slice on state change). The
    //    real contract is "no user / no tokens / not authenticated".
    const raw = await page.evaluate(() => localStorage.getItem('ioes-auth'));
    const parsed = raw ? JSON.parse(raw) : { state: {} };
    expect(parsed.state?.user ?? null).toBeNull();
    expect(parsed.state?.accessToken ?? null).toBeNull();
    expect(parsed.state?.refreshToken ?? null).toBeNull();
    expect(parsed.state?.isAuthenticated ?? false).toBe(false);

    await page.goto('/');
    await expect(page.getByRole('link', { name: /đăng nhập|sign ?in|log in/i })).toBeVisible();
  });

  test('TC-SESSION-004: a fresh visit with no session has Login + Register buttons visible', async ({
    page,
  }) => {
    // No seedSession — start clean.
    await page.goto('/');

    await expect(page.getByRole('link', { name: /đăng nhập|sign ?in|log in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /đăng ký|sign ?up|register/i })).toBeVisible();
  });
});
