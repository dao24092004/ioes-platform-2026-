/** Wave 2A — E2E: student course detail page (/student/courses/:courseId) */
import { test, expect, type Page } from '@playwright/test';
import { CourseDetailPage } from '../pages/student/CourseDetailPage';

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

const courseView = {
  id: 'c-1',
  instructorId: 'i-1',
  categoryId: null,
  title: 'Algebra 101',
  slug: 'algebra-101',
  shortDescription: 'Learn algebra basics',
  description: 'A complete course on algebraic fundamentals.',
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
  stats: { enrollments: 200 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const detail = {
  course: courseView,
  chapters: [
    {
      id: 'ch-1',
      courseId: 'c-1',
      title: 'Getting Started',
      description: null,
      sortOrder: 1,
      isFree: null,
      lessons: [
        {
          id: 'l-1',
          chapterId: 'ch-1',
          title: 'Welcome',
          description: null,
          lessonType: 'video',
          contentUrl: 'https://cdn.example.com/intro.mp4',
          durationMinutes: 5,
          sortOrder: 1,
          isFree: null,
          isPreview: true,
        },
      ],
    },
  ],
};

const notEnrolledState = {
  enrolled: false,
  enrollment: null,
  completedLessonIds: [],
};

test.describe('TC-COURSEDETAIL-001: /student/courses/:courseId renders the four tabs, Learn button, and Enroll button with no console errors', () => {
  test('should render the four tab buttons, the Learn button on the banner, and the Enroll button in the side card', async ({
    page,
  }) => {
    // content-service: returns DTO directly (no envelope).
    await page.route('**/api/v1/courses/c-1/detail', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(detail),
      });
    });
    await page.route('**/api/v1/courses/c-1/enrollment', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(notEnrolledState),
      });
    });
    await page.route('**/api/v1/categories**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    const errors = await catchConsoleErrors(page, async () => {
      const detail = new CourseDetailPage(page);
      await detail.goto('c-1');

      await detail.expectAllTabs();
      await detail.expectLearnButton();
      await detail.expectEnrollButton();
    });

    expect(errors).toHaveLength(0);
  });
});
