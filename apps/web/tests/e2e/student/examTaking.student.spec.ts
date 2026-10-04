/** Wave 2B — E2E: student exam taking page (/student/exams/:examId/take) */
import { test, expect as pwExpect, type Page } from '@playwright/test';
import { ExamTakingPage } from '../pages/student/ExamTakingPage';

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
  id: 'exam-tk-1',
  courseId: null,
  instructorId: 'i-1',
  title: 'Bài thi làm trắc nghiệm',
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

const attempt = {
  id: 'att-tk-1',
  examId: 'exam-tk-1',
  userId: 'u-1',
  status: 'in_progress',
  startedAt: '2026-09-01T10:00:00.000Z',
  submittedAt: null,
  gradedAt: null,
  timeRemainingSeconds: 1500,
  score: null,
  maxScore: null,
  percentageScore: null,
  passed: null,
  questionIds: ['q1'],
  metadata: {},
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  version: 1,
};

const question = {
  id: 'q1',
  questionText: 'Câu hỏi E2E?',
  questionType: 'multiple_choice',
  difficulty: 'easy',
  points: 1,
  hint: null,
  explanation: null,
  estimatedTimeSeconds: 30,
  topicId: 't1',
  options: [
    { id: 'o1', optionText: 'Lựa chọn A', sortOrder: 0 },
    { id: 'o2', optionText: 'Lựa chọn B', sortOrder: 1 },
  ],
};

test.describe('TC-EXAMTAKING-001: /student/exams/:examId/take renders the question and the submit flow', () => {
  test('should display exam title + clock, then post the submission on confirm', async ({
    page,
  }) => {
    // Mock exam detail + start + attempt detail endpoints.
    await page.route('**/api/exams/exam-tk-1', async (route) => {
      if (route.request().method() === 'POST') {
        // startExam (POST /api/exams/:id/start)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'ok',
            timestamp: new Date().toISOString(),
            data: { attempt, totalQuestions: 1 },
          }),
        });
        return;
      }
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
    await page.route('**/api/exams/exam-tk-1/start', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          timestamp: new Date().toISOString(),
          data: { attempt, totalQuestions: 1 },
        }),
      });
    });
    await page.route('**/api/attempts/att-tk-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          timestamp: new Date().toISOString(),
          data: { attempt, questions: [question], includeCorrectAnswers: false },
        }),
      });
    });

    // Capture the submission call.
    let submittedBody: { answers: unknown; isAutoSubmit: boolean } | null = null;
    await page.route('**/api/exams/exam-tk-1/submissions', async (route) => {
      submittedBody = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          timestamp: new Date().toISOString(),
          data: {
            attemptId: 'att-tk-1',
            submittedAt: new Date().toISOString(),
            autoSubmitted: false,
          },
        }),
      });
    });

    const errors = await catchConsoleErrors(page, async () => {
      // Pin Date.now() to the exam's start instant so the countdown reads
      // the full duration (30:00) and never ticks down on wall-clock time.
      // setInterval still fires (it's wall-clock driven) but every
      // Date.now() inside the callback returns the same instant.
      await page.clock.setFixedTime(new Date('2026-09-01T10:00:00.000Z'));

      const examPage = new ExamTakingPage(page);
      await examPage.goto('exam-tk-1');

      // The exam root loaded.
      await examPage.expectLoaded();

      // The clock shows the full duration (30:00).
      await pwExpect(examPage.clock).toHaveText(/00:30:00/);

      // Click the first option so the answer is non-empty when submitted.
      await examPage.selectFirstOption();

      // Open the submit modal and confirm via the page object's locale-
      // agnostic locators (the spec text was Vietnamese in an earlier
      // version; the PO matches both "Nộp bài" / "Submit" and
      // "Xác nhận nộp bài" / "Confirm submission").
      await examPage.openSubmitModal();
      await examPage.clickSubmitFinal();
    });

    pwExpect(errors).toHaveLength(0);
    // The submission call hit the mocked endpoint with the expected envelope.
    pwExpect(submittedBody).not.toBeNull();
    pwExpect(submittedBody!.isAutoSubmit).toBe(false);
    pwExpect(Array.isArray(submittedBody!.answers)).toBe(true);
  });
});
