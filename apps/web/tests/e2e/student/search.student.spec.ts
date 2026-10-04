/** Wave 2D — E2E: /student/search */
import { test, expect } from '@playwright/test';
import { SearchPage } from '../pages/student/SearchPage';

const course = {
  id: 'c-1',
  instructorId: 'i-1',
  categoryId: 'cat-1',
  title: 'React Fundamentals',
  slug: 'react-fundamentals',
  shortDescription: 'Learn React',
  description: null,
  thumbnailUrl: null,
  previewVideoUrl: null,
  price: 0,
  currency: null,
  durationHours: null,
  difficultyLevel: null,
  language: null,
  status: 'published',
  reviewStatus: 'approved',
  rejectionReason: null,
  publishedAt: '2026-01-01T00:00:00Z',
  stats: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

test.describe('TC-SEARCH-001: /student/search end-to-end', () => {
  test('should fire search with status=published after the 300ms debounce and render the result link', async ({
    page,
  }) => {
    let capturedParams: Record<string, unknown> = {};
    await page.route('**/api/v1/courses**', async (route) => {
      const url = new URL(route.request().url());
      capturedParams = Object.fromEntries(url.searchParams);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [course],
          meta: { total: 1, page: 1, perPage: 50, totalPages: 1 },
        }),
      });
    });
    await page.route('**/api/v1/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'cat-1',
            name: 'Web Dev',
            slug: 'web-dev',
            description: null,
            parentId: null,
            icon: null,
            sortOrder: null,
          },
        ]),
      });
    });

    const search = new SearchPage(page);
    await search.goto();
    await search.search('react');
    // Wait past the 300ms debounce.
    await expect.poll(() => capturedParams.search, { timeout: 2000 }).toBe('react');
    expect(capturedParams.status).toBe('published');
    await search.expectResultCount(1);
  });
});
