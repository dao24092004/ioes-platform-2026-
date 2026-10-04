/**
 * Wave 2D — E2E Page Object: SearchPage (student).
 *
 * Route: /student/search
 * Network: GET /api/v1/courses?search=...&status=published&per_page=50
 *          GET /api/v1/categories
 *
 * Locators: the page root is `data-testid="search-page"`. The search input
 * is the only `<input type="search">` on the page. Result cards are links
 * to `/student/courses/:id`.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class SearchPage {
  readonly page: Page;
  readonly root: Locator;
  readonly searchInput: Locator;
  readonly resultLinks: Locator;
  readonly emptyMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('search-page');
    this.searchInput = page.getByPlaceholder(/Search courses/i);
    this.resultLinks = page.locator('a[href^="/student/courses/"]');
    this.emptyMessage = page.getByText(/No results found/i);
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/search');
  }

  async expectPage(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
  }

  async expectEmptyMessage(): Promise<void> {
    await expect(this.emptyMessage).toBeVisible();
  }

  async expectResultCount(count: number): Promise<void> {
    await expect(this.resultLinks).toHaveCount(count);
  }
}
