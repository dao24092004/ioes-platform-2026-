/** Wave 4 (admin) — E2E: the placeholder admin pages (/admin/discussions, */
import { test, expect, type Page } from '@playwright/test';
import { AdminComingSoonPage } from '../pages/admin/AdminComingSoonPage';
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

test.describe('Wave 4D: placeholder admin pages', () => {
  test('TC-ADMCAV-001: /admin/discussions and /admin/tenants show the placeholder with its missing-items list', async ({
    page,
  }) => {
    const errors = await collectConsoleErrors(page, async () => {
      for (const slug of ['discussions', 'tenants'] as const) {
        const target = { slug, path: `/admin/${slug}` };
        const comingSoon = new AdminComingSoonPage(page, target);

        await comingSoon.goto();
        await comingSoon.expectPlaceholder();
        await comingSoon.expectMissingList();
        await comingSoon.expectNoFakeDataNotice();

        // The bullet list is the actual content of the page, not an artefact.
        const items = await comingSoon.readMissingItems();
        expect(items.length, `${slug} bullets`).toBeGreaterThan(1);
        for (const item of items) {
          expect(item.length, `${slug} bullet text`).toBeGreaterThan(0);
        }
      }
    });
    expect(errors, 'console errors').toHaveLength(0);
  });

  test('TC-ADMCAV-002: /admin/audit-log and /admin/security each show their own copy', async ({
    page,
  }) => {
    const errors = await collectConsoleErrors(page, async () => {
      const auditLog = new AdminComingSoonPage(page, {
        slug: 'audit-log',
        path: '/admin/audit-log',
      });
      await auditLog.goto();
      await auditLog.expectPlaceholder();
      await auditLog.expectMissingList();
      const auditLogCopy = {
        title: await auditLog.readTitle(),
        description: await auditLog.readDescription(),
        missing: await auditLog.readMissingItems(),
      };

      const security = new AdminComingSoonPage(page, { slug: 'security', path: '/admin/security' });
      await security.goto();
      await security.expectPlaceholder();
      await security.expectMissingList();
      const securityCopy = {
        title: await security.readTitle(),
        description: await security.readDescription(),
        missing: await security.readMissingItems(),
      };

      // Two different features, so two different placeholders: if the copy were
      // shared by mistake both pages would read identically.
      expect(auditLogCopy.title).not.toBe(securityCopy.title);
      expect(auditLogCopy.description).not.toBe(securityCopy.description);
      expect(auditLogCopy.missing).not.toEqual(securityCopy.missing);
    });
    expect(errors, 'console errors').toHaveLength(0);
  });

  test('TC-ADMCAV-003: the sidebar link opens a placeholder page and highlights only that item', async ({
    page,
  }) => {
    const errors = await collectConsoleErrors(page, async () => {
      // Start on a placeholder page, then navigate through the sidebar to
      // another one so the menu itself is exercised.
      const auditLog = new AdminComingSoonPage(page, {
        slug: 'audit-log',
        path: '/admin/audit-log',
      });
      await auditLog.goto();
      await auditLog.expectPlaceholder();

      const shell = new AdminShellPage(page);
      await shell.expectActiveNav('/admin/audit-log');
      await shell.expectInactiveNav('/admin');
      await shell.expectInactiveNav('/admin/wallet');

      await shell.navItem('/admin/wallet').click();
      await expect(page).toHaveURL(/\/admin\/wallet$/);

      const wallet = new AdminComingSoonPage(page, { slug: 'wallet', path: '/admin/wallet' });
      await wallet.expectPlaceholder();
      await wallet.expectMissingList();

      // The highlight followed the navigation, and /admin stayed off: the
      // dashboard item matches the pathname exactly, not as a prefix.
      await shell.expectActiveNav('/admin/wallet');
      await shell.expectInactiveNav('/admin');
      await shell.expectInactiveNav('/admin/audit-log');
    });
    expect(errors, 'console errors').toHaveLength(0);
  });
});
