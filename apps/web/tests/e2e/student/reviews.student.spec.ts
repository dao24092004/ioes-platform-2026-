/** Wave 2C — E2E: student reviews page (/student/reviews and /student/reviews/:courseId) */
import { test, expect, type Page } from '@playwright/test';
import { ReviewsPage } from '../pages/student/ReviewsPage';

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

test.describe('TC-REVIEWS-001: /student/reviews renders ComingSoon with no console errors', () => {
  test('should render ComingSoon (h1 + badge + no-fake-data notice)', async ({ page }) => {
    const errors = await catchConsoleErrors(page, async () => {
      const reviews = new ReviewsPage(page);
      await reviews.goto();
      await reviews.expectComingSoon();
    });
    expect(errors).toHaveLength(0);
  });
});

test.describe('TC-REVIEWS-002: /student/reviews/:courseId renders ComingSoon with no console errors', () => {
  test('should render the same ComingSoon at /student/reviews/c-1 with no console errors', async ({
    page,
  }) => {
    const errors = await catchConsoleErrors(page, async () => {
      const reviews = new ReviewsPage(page);
      await reviews.gotoCourse('c-1');
      await reviews.expectComingSoon();
    });
    expect(errors).toHaveLength(0);
  });
});
