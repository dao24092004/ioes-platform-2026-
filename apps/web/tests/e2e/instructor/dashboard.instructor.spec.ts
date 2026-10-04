/** Wave 3A — E2E: instructor dashboard (`/instructor`). */
import { test, expect, type Page } from '@playwright/test';
import { InstructorDashboardPage } from '../pages/instructor/InstructorDashboardPage';

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

const envelope = <T>(data: T) => ({
  success: true,
  message: 'ok',
  data,
  timestamp: '2026-10-04T00:00:00Z',
});

/** Two exams, one proctored, and two queue rows for the first exam. */
const mockDashboardReads = async (page: Page): Promise<void> => {
  const exam = (id: string, title: string, isProctored: boolean) => ({
    id,
    courseId: 'c-1',
    instructorId: 'i-1',
    title,
    description: null,
    examType: 'graded',
    timeLimitMinutes: 45,
    passingScore: 60,
    maxAttempts: 3,
    isRandomized: true,
    showResults: false,
    isProctored,
    metadata: {},
    createdAt: '2026-08-30T00:00:00Z',
    updatedAt: '2026-09-02T00:00:00Z',
    deletedAt: null,
    version: 1,
  });

  await page.route('**/api/exams/grading/stats', (route) =>
    route.fulfill({
      json: envelope({ pending: 3, graded: 12, oldestPendingSubmittedAt: null }),
    })
  );
  // The trailing `**` matters: examApi.getGradingQueue() sends `?limit=50`,
  // and a glob without it would never match the query string.
  await page.route('**/api/exams/grading/queue**', (route) =>
    route.fulfill({
      json: envelope([
        {
          attemptId: 'att-1',
          examId: 'e-1',
          userId: 'u-1',
          submittedAt: '2026-10-01T00:00:00Z',
          waitingSeconds: 120,
          score: null,
          maxScore: null,
        },
        {
          attemptId: 'att-2',
          examId: 'e-1',
          userId: 'u-2',
          submittedAt: '2026-10-01T00:00:00Z',
          waitingSeconds: 60,
          score: null,
          maxScore: null,
        },
      ]),
    })
  );
  await page.route('**/api/exams', (route) =>
    route.fulfill({
      json: envelope([exam('e-1', 'React Midterm', true), exam('e-2', 'Node Final', false)]),
    })
  );
  await page.route('**/api/analytics/leaderboard**', (route) =>
    route.fulfill({
      json: envelope([
        {
          userId: 'u-1',
          displayName: 'Nguyen Van A',
          avatarUrl: null,
          score: 98,
          rank: 1,
          rankDelta: 2,
          period: 'WEEKLY',
          examsCompleted: 7,
          avgExamScore: 88,
          currentStreak: 4,
          longestStreak: 9,
          coursesCompleted: 2,
          lastActivityAt: null,
        },
      ]),
    })
  );
};

test.describe('TC-INSTRDASH-001: /instructor dashboard', () => {
  test('TC-INSTRDASH-001: should render the instructor dashboard with the data-testid sections, a consistent stat derivation and zero console errors when an instructor with a valid session opens it', async ({
    page,
  }) => {
    await mockDashboardReads(page);

    const errors = await catchConsoleErrors(page, async () => {
      const dashboard = new InstructorDashboardPage(page);
      await dashboard.goto();
      await dashboard.expectLoaded();

      // The instructor guard let us through — we were not bounced to /auth/login.
      await expect(page).toHaveURL(/\/instructor$/);

      await dashboard.expectStatsVisible();
      await dashboard.expectQuickActionHrefs();

      // Sections rendered from the mocked reads.
      await expect(dashboard.examItems).toHaveCount(2);
      await expect(dashboard.examList.getByText('React Midterm')).toBeVisible();
      await expect(dashboard.leaderboardItems).toHaveCount(1);

      // The header "create course" action is a real link to the create route.
      await expect(dashboard.createCourseLink).toHaveAttribute(
        'href',
        '/instructor/courses/create'
      );

      // Stats-derivation sanity check: 2 exams, 1 proctored, 3 pending, 12 graded.
      // The label regexes are unanchored because a card's textContent is the
      // value and the label concatenated ("2Bài thi").
      expect(await dashboard.statValue(/Bài thi|^Exams$|Exams/i)).toBe('2');
      expect(await dashboard.statValue(/Đề có giám thị|Proctored exams/i)).toBe('1');
      expect(await dashboard.statValue(/Bài chờ chấm|Awaiting grading/i)).toBe('3');
      expect(await dashboard.statValue(/Bài đã chấm|^Graded$|Graded/i)).toBe('12');

      // Per-exam pending: 2 queue rows both belong to e-1, so only that row links.
      await expect(
        dashboard.examList.getByRole('link', { name: /2 bài chờ chấm|2 awaiting grading/i })
      ).toHaveAttribute('href', '/instructor/grading');
    });

    expect(errors).toEqual([]);
  });
});
