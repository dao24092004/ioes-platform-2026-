/** Wave 3B — E2E: instructor course creation (/instructor/courses/create) */
import { test, expect, type Page } from '@playwright/test';
import { InstructorCourseCreatePage } from '../pages/instructor/InstructorCourseCreatePage';

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

const NEW_COURSE_ID = 'c-mocked-777';

const createdCourse = {
  id: NEW_COURSE_ID,
  instructorId: 'i-1',
  categoryId: 'cat-1',
  title: 'placeholder',
  slug: 'placeholder',
  shortDescription: null,
  description: null,
  thumbnailUrl: null,
  previewVideoUrl: null,
  price: 0,
  currency: 'VND',
  durationHours: null,
  difficultyLevel: 1,
  language: 'vi',
  status: 'draft',
  reviewStatus: null,
  rejectionReason: null,
  publishedAt: null,
  stats: null,
  createdAt: '2026-10-04T00:00:00Z',
  updatedAt: '2026-10-04T00:00:00Z',
};

const categories = [
  {
    id: 'cat-1',
    name: 'Lập trình',
    slug: 'lap-trinh',
    description: null,
    parentId: null,
    icon: null,
    sortOrder: 1,
  },
];

test.describe('TC-ICOURSEADD-001: /instructor/courses/create', () => {
  test('TC-ICOURSEADD-001: should POST the diacritic-free slug and page defaults, then navigate to the edit route of the new course when a draft is saved', async ({
    page,
  }) => {
    // The one mutating call. Captured, never forwarded to the real backend.
    const postedBodies: unknown[] = [];
    await page.route('**/api/v1/courses', async (route) => {
      if (route.request().method() === 'POST') {
        postedBodies.push(route.request().postDataJSON());
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(createdCourse),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          meta: { total: 0, page: 1, perPage: 100, totalPages: 0 },
        }),
      });
    });
    await page.route('**/api/v1/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(categories),
      });
    });

    // The edit page the app should land on afterwards.
    await page.route('**/api/v1/courses/**/detail', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          course: { ...createdCourse, title: 'Lập Trình TypeScript Nâng Cao' },
          chapters: [],
        }),
      });
    });

    const errors = await catchConsoleErrors(page, async () => {
      const form = new InstructorCourseCreatePage(page);
      await form.goto();
      await form.expectLoaded();

      await form.fillBasics('Lập Trình TypeScript Nâng Cao', 'cat-1');
      await form.fillShortDescription('Từ khoá tiếng Việt có dấu');
      await form.goToPricing();
      await form.choosePaidWithPrice('499000');
      await form.saveDraft();

      // The app must navigate to the edit route of the id the mock returned.
      await expect(form.page.getByTestId('instructor-course-form-title')).toHaveValue(
        'Lập Trình TypeScript Nâng Cao'
      );
      await expect(form.page).toHaveURL('/instructor/courses/' + NEW_COURSE_ID + '/edit');
    });

    expect(errors).toEqual([]);

    // Exactly one create call, and the browser sent the expected JSON body.
    expect(postedBodies).toHaveLength(1);
    const body = postedBodies[0] as Record<string, unknown>;
    expect(body.title).toBe('Lập Trình TypeScript Nâng Cao');
    expect(body.shortDescription).toBe('Từ khoá tiếng Việt có dấu');
    expect(body.categoryId).toBe('cat-1');
    expect(body.price).toBe(499000);
    expect(body.currency).toBe('VND');
    expect(body.language).toBe('vi');
    expect(body.difficultyLevel).toBe(1);
    // De-accented, lowercased, dash-separated, plus the Date.now() base36 suffix.
    expect(body.slug).toMatch(/^lap-trinh-typescript-nang-cao-[a-z0-9]+$/);
  });
});
