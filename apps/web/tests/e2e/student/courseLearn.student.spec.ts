/** Wave 2A — E2E: student learn page (/student/learn/:courseId) */
import { test, expect, type Page } from '@playwright/test';
import { CourseLearnPage } from '../pages/student/CourseLearnPage';

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
        {
          id: 'l-2',
          chapterId: 'ch-1',
          title: 'Setup',
          description: null,
          lessonType: 'video',
          contentUrl: null,
          durationMinutes: 10,
          sortOrder: 2,
          isFree: null,
          isPreview: false,
        },
      ],
    },
  ],
};

const enrolledState = {
  enrolled: true,
  enrollment: {
    id: 'en-1',
    courseId: 'c-1',
    userId: 'u-1',
    status: 'active',
    progressPercent: 0,
    enrolledAt: '2026-09-01T00:00:00Z',
    completedAt: null,
    lastAccessedAt: '2026-10-01T00:00:00Z',
  },
  completedLessonIds: [],
};

test.describe('TC-LEARN-001: /student/learn/:courseId renders the lesson tree, Mark complete button, and PUTs progress on click with no console errors', () => {
  test('should render back-to-course link, two lesson entries, Mark complete button, and the PUT is fired on click', async ({
    page,
  }) => {
    // Track the PUT call to /api/v1/courses/c-1/lessons/l-1/progress.
    let markCompleteCalled = 0;

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
        body: JSON.stringify(enrolledState),
      });
    });
    await page.route('**/api/v1/courses/c-1/lessons/**/progress', async (route) => {
      if (route.request().method() === 'PUT') {
        markCompleteCalled += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            enrolled: true,
            enrollment: enrolledState.enrollment,
            completedLessonIds: ['l-1'],
          }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    // Lesson video URL is loaded by the browser as a media resource. Mock it
    // so the browser does not attempt a real network fetch (which would emit
    // a console error and inflate our `errors` collection).
    await page.route('**/*.mp4', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'video/mp4',
        body: '',
      });
    });

    const errors = await catchConsoleErrors(page, async () => {
      const learn = new CourseLearnPage(page);
      await learn.goto('c-1', 'l-1');

      await learn.expectBackToCourseLink();
      await learn.expectLessonButton('l-1');
      await learn.expectLessonButton('l-2');
      await learn.expectMarkCompleteButton();

      await learn.clickMarkComplete();
    });

    expect(markCompleteCalled).toBe(1);
    expect(errors).toHaveLength(0);
  });
});
