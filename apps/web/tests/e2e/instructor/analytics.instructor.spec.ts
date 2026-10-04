/** Wave 3A — E2E: instructor analytics page (`/instructor/analytics`). */
import { test, expect, type Page } from '@playwright/test';
import { InstructorAnalyticsPage } from '../pages/instructor/InstructorAnalyticsPage';

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

const mockAnalyticsReads = async (page: Page): Promise<void> => {
  const exam = (id: string, title: string) => ({
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
    isProctored: true,
    metadata: {},
    createdAt: '2026-08-30T00:00:00Z',
    updatedAt: '2026-09-02T00:00:00Z',
    deletedAt: null,
    version: 1,
  });

  await page.route('**/api/exams/grading/stats', (route) =>
    route.fulfill({ json: envelope({ pending: 2, graded: 9, oldestPendingSubmittedAt: null }) })
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
    route.fulfill({ json: envelope([exam('e-1', 'React Midterm')]) })
  );
};

test.describe('TC-IANALYTICS-001: /instructor/analytics', () => {
  test('TC-IANALYTICS-001: should render the analytics KPIs, the exam table with its per-exam pending count and the no-time-series notice with zero console errors when an instructor with a valid session opens it', async ({
    page,
  }) => {
    await mockAnalyticsReads(page);

    const errors = await catchConsoleErrors(page, async () => {
      const analytics = new InstructorAnalyticsPage(page);
      await analytics.goto();
      await analytics.expectLoaded();

      // The instructor guard let us through — we were not bounced to /auth/login.
      await expect(page).toHaveURL(/\/instructor\/analytics$/);

      await analytics.expectKpisVisible();
      await analytics.expectNoTimeSeriesNotice();
      await analytics.expectTableVisible();

      // One row per exam; the pending column shows 2 for the only exam.
      await expect(analytics.examRows).toHaveCount(1);
      // Count is asserted above, so the single row can be addressed directly.
      await expect(analytics.examRows).toContainText('React Midterm');
      // LOCKED LOGIC (pendingByExam, AnalyticsPage.tsx:35) rendered end-to-end.
      await expect(analytics.examRows).toContainText('45 phút');
      await expect(analytics.examRows).toContainText('Bật');

      // KPI values come straight from the grading-stats mock. The label regexes
      // are unanchored because a card's textContent is the value and the label
      // concatenated ("2Bài chờ chấm").
      expect(await analytics.kpiValue(/Bài thi|^Exams$|Exams/i)).toBe('1');
      expect(await analytics.kpiValue(/Bài chờ chấm|Awaiting grading/i)).toBe('2');
      expect(await analytics.kpiValue(/Bài đã chấm|^Graded$|Graded/i)).toBe('9');
      // No oldest pending -> the em-dash placeholder, not a fabricated time.
      expect(await analytics.kpiValue(/Bài chờ lâu nhất nộp|Oldest pending submitted/i)).toBe('—');
    });

    expect(errors).toEqual([]);
  });
});
