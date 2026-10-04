/** Wave 2C — E2E: student streak page (/student/streak) */
import { test, expect, type Page } from '@playwright/test';
import { StreakPage } from '../pages/student/StreakPage';

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

const envelope = <T>(data: T) => ({
  success: true,
  message: 'ok',
  data,
  timestamp: '2026-10-04T00:00:00Z',
});

const analyticsPayload = {
  userId: 'u-1',
  totalExamsAttempted: 4,
  totalExamsPassed: 3,
  totalExamsFailed: 1,
  passRate: 75,
  avgScore: 80,
  highestScore: 95,
  totalCoursesEnrolled: 2,
  totalCoursesCompleted: 2,
  currentStreak: 15,
  longestStreak: 30,
  totalStudyMinutes: 240,
  lastExamAt: '2026-10-02T00:00:00Z',
  lastLoginAt: '2026-10-02T00:00:00Z',
};

test.describe('TC-STREAK-001: /student/streak renders hero streak value, freeze button, and four milestone cards with no console errors', () => {
  test('should render streak hero value=15, freeze button, best streak, next milestone, and four milestone cards', async ({
    page,
  }) => {
    await page.route('**/api/analytics/users/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(analyticsPayload)),
      });
    });

    const errors = await catchConsoleErrors(page, async () => {
      const streak = new StreakPage(page);
      await streak.goto();

      await streak.expectHero();
      await streak.expectCurrentValue('15');
      await streak.expectBestCard();
      await streak.expectNextMilestoneCard();
      await streak.expectFreezeButton();
      // Four milestones (m1:7, m2:30, m3:100, m4:365).
      await streak.expectMilestoneCount(4);
    });

    expect(errors).toHaveLength(0);
  });
});
