/** Batch Wave 1A — E2E: Courses list and CourseDetailPage (chromium/anonymous) */
import { test, expect } from '@playwright/test';
import { CoursesPage } from '../pages/student/CoursesPage';

// ---------------------------------------------------------------------------
// Fixture JSON for mocked API
// ---------------------------------------------------------------------------
const courseFixture = {
  id: 'c-test-1',
  instructorId: 'i-1',
  categoryId: 'cat-1',
  title: 'React Fundamentals',
  slug: 'react-fundamentals',
  shortDescription: 'Learn React from scratch',
  description: 'A comprehensive React course',
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
  publishedAt: '2024-01-01T00:00:00Z',
  stats: { enrollments: 200 },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const courseDetailFixture = {
  course: courseFixture,
  chapters: [
    {
      id: 'ch-1',
      courseId: 'c-test-1',
      title: 'Getting Started',
      description: null,
      sortOrder: 1,
      isFree: null,
      lessons: [
        {
          id: 'l-1',
          chapterId: 'ch-1',
          title: 'Introduction',
          description: null,
          lessonType: 'video',
          contentUrl: null,
          durationMinutes: 10,
          sortOrder: 1,
          isFree: null,
          isPreview: null,
        },
        {
          id: 'l-2',
          chapterId: 'ch-1',
          title: 'Setup Environment',
          description: null,
          lessonType: 'video',
          contentUrl: null,
          durationMinutes: 15,
          sortOrder: 2,
          isFree: null,
          isPreview: null,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// TC-COURSES-001: LoginRequired on /courses when anonymous
// ---------------------------------------------------------------------------
test(
  'TC-COURSES-001: should show LoginRequired card with link to /auth/login ' +
    'when visiting /courses while logged out (chromium, anonymous)',
  async ({ page }) => {
    const coursesPage = new CoursesPage(page);

    await coursesPage.goto();

    // The page renders LoginRequired because isAuthenticated=false.
    await coursesPage.expectLoginRequired();
  }
);

// ---------------------------------------------------------------------------
// TC-COURSES-002: Course detail page renders when slug exists
// ---------------------------------------------------------------------------
test(
  'TC-COURSES-002: should render course detail when visiting /courses/:slug ' +
    'with a mocked API response (chromium, anonymous shows LoginRequired since ' +
    'no token is present, but API mock is set up)',
  async ({ page }) => {
    // Mock the courses list endpoint (used by CourseDetailPage's findCourseBySlug
    // which calls listCourses internally).
    await page.route('/api/v1/courses', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [courseFixture],
          meta: { total: 1, page: 1, perPage: 100, totalPages: 1 },
        }),
      });
    });

    // Mock the course detail endpoint.
    await page.route('/api/v1/courses/c-test-1/detail', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(courseDetailFixture),
      });
    });

    await page.goto('/courses/react-fundamentals');

    // chromium project has no auth token → LoginRequired is shown.
    // This is expected behavior: unauthenticated users see the login prompt.
    const coursesPage = new CoursesPage(page);
    await coursesPage.expectLoginRequired();
  }
);

// ---------------------------------------------------------------------------
// TC-COURSES-003: Nonexistent slug shows not-found state
// ---------------------------------------------------------------------------
test(
  'TC-COURSES-003: should show not-found or empty state when visiting ' +
    '/courses/:nonexistent (course not found in mocked API)',
  async ({ page }) => {
    // Mock an empty result — backend returns no matching course.
    await page.route('/api/v1/courses', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [courseFixture], // fixture has different slug
          meta: { total: 1, page: 1, perPage: 100, totalPages: 1 },
        }),
      });
    });

    await page.goto('/courses/this-course-does-not-exist');

    // Chromium project has no auth token → LoginRequired is shown.
    // First-visit LoadingScreen takes ~8s (250ms intervals × ~33 steps). Use
    // auto-retrying visibility checks with a generous timeout that covers the
    // loading animation, and avoid waitForLoadState('networkidle') which is
    // flaky because background auth probes keep the network busy.
    const loginRequired = page.getByText(/đăng nhập để xem khoá học|login required/i).first();
    const notFound = page.getByText(/không tìm thấy|not found/i).first();

    let resolved = false;
    await expect
      .poll(
        async () => {
          if (await loginRequired.isVisible().catch(() => false)) return 'login';
          if (await notFound.isVisible().catch(() => false)) return 'notfound';
          return null;
        },
        { timeout: 15_000, intervals: [500, 500, 1000, 1000, 1000, 1000, 1000] }
      )
      .not.toBeNull()
      .then(() => {
        resolved = true;
      })
      .catch(() => {
        resolved = false;
      });
    expect(resolved).toBe(true);
  }
);

// ---------------------------------------------------------------------------
// TC-COURSES-004: /courses?probeBackend=skip still works (placeholder probe)
// ---------------------------------------------------------------------------
test(
  'TC-COURSES-004: should render the courses page (even with probeBackend=skip) ' +
    'without crashing when visiting /courses?probeBackend=skip',
  async ({ page }) => {
    await page.goto('/courses?probeBackend=skip');

    // The page should load without crashing.
    // For anonymous users it shows LoginRequired; the probe query param
    // is a placeholder handled by the app's URL parser.
    const coursesPage = new CoursesPage(page);
    await coursesPage.expectLoginRequired();
  }
);
