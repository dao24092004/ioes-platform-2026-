/** Wave 3A — E2E: instructor students page (`/instructor/students`). */
import { test, expect, type Page } from '@playwright/test';
import { InstructorStudentsPage } from '../pages/instructor/InstructorStudentsPage';

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

/**
 * Three students with progress 100 / 50 / 25, one of them `completed`.
 * The page's `stats` useMemo must derive total=3, completed=1,
 * avg=Math.round(175/3)=58.
 */
const mockStudentsReads = async (page: Page): Promise<void> => {
  await page.route('**/api/v1/courses/students**', (route) =>
    route.fulfill({
      json: [
        {
          enrollment: {
            id: 'en-1',
            courseId: 'c-1',
            userId: 'u-1',
            status: 'completed',
            progressPercent: 100,
            enrolledAt: '2026-01-02T00:00:00Z',
            completedAt: '2026-02-01T00:00:00Z',
            lastAccessedAt: null,
          },
          studentName: 'Nguyen Van A',
          studentEmail: 'a@ioes.com',
          courseTitle: 'React',
        },
        {
          enrollment: {
            id: 'en-2',
            courseId: 'c-1',
            userId: 'u-2',
            status: 'active',
            progressPercent: 50,
            enrolledAt: '2026-01-03T00:00:00Z',
            completedAt: null,
            lastAccessedAt: null,
          },
          studentName: 'Nguyen Van B',
          studentEmail: 'b@ioes.com',
          courseTitle: 'React',
        },
        {
          enrollment: {
            id: 'en-3',
            courseId: 'c-1',
            userId: 'u-3',
            status: 'active',
            progressPercent: 25,
            enrolledAt: '2026-01-04T00:00:00Z',
            completedAt: null,
            lastAccessedAt: null,
          },
          // studentName is a nullable snapshot column: the page must fall back.
          studentName: null,
          studentEmail: null,
          courseTitle: 'React',
        },
      ],
    })
  );

  await page.route('**/api/v1/courses?**', (route) =>
    route.fulfill({
      json: {
        data: [{ id: 'c-1', title: 'React' }],
        meta: { total: 1, page: 1, perPage: 100, totalPages: 1 },
      },
    })
  );
};

test.describe('TC-STUDENTS-001: /instructor/students', () => {
  test('TC-STUDENTS-001: should render the students table with a consistent total/completed/average stat derivation and zero console errors when an instructor with a valid session opens it', async ({
    page,
  }) => {
    await mockStudentsReads(page);

    const errors = await catchConsoleErrors(page, async () => {
      const students = new InstructorStudentsPage(page);
      await students.goto();
      await students.expectLoaded();

      // The instructor guard let us through — we were not bounced to /auth/login.
      await expect(page).toHaveURL(/\/instructor\/students$/);

      await students.expectStatsVisible();
      await students.expectCourseFilterOptions();

      // One row per student, plus the unknown-name fallback for the null name.
      await expect(students.studentRows).toHaveCount(3);
      await expect(students.rows.getByText('Nguyen Van A')).toBeVisible();
      await expect(students.rows.getByText(/Không có tên|No name/i)).toBeVisible();

      // Stats-derivation sanity check against the mocked rows.
      const stats = await students.readStatValues();
      expect(stats.total).toBe('3');
      expect(stats.completed).toBe('1');
      expect(stats.avg).toBe('58%');
    });

    expect(errors).toEqual([]);
  });
});
