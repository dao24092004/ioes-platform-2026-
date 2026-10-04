/** Wave 2A — E2E: student enrollment page (/student/enrollment) */
import { test, expect, type Page } from '@playwright/test';
import { EnrollmentPage } from '../pages/student/EnrollmentPage';

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

const baseCourse = {
  instructorId: 'i-1',
  categoryId: null,
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

const activeEnrollment = {
  enrollment: {
    id: 'en-1',
    courseId: 'c-1',
    userId: 'u-1',
    status: 'active',
    progressPercent: 50,
    enrolledAt: '2026-09-01T00:00:00Z',
    completedAt: null,
    lastAccessedAt: '2026-10-01T00:00:00Z',
  },
  course: { ...baseCourse, id: 'c-1', title: 'Algebra 101', slug: 'algebra-101' },
};

const completedEnrollment = {
  enrollment: {
    id: 'en-2',
    courseId: 'c-2',
    userId: 'u-1',
    status: 'completed',
    progressPercent: 100,
    enrolledAt: '2026-08-01T00:00:00Z',
    completedAt: '2026-09-15T00:00:00Z',
    lastAccessedAt: '2026-09-15T00:00:00Z',
  },
  course: { ...baseCourse, id: 'c-2', title: 'Geometry Foundations', slug: 'geometry' },
};

test.describe('TC-ENROLL-001: /student/enrollment renders Continue link per row and the two-step cancel confirmation fires DELETE on the second click with no console errors', () => {
  test('should render two Continue links, surface the confirm block after the first Cancel click, and fire DELETE on the second click', async ({
    page,
  }) => {
    let deleteCalled = 0;

    await page.route('**/api/v1/courses/enrollments/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([activeEnrollment, completedEnrollment]),
      });
    });
    await page.route('**/api/v1/courses/c-1/enrollment', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCalled += 1;
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    const errors = await catchConsoleErrors(page, async () => {
      const enrollments = new EnrollmentPage(page);
      await enrollments.goto();

      await enrollments.expectFilters();
      await enrollments.expectContinueLinkCount(2);

      // First click on the first-row Cancel — confirm block appears, no DELETE yet.
      await enrollments.clickFirstCancel();
      await enrollments.expectCancelConfirm();
      expect(deleteCalled).toBe(0);

      // Second click on the confirm button — DELETE fires.
      await enrollments.clickCancelConfirm();
    });

    expect(deleteCalled).toBe(1);
    expect(errors).toHaveLength(0);
  });
});
