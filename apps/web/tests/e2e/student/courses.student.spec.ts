/** Wave 2A — E2E: student courses page (/student/courses) */
import { test, expect, type Page } from '@playwright/test';
import { CoursesPage } from '../pages/student/CoursesPage';

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
  shortDescription: 'Brief intro',
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
  stats: { enrollments: 100 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const course1 = { ...baseCourse, id: 'c-1', title: 'Algebra 101', slug: 'algebra-101' };
const course2 = { ...baseCourse, id: 'c-2', title: 'Geometry Foundations', slug: 'geometry' };

const coursesPage = {
  data: [course1, course2],
  meta: { total: 2, page: 1, perPage: 6, totalPages: 1 },
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
  course: { ...baseCourse, id: 'c-1', title: 'Algebra 101', slug: 'algebra-101' },
};

test.describe('TC-COURSES-005: /student/courses renders catalogue with two cards, search input, and header Search link with no console errors', () => {
  test('should render catalogue heading, two course cards, search input, and header Search link', async ({
    page,
  }) => {
    // content-service: returns DTO directly (no envelope).
    await page.route('**/api/v1/courses**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(coursesPage),
      });
    });
    await page.route('**/api/v1/categories**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
    await page.route('**/api/v1/courses/enrollments/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([myEnrollment]),
      });
    });

    const errors = await catchConsoleErrors(page, async () => {
      const courses = new CoursesPage(page);
      await courses.goto();

      await courses.expectSearchInput();
      await courses.expectSearchLink();
      await courses.expectCourseCardCount(2);
      await courses.expectCourseCardLink('c-1');
      await courses.expectCourseCardLink('c-2');
    });

    expect(errors).toHaveLength(0);
  });
});
