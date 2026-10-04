/** Wave 3C — E2E: /instructor/exams (role = instructor) */
import { test, expect } from '@playwright/test';
import { InstructorExamsPage } from '../pages/instructor/InstructorExamsPage';

/** A `student` session — the wrong role for every /instructor/* route. */
const STUDENT_SESSION = JSON.stringify({
  state: {
    user: {
      id: 'user-wrong-role',
      email: 'wrong-role@example.test',
      full_name: 'Wrong Role Student',
      role: 'student',
      avatar_url: null,
    },
    accessToken: 'fake.access.token',
    refreshToken: 'fake.refresh.token',
    isAuthenticated: true,
  },
  version: 0,
});

function envelope(data: unknown = null): string {
  return JSON.stringify({
    success: true,
    message: 'OK',
    data,
    timestamp: '2026-09-01T00:00:00.000Z',
  });
}

const meRoute =
  (role: 'student' | 'instructor') => async (route: import('@playwright/test').Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        id: role === 'instructor' ? 'user-instructor' : 'user-wrong-role',
        email: `${role}@example.test`,
        fullName: role === 'instructor' ? 'Giang Vien E2E' : 'Wrong Role Student',
        role,
        avatarUrl: null,
      }),
    });

const examFixture = (id: string, title: string) => ({
  id,
  courseId: null,
  instructorId: 'user-instructor',
  title,
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
});

test.describe('/instructor/exams: route, role guard and console', () => {
  test('TC-IEXAMS-001: should render the exam list for an instructor, redirect a wrong-role or anonymous session away, and log no console errors', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Land on the app once so there is an origin, and keep the real
    // instructor session so it can be restored after the guard probes.
    await page.goto('/auth/login');
    const instructorSession = await page.evaluate(() => window.localStorage.getItem('ioes-auth'));
    expect(instructorSession, 'instructor storageState reached localStorage').not.toBeNull();

    // Sandbox the API for the guard probes.
    await page.route('**/api/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: envelope() })
    );
    // Registered last so it wins over the catch-all above.
    await page.route('**/api/auth/me', meRoute('student'));

    // Probe 1 — role guard. A logged-in student must land on the student
    // home; ProtectedRoute redirects by role, so /auth/login would be wrong.
    await page.evaluate(
      (session) => window.localStorage.setItem('ioes-auth', session),
      STUDENT_SESSION
    );
    await page.goto('/instructor/exams');
    await expect(page).toHaveURL(/\/student(\/|$)/);
    await expect(new InstructorExamsPage(page).table).toHaveCount(0);

    // Probe 2 — auth guard. No session at all goes to the login form.
    await page.evaluate(() => window.localStorage.removeItem('ioes-auth'));
    await page.goto('/instructor/exams');
    await expect(page).toHaveURL(/\/auth\/login/);

    // Restore the real session and pin the two data reads the list page makes.
    await page.unroute('**/api/**');
    await page.unroute('**/api/auth/me');
    await page.route('**/api/auth/me', meRoute('instructor'));
    await page.route('**/api/exams', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope([
          examFixture('exam-e2e-1', 'Bài thi E2E giữa kỳ'),
          examFixture('exam-e2e-2', 'Bài thi E2E cuối kỳ'),
        ]),
      })
    );
    await page.evaluate(
      (session) => window.localStorage.setItem('ioes-auth', session),
      instructorSession!
    );

    // Only the real navigation's console output is asserted.
    errors.length = 0;
    const exams = new InstructorExamsPage(page);
    await exams.goto();
    await expect(page).toHaveURL(/\/instructor\/exams$/);
    await exams.expectListSettled();
    await expect(exams.stats).toBeVisible();
    await expect(exams.searchInput).toBeVisible();
    await expect(exams.statusFilters).toBeVisible();
    await expect(exams.createLink).toBeVisible();
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
