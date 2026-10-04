/** Wave 3A — E2E: instructor reports page (`/instructor/reports`). */
import { test, expect, type Page } from '@playwright/test';
import { InstructorReportsPage } from '../pages/instructor/InstructorReportsPage';

type ConsoleErrorListener = (msg: { type: () => string; text: () => string }) => void;

/** Collect every `console.error` emitted while `fn` runs. */
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

test.describe('TC-IREPORTS-001: /instructor/reports', () => {
  test('TC-IREPORTS-001: should render the ComingSoon block with its title, badge and missing-items list and zero console errors when an instructor with a valid session opens it', async ({
    page,
  }) => {
    const errors = await catchConsoleErrors(page, async () => {
      const reports = new InstructorReportsPage(page);
      await reports.goto();
      await reports.expectLoaded();

      // The instructor guard let us through — we were not bounced to /auth/login.
      await expect(page).toHaveURL(/\/instructor\/reports$/);

      await reports.expectComingSoon();
      await reports.expectMissingItems();
    });

    expect(errors).toEqual([]);
  });
});
