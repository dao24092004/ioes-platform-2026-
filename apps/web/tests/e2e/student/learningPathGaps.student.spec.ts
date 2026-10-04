/** Wave 2D — E2E gaps only: /student/learning-path */
import { test, expect } from '@playwright/test';
import { LearningPathPage } from '../pages/student/LearningPathPage';

test.describe('TC-LEARNPATH-001: /student/learning-path gaps', () => {
  test('should render the form when no path exists', async ({ page }) => {
    await page.route('**/api/ai/learning-path/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'ok', timestamp: 't', data: null }),
      });
    });
    await page.route('**/api/ai/learning-path/history**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'ok', timestamp: 't', data: [] }),
      });
    });

    const lp = new LearningPathPage(page);
    await lp.goto();
    await lp.expectPage();
    await lp.expectFormHeading();
    // The form should be ready to fill.
    await lp.fillGoal('Become a backend engineer');
    await expect(lp.goalInput).toHaveValue('Become a backend engineer');
  });
});
