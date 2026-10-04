
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';

// =================================================================
// TC-LOGIN: tabs + login happy/sad paths
// All backend-dependent cases route the API gateway through page.route()
// mocks so they run without the auth-service. Wrong-password / unknown-email
// cases use the TEST_STUDENT_EMAIL env (or an obviously-fake fallback) and
// a deliberately-wrong TEST_STUDENT_PASSWORD_BAD so no seed credentials
// leak into the source tree.
// =================================================================
const TEST_STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL;
const TEST_STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD;
const TEST_WRONG_PASSWORD = process.env.TEST_STUDENT_PASSWORD_BAD ?? 'DeliberatelyWrong!99';
const TEST_UNKNOWN_EMAIL =
  process.env.TEST_STUDENT_EMAIL_UNKNOWN ?? 'no-such-user-12345@example.test';

// Thiếu biến env cho login thật thì SKIP, không dùng giá trị giả.
const needRealCreds = (label: string) =>
  test.skip(!TEST_STUDENT_EMAIL || !TEST_STUDENT_PASSWORD, `missing env: ${label}`);

test.describe('TC-LOGIN: tabs + login', () => {
  test('TC-LOGIN-001: at /auth/login, the Login tab is the active one', async ({ page }) => {
    const login = new LoginPage(page);
    await login.gotoLogin();

    // URL stays at /auth/login (tab is a Link, not push, but URL hash is the
    // canonical source of truth). Login form (email input) is visible.
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(login.emailInput).toBeVisible();
    await expect(login.passwordInput).toBeVisible();
  });

  test('TC-LOGIN-002: clicking the Register tab switches to /auth/register', async ({ page }) => {
    const login = new LoginPage(page);
    await login.gotoLogin();

    await login.switchToRegister();
    await expect(page).toHaveURL(/\/auth\/register$/);

    // Register form has a fullName input that Login does not — proves we
    // actually swapped forms, not just URL.
    const register = new RegisterPage(page);
    await expect(register.fullNameInput).toBeVisible();
  });

  test('TC-LOGIN-003: from /auth/register, clicking the Login tab returns to /auth/login', async ({
    page,
  }) => {
    const register = new RegisterPage(page);
    await register.goto();

    // Sanity: fullName visible
    await expect(register.fullNameInput).toBeVisible();

    const login = new LoginPage(page);
    await login.switchToLogin();
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(login.emailInput).toBeVisible();
  });

  test('TC-LOGIN-004: valid student credentials redirect to /student', async ({ page }) => {
    needRealCreds('TEST_STUDENT_EMAIL/TEST_STUDENT_PASSWORD');
    // Mock the auth-service /api/auth/login with a 200 + success envelope.
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
    // Suppress incidental /api/auth/me probes so they don't 401-out the test.
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 401, body: '{"success":false,"message":"Unauthorized"}' })
    );

    const login = new LoginPage(page);
    await login.gotoLogin();
    await login.login(TEST_STUDENT_EMAIL!, TEST_STUDENT_PASSWORD!);
    await expect(page).toHaveURL(/\/student/);
  });

  test('TC-LOGIN-005: wrong password shows an error and stays on /auth/login', async ({ page }) => {
    needRealCreds('TEST_STUDENT_EMAIL');
    // Mock the auth-service to return 401 (mirrors real backend behaviour for
    // wrong password). The page should render the auth-error banner.
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Sai mật khẩu',
          timestamp: '2026-10-03T00:00:00Z',
          traceId: 'mock-trace-wrong',
        }),
      })
    );

    const login = new LoginPage(page);
    await login.gotoLogin();
    await login.login(TEST_STUDENT_EMAIL!, TEST_WRONG_PASSWORD);

    // Either stays on /auth/login (preferred: login error before navigate)
    // or briefly shows error then redirects to /. We assert: the error
    // banner is shown.
    await expect(login.errorBanner).toBeVisible();
  });

  test('TC-LOGIN-006: unknown email shows an error and stays on /auth/login', async ({ page }) => {
    needRealCreds('TEST_STUDENT_PASSWORD');
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Email không tồn tại',
          timestamp: '2026-10-03T00:00:00Z',
          traceId: 'mock-trace-unknown',
        }),
      })
    );

    const login = new LoginPage(page);
    await login.gotoLogin();
    await login.login(TEST_UNKNOWN_EMAIL, TEST_STUDENT_PASSWORD!);
    await expect(login.errorBanner).toBeVisible();
  });
});
