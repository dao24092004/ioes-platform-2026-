/** Wave 2B — E2E: student exam result page (/student/exams/:examId/result) */
import { test, expect, type Page } from '@playwright/test';
import { ExamResultPage } from '../pages/student/ExamResultPage';

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

const exam = {
  id: 'exam-rs-1',
  courseId: null,
  instructorId: 'i-1',
  title: 'Bài thi kết quả E2E',
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

const attempt = {
  id: 'att-rs-1',
  examId: 'exam-rs-1',
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

test.describe('TC-EXAMRESULT-001: /student/exams/:examId/result renders the result card with ĐẬU badge', () => {
  test('should render the result card + passed badge + back link with no console errors', async ({
    page,
  }) => {
    // Mock the listAttempts endpoint (used by the page to filter the result).
    await page.route('**/api/attempts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          timestamp: new Date().toISOString(),
          data: [attempt],
        }),
      });
    });
    // Mock the per-exam detail endpoint.
    await page.route('**/api/exams/exam-rs-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          timestamp: new Date().toISOString(),
          data: exam,
        }),
      });
    });

    const errors = await catchConsoleErrors(page, async () => {
      const result = new ExamResultPage(page);
      await result.goto('exam-rs-1');

      await result.expectResultCard();
      await result.expectPassed();

      // The "Back to exam list" link points to /student/exams.
      await expect(result.backToExamsLink).toHaveAttribute('href', '/student/exams');
    });

    expect(errors).toHaveLength(0);
  });
});
