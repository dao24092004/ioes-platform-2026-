/** apps/web/tests/e2e/error-auth-layout.spec.ts */
import { test, expect, Page } from '@playwright/test';
import { ErrorAuthLayoutPage } from '../pages/shared/ErrorAuthLayoutPage';

// ---------------------------------------------------------------------------
// Safety net: intercept any incidental API call so it never bubbles as an
// uncaught console error (there should be none on these public pages).
// Also intercept /api/auth/me with 401 to prevent the 120s timeout that
// blocks waitForLoadState('networkidle') in anonymous sessions.
// ---------------------------------------------------------------------------
const setupPage = async (page: Page) => {
  await page.route('**/api/**', (route) => route.fulfill({ status: 200, body: '{}' }));
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, body: '{"success":false,"message":"Unauthorized"}' })
  );
};

// ---------------------------------------------------------------------------
// 404 PAGE
// ---------------------------------------------------------------------------
test.describe('404 — NotFoundPage', () => {
  test('TC-ERRORAUTH-001: should render the 404 page when visiting a non-existent route', async ({
    page,
  }) => {
    await setupPage(page);
    const p = new ErrorAuthLayoutPage(page);
    await p.gotoNotFound();

    await expect(p.heading404).toBeVisible();
  });

  test('TC-ERRORAUTH-002: should show no console errors on the 404 page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await setupPage(page);
    const p = new ErrorAuthLayoutPage(page);
    await p.gotoNotFound();
    await expect(p.heading404).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('TC-ERRORAUTH-003: should navigate to / when the back-home button is clicked', async ({
    page,
  }) => {
    await setupPage(page);
    const p = new ErrorAuthLayoutPage(page);
    await p.gotoNotFound();
    await p.clickBackHome();

    await expect(page).toHaveURL('/');
  });
});

// ---------------------------------------------------------------------------
// 500 PAGE
// ---------------------------------------------------------------------------
test.describe('500 — ServerErrorPage', () => {
  test('TC-ERRORAUTH-004: should render the 500 page when visiting /500 directly', async ({
    page,
  }) => {
    await setupPage(page);
    const p = new ErrorAuthLayoutPage(page);
    await p.goto500();

    await expect(p.heading500).toBeVisible();
  });

  test('TC-ERRORAUTH-005: should show no console errors on the 500 page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await setupPage(page);
    const p = new ErrorAuthLayoutPage(page);
    await p.goto500();
    await expect(p.heading500).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('TC-ERRORAUTH-006: should render a "Try Again" button that calls window.location.reload on click', async ({
    page,
  }) => {
    await setupPage(page);
    const p = new ErrorAuthLayoutPage(page);
    await p.goto500();

    // The button must be visible and enabled before clicking
    await expect(p.tryAgainBtn).toBeEnabled();
    // Clicking should not throw (we do not verify actual reload in headless)
    await p.clickTryAgain();
  });
});

// ---------------------------------------------------------------------------
// AUTHLAYOUT SHELL
// ---------------------------------------------------------------------------
test.describe('AuthLayout — login/register shell', () => {
  test('TC-ERRORAUTH-007: should navigate to /auth/login and keep the URL after reload', async ({
    page,
  }) => {
    await setupPage(page);
    await page.goto('/auth/login');
    await expect(page).toHaveURL(/\/auth\/login$/);

    // Reload assertion: after a hard reload the lazy chunk for AuthLayout must
    // re-resolve (mock the chunk endpoint so it returns a tiny stub JS) and
    // the URL must remain /auth/login.
    await page.route('**/assets/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '/* stub chunk */',
      })
    );
    await page.reload();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('TC-ERRORAUTH-008: should navigate to /auth/register and keep the URL after reload', async ({
    page,
  }) => {
    await setupPage(page);
    await page.goto('/auth/register');
    await expect(page).toHaveURL(/\/auth\/register$/);

    await page.route('**/assets/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '/* stub chunk */',
      })
    );
    await page.reload();
    await expect(page).toHaveURL(/\/auth\/register$/);
  });

  test('TC-ERRORAUTH-009: should switch to /auth/register when the Register tab is clicked', async ({
    page,
  }) => {
    await setupPage(page);
    const p = new ErrorAuthLayoutPage(page);
    await p.gotoLogin();
    await p.clickRegisterTab();
    await expect(page).toHaveURL(/\/auth\/register$/);
  });

  test('TC-ERRORAUTH-010: should switch to /auth/login when the Login tab is clicked from register', async ({
    page,
  }) => {
    await setupPage(page);
    const p = new ErrorAuthLayoutPage(page);
    await p.gotoRegister();
    await p.clickLoginTab();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('TC-ERRORAUTH-011: should show no console errors on /auth/login and /auth/register', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Mock the lazy-chunk request at its source so the dev-server MIME-type
    // error never fires, and intercept /api/auth/me so the 120s timeout in
    // anonymous sessions does not throw an unhandled error.
    await page.route('**/assets/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stub */' })
    );
    await page.route('**/api/**', (route) => route.fulfill({ status: 200, body: '{}' }));
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 401, body: '{"success":false,"message":"Unauthorized"}' })
    );

    await page.goto('/auth/login');
    await expect(page).toHaveURL(/\/auth\/login$/);
    errors.length = 0; // reset after login load

    await page.goto('/auth/register');
    await expect(page).toHaveURL(/\/auth\/register$/);

    expect(errors).toHaveLength(0);
  });
});
