/** Wave 3B — E2E: instructor course list (/instructor/courses) */
import { test, expect, type Page } from '@playwright/test';
import { InstructorCoursesPage, COURSES_COPY } from '../pages/instructor/InstructorCoursesPage';

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

const course = (overrides: Record<string, unknown>) => ({
  id: 'c-1',
  instructorId: 'i-1',
  categoryId: 'cat-1',
  title: 'React Testing Deep Dive',
  slug: 'react-testing-deep-dive',
  shortDescription: 'A short summary',
  description: 'The long description',
  thumbnailUrl: null,
  previewVideoUrl: null,
  price: 0,
  currency: 'VND',
  durationHours: null,
  difficultyLevel: 2,
  language: 'vi',
  status: 'draft',
  reviewStatus: null,
  rejectionReason: null,
  publishedAt: null,
  stats: { enrollments: 12 },
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-02T00:00:00Z',
  ...overrides,
});

const listPayload = {
  data: [
    course({
      id: 'c-1',
      title: 'React Testing Deep Dive',
      status: 'published',
      reviewStatus: 'approved',
    }),
    course({
      id: 'c-2',
      title: 'Lập Trình TypeScript Nâng Cao',
      categoryId: null,
      stats: { enrollments: 3 },
    }),
  ],
  meta: { total: 2, page: 1, perPage: 100, totalPages: 1 },
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

test.describe('TC-ICOURSES-001: /instructor/courses', () => {
  test('TC-ICOURSES-001: should render the heading, stats, one row per course and the edit link with no console errors when the list query succeeds', async ({
    page,
  }) => {
    // Bare payloads, exactly as content-service returns them.
    await page.route('**/api/v1/courses?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(listPayload),
      });
    });
    await page.route('**/api/v1/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(categories),
      });
    });

    const errors = await catchConsoleErrors(page, async () => {
      const courses = new InstructorCoursesPage(page);
      await courses.goto();
      await courses.expectLoaded();

      // Two courses in the payload, so exactly two rows.
      await courses.expectRowCount(2);
      await courses.expectNoPlaceholderLeft();

      // The stats strip is part of the main content.
      await expect(courses.stats).toBeVisible();

      // Row 1 shows its title, the resolved category name and the edit link.
      const firstRow = await courses.firstRowText();
      expect(firstRow).toContain('React Testing Deep Dive');
      expect(firstRow).toContain('Lập trình');
      expect(await courses.firstEditLinkHref()).toBe('/instructor/courses/c-1/edit');

      // Row 2 has a null categoryId, so the uncategorised fallback is used.
      // Non-anchored regexes against the row's text: the label sits inside a
      // span that also holds an icon, so its own text is not exactly equal to
      // the label, and the row text is multi-line.
      const secondRow = await courses.rows.nth(1).innerText();
      expect(secondRow).toContain('Lập Trình TypeScript Nâng Cao');
      expect(secondRow).toMatch(COURSES_COPY.uncategorized);
      expect(secondRow).toMatch(COURSES_COPY.notSubmitted);

      // The header CTA points at the create route.
      expect(await courses.createLinkHref()).toBe('/instructor/courses/create');
    });

    expect(errors).toEqual([]);
  });
});
