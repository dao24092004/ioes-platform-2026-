/** Wave 2C (student) — E2E: LeaderboardPage gaps only */
import { test, expect } from '@playwright/test';

test.describe('TC-LEADERBOARD-001: leaderboard e2e coverage deferred — period-filter re-query and podium render are covered by unit + integration tests', () => {
  test('should mount the leaderboard route without console errors', async ({ page }) => {
    const errors: string[] = [];
    const onConsole = (msg: { type: () => string }) => {
      if (msg.type() === 'error') errors.push('console-error');
    };
    page.on('console', onConsole);
    try {
      // Mock both endpoints with empty payloads so the page renders without
      // throwing. This smoke-tests that the route mounts cleanly under the
      // web-student storageState.
      await page.route('**/api/analytics/leaderboard**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'ok',
            data: [],
            timestamp: '2026-10-04T00:00:00Z',
          }),
        });
      });
      await page.route('**/api/analytics/users/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'ok',
            data: null,
            timestamp: '2026-10-04T00:00:00Z',
          }),
        });
      });
      await page.goto('/student/leaderboard');
      // The page renders the period buttons (Weekly / Monthly / All time)
      // even when the leaderboard data is empty.
      await expect(page.getByTestId('leaderboard-period-weekly')).toBeVisible();
      await expect(page.getByTestId('leaderboard-period-monthly')).toBeVisible();
      await expect(page.getByTestId('leaderboard-period-alltime')).toBeVisible();
    } finally {
      page.off('console', onConsole);
    }
    expect(errors).toHaveLength(0);
  });
});
