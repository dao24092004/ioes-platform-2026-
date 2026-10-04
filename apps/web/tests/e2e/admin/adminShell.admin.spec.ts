/** Wave 4 (admin) — E2E: the AdminLayout shell around /admin/*. */
import { test, expect, type Page } from '@playwright/test';
import { AdminShellPage } from '../pages/admin/AdminShellPage';

/** Collect console errors raised while `fn` runs. */
async function collectConsoleErrors(page: Page, fn: () => Promise<void>): Promise<string[]> {
  const errors: string[] = [];
  const listener = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === 'error') errors.push(msg.text());
  };
  page.on('console', listener);
  try {
    await fn();
  } finally {
    page.off('console', listener);
  }
  return errors;
}

const START_PATH = '/admin/audit-log';

test.describe('Wave 4D: the admin shell', () => {
  test('TC-ADMSHELL-001: /admin shows all 16 nav links, the admin role label, the header controls and the logout control', async ({
    page,
  }) => {
    const errors = await collectConsoleErrors(page, async () => {
      const shell = new AdminShellPage(page);
      await shell.goto(START_PATH);

      await shell.expectNavComplete();
      await shell.expectAdminIdentity();
      await shell.expectHeaderControls();

      // The page content sits in the shell's <main>, and the header repeats
      // the feature name so the admin knows where they are.
      await expect(shell.main.getByTestId('coming-soon-title')).toBeVisible();
      await expect(shell.headerTitle).toHaveText(/audit log|nhật ký/i);

      // Only the open page is highlighted: '/admin' is an exact match, not a
      // prefix, so the dashboard must not light up on a child route.
      await shell.expectActiveNav(START_PATH);
      await shell.expectInactiveNav('/admin');
      await shell.expectInactiveNav('/admin/users');
    });
    expect(errors, 'console errors').toHaveLength(0);
  });

  test('TC-ADMSHELL-002: the sidebar toggle opens and closes the drawer on a phone-sized viewport', async ({
    page,
  }) => {
    // The toggle button is `lg:hidden`, so it only exists below the `lg`
    // breakpoint (1024px). Desktop Chrome's default viewport is wider than
    // that, so the viewport is narrowed first rather than the button forced.
    await page.setViewportSize({ width: 390, height: 844 });

    const errors = await collectConsoleErrors(page, async () => {
      const shell = new AdminShellPage(page);
      await shell.goto(START_PATH);

      await expect(shell.sidebarToggle).toBeVisible();
      await shell.expectDrawerToggles();
    });
    expect(errors, 'console errors').toHaveLength(0);
  });
});
