/** Batch 1C2 - E2E: tenant pages (STUDENT project) */
import { test, expect, type Page } from '@playwright/test';
import { TenantsPage } from '../pages/public/TenantsPage';

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

test.describe('TC-TENANTS-005: /tenant/:tenantId renders ComingSoon for authenticated student', () => {
  test('should display ComingSoon at /tenant/abc when logged in as student', async ({ page }) => {
    const errors = await catchConsoleErrors(page, async () => {
      const pages = new TenantsPage(page);
      await pages.gotoOrganization('abc');
      await pages.expectComingSoon();
    });
    expect(errors).toHaveLength(0);
  });

  test('should display ComingSoon at /tenant/any-id for authenticated user', async ({ page }) => {
    const errors = await catchConsoleErrors(page, async () => {
      const pages = new TenantsPage(page);
      await pages.gotoOrganization('any-tenant-id-999');
      await pages.expectComingSoon();
    });
    expect(errors).toHaveLength(0);
  });
});
