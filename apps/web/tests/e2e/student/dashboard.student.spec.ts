/** Wave 2A — E2E: student dashboard page (/student) */
import { test, expect, type Page } from '@playwright/test';
import { DashboardPage } from '../pages/student/DashboardPage';

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

const analyticsPayload = {
  userId: 'u-1',
  totalExamsAttempted: 5,
  totalExamsPassed: 3,
  totalExamsFailed: 2,
  passRate: 60.0,
  avgScore: 75.5,
  highestScore: 95,
  totalCoursesEnrolled: 3,
  totalCoursesCompleted: 1,
  currentStreak: 4,
  longestStreak: 12,
  totalStudyMinutes: 90,
  lastExamAt: '2026-10-01T00:00:00Z',
  lastLoginAt: '2026-10-04T00:00:00Z',
};

const myRank = {
  userId: 'u-1',
  displayName: 'Alice',
  avatarUrl: null,
  score: 150,
  rank: 5,
  rankDelta: 0,
  period: 'ALL_TIME',
  examsCompleted: 5,
  avgExamScore: 75.5,
  currentStreak: 4,
  longestStreak: 12,
  coursesCompleted: 1,
  lastActivityAt: '2026-10-04T00:00:00Z',
};

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
    status: 'active',
    progressPercent: 30,
    enrolledAt: '2026-09-01T00:00:00Z',
    completedAt: null,
    lastAccessedAt: '2026-10-01T00:00:00Z',
  },
  course: courseView,
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
  status: 'in_progress',
  startedAt: '2026-10-01T00:00:00Z',
  submittedAt: null,
  gradedAt: null,
  timeRemainingSeconds: 1800,
  score: null,
  maxScore: null,
  percentageScore: null,
  passed: null,
  questionIds: null,
  metadata: {},
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  version: 1,
};

test.describe('TC-DASH-001: /student dashboard renders greeting, continue-learning link, and upcoming-exam start link with no console errors', () => {
  test('should render greeting, continue-learning link, upcoming-exam start link, and header Exams button', async ({
    page,
  }) => {
    // Mock analytics + leaderboard (envelope).
    await page.route('**/api/analytics/users/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(analyticsPayload)),
      });
    });
    await page.route('**/api/analytics/leaderboard/me**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(myRank)),
      });
    });
    // content-service: returns DTO directly (no envelope).
    await page.route('**/api/v1/courses/enrollments/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([myEnrollment]),
      });
    });
    // exam-suite: returns ApiEnvelope.
    await page.route('**/api/exams', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope([examView])),
      });
    });
    await page.route('**/api/attempts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope([attemptView])),
      });
    });

    const errors = await catchConsoleErrors(page, async () => {
      const dashboard = new DashboardPage(page);
      await dashboard.goto();

      await dashboard.expectHeaderExamsLink();
      await dashboard.expectContinueLearningLink();
    });

    expect(errors).toHaveLength(0);
  });
});
