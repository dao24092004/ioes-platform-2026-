/** Wave 3C — E2E: /instructor/grading (role = instructor) */
import { test, expect } from '@playwright/test';
import { InstructorGradingPage } from '../pages/instructor/InstructorGradingPage';

const EXAM_ID = 'exam-e2e-1';
const ATTEMPT_ID = 'attempt-e2e-1';

const envelope = (data: unknown) => ({
  success: true,
  message: 'OK',
  data,
  timestamp: '2026-09-01T00:00:00.000Z',
});

test.describe('/instructor/grading: auto-grade flow', () => {
  test('TC-GRADING-001: should post to the attempt grade endpoint, show the graded score banner and refetch the queue when the auto-grade button is clicked', async ({
    page,
  }) => {
    // Every call the page makes is fulfilled locally. Nothing reaches the
    // shared instructor account, and no data of theirs is read either.
    const gradeCalls: string[] = [];
    let queueFetches = 0;

    await page.route('**/api/exams/grading/stats', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope({ pending: 1, graded: 4, oldestPendingSubmittedAt: null })),
      })
    );

    await page.route('**/api/exams/grading/queue*', (route) => {
      queueFetches += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          envelope([
            {
              attemptId: ATTEMPT_ID,
              examId: EXAM_ID,
              userId: 'user-e2e-0001',
              submittedAt: '2026-09-01T00:00:00.000Z',
              waitingSeconds: 300,
              score: null,
              maxScore: null,
            },
          ])
        ),
      });
    });

    await page.route('**/api/exams', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          envelope([
            {
              id: EXAM_ID,
              courseId: null,
              instructorId: 'i-e2e',
              title: 'Bài thi E2E',
              description: null,
              examType: 'graded',
              timeLimitMinutes: 30,
              passingScore: 50,
              maxAttempts: 1,
              isRandomized: false,
              showResults: true,
              isProctored: false,
              metadata: {},
              createdAt: '2026-09-01T00:00:00.000Z',
              updatedAt: '2026-09-01T00:00:00.000Z',
              deletedAt: null,
              version: 1,
            },
          ])
        ),
      })
    );

    await page.route('**/api/exams/*/submissions/*/grade', (route) => {
      gradeCalls.push(route.request().url());
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          envelope({
            score: 8,
            maxScore: 10,
            percentageScore: 80,
            passed: true,
            autoGradedCount: 5,
            manualGradedCount: 0,
            finalGrading: false,
          })
        ),
      });
    });

    const grading = new InstructorGradingPage(page);
    await grading.goto();
    await grading.expectQueueLoaded();

    // The queued attempt is identified by the exam title resolved from the
    // instructor's own exam list, and shows the placeholder score.
    await expect(grading.queue).toContainText('Bài thi E2E');
    await expect(grading.queue).toContainText('user-e2e');
    await expect(grading.stats).toContainText('1');
    expect(gradeCalls, 'no grade call before the button is pressed').toHaveLength(0);
    const fetchesBeforeGrade = queueFetches;

    await grading.gradeFirstRow();

    // Success banner i18n: "Đã chấm: 8/10 (80.0%)" (vi) /
    // "Graded: 8/10 (80.0%)" (en) — the percentage is always one decimal.
    await expect(grading.successBanner).toBeVisible();
    await expect(grading.successBanner).toHaveText(
      /Đã chấm: 8\/10 \(80\.0%\)|Graded: 8\/10 \(80\.0%\)/
    );
    await expect(grading.gradeErrorBanner).toHaveCount(0);

    // The mutation went to the attempt-scoped grade path for this exam.
    expect(gradeCalls).toHaveLength(1);
    expect(gradeCalls[0]).toContain(`/api/exams/${EXAM_ID}/submissions/${ATTEMPT_ID}/grade`);

    // onSuccess invalidates ['exams','grading'], so the queue is refetched.
    await expect.poll(() => queueFetches, { timeout: 10_000 }).toBeGreaterThan(fetchesBeforeGrade);
  });
});
