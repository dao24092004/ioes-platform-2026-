/** Wave 2B — E2E: student exams list (/student/exams) */
import { test, expect, type Page } from '@playwright/test';
import { ExamsPage } from '../pages/student/ExamsPage';

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

const examAvail = {
  id: 'exam-e2e-1',
  courseId: null,
  instructorId: 'i-1',
  title: 'Bài thi E2E có thể làm',
  description: null,
  examType: 'practice',
  timeLimitMinutes: 30,
  passingScore: '60.00',
  maxAttempts: 3,
  isRandomized: false,
  showResults: true,
  isProctored: false,
  metadata: {},
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
  version: 1,
};

const examDone = {
  id: 'exam-e2e-2',
  courseId: null,
  instructorId: 'i-1',
  title: 'Bài thi E2E đã hoàn thành',
  description: null,
  examType: 'graded',
  timeLimitMinutes: 45,
  passingScore: '50.00',
  maxAttempts: 3,
  isRandomized: false,
  showResults: true,
  isProctored: false,
  metadata: {},
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  deletedAt: null,
  version: 1,
};

const attemptDone = {
  id: 'att-e2e-1',
  examId: 'exam-e2e-2',
  userId: 'u-1',
  status: 'graded',
  startedAt: '2026-08-30T09:00:00.000Z',
  submittedAt: '2026-08-30T10:00:00.000Z',
  gradedAt: '2026-08-30T10:05:00.000Z',
  timeRemainingSeconds: null,
  score: '8.00',
  maxScore: '10.00',
  percentageScore: '80.00',
  passed: true,
  questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'],
  metadata: {},
  createdAt: '2026-08-30T09:00:00.000Z',
  updatedAt: '2026-08-30T10:05:00.000Z',
  version: 1,
};

test.describe('TC-EXAMS-001: /student/exams renders table for the authenticated student', () => {
  test('should render heading + 2 exam rows with no console errors', async ({ page }) => {
    // Mock listExams + listAttempts. The two queries fire in parallel on
    // mount; both must respond for the page to leave the loading state.
    await page.route('**/api/exams', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          timestamp: new Date().toISOString(),
          data: [examAvail, examDone],
        }),
      });
    });
    await page.route('**/api/attempts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          timestamp: new Date().toISOString(),
          data: [attemptDone],
        }),
      });
    });

    const errors = await catchConsoleErrors(page, async () => {
      const exams = new ExamsPage(page);
      await exams.goto();

      // Web-first: the exam title from the fixture must render in the table.
      await expect(page.getByText('Bài thi E2E có thể làm')).toBeVisible();
      await expect(page.getByText('Bài thi E2E đã hoàn thành')).toBeVisible();
    });

    expect(errors).toHaveLength(0);
  });
});
