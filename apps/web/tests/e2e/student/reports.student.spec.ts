/** Wave 2C — E2E: student reports page (/student/reports) */
import { test, expect, type Page } from '@playwright/test';
import { ReportsPage } from '../pages/student/ReportsPage';

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

const courseView = {
  id: 'c-1',
  instructorId: 'i-1',
  categoryId: null,
  title: 'Algebra 101',
  slug: 'algebra-101',
  shortDescription: null,
  description: null,
  thumbnailUrl: null,
  previewVideoUrl: null,
  price: 0,
  currency: 'VND',
  durationHours: 10,
  difficultyLevel: 1,
  language: 'vi',
  status: 'published',
  reviewStatus: 'approved',
  rejectionReason: null,
  publishedAt: '2026-01-01T00:00:00Z',
  stats: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const myEnrollment = {
  enrollment: {
    id: 'en-1',
    courseId: 'c-1',
    userId: 'u-1',
    status: 'completed',
    progressPercent: 100,
    enrolledAt: '2026-09-01T00:00:00Z',
    completedAt: '2026-10-01T00:00:00Z',
    lastAccessedAt: '2026-10-02T00:00:00Z',
  },
  course: courseView,
};

const analyticsPayload = {
  userId: 'u-1',
  totalExamsAttempted: 1,
  totalExamsPassed: 1,
  totalExamsFailed: 0,
  passRate: 100,
  avgScore: 80,
  highestScore: 80,
  totalCoursesEnrolled: 1,
  totalCoursesCompleted: 1,
  currentStreak: 5,
  longestStreak: 12,
  totalStudyMinutes: 60,
  lastExamAt: '2026-10-02T00:00:00Z',
  lastLoginAt: '2026-10-02T00:00:00Z',
};

const examView = {
  id: 'e-1',
  courseId: 'c-1',
  instructorId: 'i-1',
  title: 'Algebra Midterm',
  description: null,
  examType: 'practice',
  timeLimitMinutes: 30,
  passingScore: 70,
  maxAttempts: 3,
  isRandomized: false,
  showResults: true,
  isProctored: false,
  metadata: {},
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  deletedAt: null,
  version: 1,
};

const attemptView = {
  id: 'a-1',
  examId: 'e-1',
  userId: 'u-1',
  status: 'graded',
  startedAt: '2026-10-01T00:00:00Z',
  submittedAt: '2026-10-02T00:00:00Z',
  gradedAt: '2026-10-02T00:00:00Z',
  timeRemainingSeconds: 0,
  score: 80,
  maxScore: 100,
  percentageScore: 80,
  passed: true,
  questionIds: null,
  metadata: {},
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-02T00:00:00Z',
  version: 1,
};

test.describe('TC-REPORTS-001: /student/reports renders four stat cards, the recent-course card with the latest enrollment title, and zero console errors', () => {
  test('should render stat cards + recent-course title from the mocked enrollment payload', async ({
    page,
  }) => {
    // content-service: returns DTO directly (no envelope).
    await page.route('**/api/v1/courses/enrollments/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([myEnrollment]),
      });
    });
    // exam-suite + analytics-service.
    await page.route('**/api/attempts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope([attemptView])),
      });
    });
    await page.route('**/api/exams**', async (r) => {
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(examView)),
      });
    });
    await page.route('**/api/analytics/users/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(analyticsPayload)),
      });
    });

    const errors = await catchConsoleErrors(page, async () => {
      const reports = new ReportsPage(page);
      await reports.goto();

      await reports.expectStatCards();
      // Stat values come from the analytics + enrollment mocks. Each card
      // has its own data-testid wrapper, so we can assert on text without
      // confusing them with the same number on the chart or recent card.
      await reports.expectStatEnrolledText(/1/);
      // 1 course row from the enrollment fixture.
      await reports.expectCourseRowCount(1);
      await reports.expectRecentCourseVisible();
    });

    expect(errors).toHaveLength(0);
  });
});
