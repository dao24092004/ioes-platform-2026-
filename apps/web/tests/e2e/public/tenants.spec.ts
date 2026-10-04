/** Batch 1C2 — E2E: tenant pages */
import { test, expect, type Page } from '@playwright/test';
import { TenantsPage } from '../pages/public/TenantsPage';

// ---------------------------------------------------------------------------
// Console-error monitoring helper
// ---------------------------------------------------------------------------
type ConsoleErrorListener = (msg: { type: () => string; text: () => string }) => void;

function catchConsoleErrors(page: Page, fn: () => Promise<void>): Promise<string[]> {
  const errors: string[] = [];
  const listener: ConsoleErrorListener = (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  };
  page.on('console', listener);
  return fn()
    .finally(() => page.off('console', listener))
    .then(() => errors);
}

// ---------------------------------------------------------------------------
// TC-TENANTS-001: /tenants (anonymous) renders ComingSoon
// TC-TENANTS-002: /tenants/abc (anonymous) renders ComingSoon
// ---------------------------------------------------------------------------

test.describe('TC-TENANTS-001: /tenants renders ComingSoon for anonymous user', () => {
  test('should display ComingSoon at /tenants with no console errors', async ({ page }) => {
    const errors = await catchConsoleErrors(page, async () => {
      const pages = new TenantsPage(page);
      await pages.gotoTenantsList();
      await pages.expectComingSoon();
    });
    expect(errors).toHaveLength(0);
  });
});

test.describe('TC-TENANTS-002: /tenants/:tenantId renders ComingSoon for anonymous user', () => {
  test('should display ComingSoon at /tenants/abc with no console errors', async ({ page }) => {
    const errors = await catchConsoleErrors(page, async () => {
      const pages = new TenantsPage(page);
      await pages.gotoTenantDetail('abc');
      await pages.expectTenantDetailComingSoon();
    });
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TC-TENANTS-003: /tenant/:tenantId (anonymous) redirects to /auth/login
// ---------------------------------------------------------------------------

test.describe('TC-TENANTS-003: /tenant/:tenantId redirects to /auth/login when anonymous', () => {
  test.beforeEach(({ browser }) => {
    // Skip when running on web-student/instructor/admin (authenticated projects).
    // TC-TENANTS-003 is for anonymous-only chromium project.
    test.skip(
      browser.browserType().name() !== 'chromium',
      'TC-TENANTS-003 requires anonymous chromium project'
    );
  });

  test('should redirect anonymous user at /tenant/abc to /auth/login', async ({ page }) => {
    const pages = new TenantsPage(page);
    await pages.gotoOrganization('abc');
    await pages.expectLoginRedirect();
  });

  test('should redirect to /auth/login for any tenant id string', async ({ page }) => {
    const pages = new TenantsPage(page);
    await pages.gotoOrganization('any-uuid-12345');
    await pages.expectLoginRedirect();
  });
});

// ---------------------------------------------------------------------------
// TC-TENANTS-004 moved to tests/e2e/tenants.student.spec.ts so it runs only
// in the web-student project (which loads storageState from auth.setup.ts).
// In chromium it was matched but immediately skipped, hiding the real run.
// ---------------------------------------------------------------------------
