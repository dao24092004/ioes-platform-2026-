/** Wave 2D — E2E gaps only: /student/recommendations */
import { test } from '@playwright/test';
import { RecommendationsPage } from '../pages/student/RecommendationsPage';

test.describe('TC-RECS-001: /student/recommendations gaps', () => {
  test('should render the empty state copy when backend returns no items', async ({ page }) => {
    await page.route('**/api/ai/recommendations/courses**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          timestamp: 't',
          data: { items: [], strategy: 'embedding+rules', generatedAt: '2026-10-01T00:00:00Z' },
        }),
      });
    });
    await page.route('**/api/v1/categories', async (route) => {
      // content-service returns the DTO directly (no envelope). Return an
      // empty array so the page can map categoryId → name without errors.
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    const recs = new RecommendationsPage(page);
    await recs.goto();
    await recs.expectPage();
    await recs.expectEmpty();
    await recs.expectCardCount(0);
  });
});
