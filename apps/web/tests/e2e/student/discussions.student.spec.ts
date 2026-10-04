/** Wave 2D — E2E: /student/discussions */
import { test, expect, type Page } from '@playwright/test';
import { DiscussionsPage } from '../pages/student/DiscussionsPage';

type ConsoleErrorListener = (msg: { type: () => string; text: () => string }) => void;

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

test.describe('TC-DISCUSS-001: /student/discussions/:courseId placeholder', () => {
  test('should render the ComingSoon wrapper with no console errors', async ({ page }) => {
    const errors = await catchConsoleErrors(page, async () => {
      const discuss = new DiscussionsPage(page);
      await discuss.goto('c-1');
      await discuss.expectPage();
      await discuss.expectComingSoon();
    });
    expect(errors).toHaveLength(0);
  });
});
