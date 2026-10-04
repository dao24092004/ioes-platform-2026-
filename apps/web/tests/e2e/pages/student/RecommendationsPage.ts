/**
 * Wave 2D — E2E Page Object: RecommendationsPage (student).
 *
 * Route: /student/recommendations
 * Network: GET /api/ai/recommendations/courses, /api/v1/categories
 *
 * Locators: the page root is `data-testid="recommendations-page"`. The
 * header "Refresh" button is the only header-level action. Each course
 * card has a "View detail" link to /student/courses/:id.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class RecommendationsPage {
  readonly page: Page;
  readonly root: Locator;
  readonly refreshButton: Locator;
  readonly viewDetailLinks: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('recommendations-page');
    this.refreshButton = page.getByTestId('recommendations-refresh');
    this.viewDetailLinks = this.root.locator('a[href^="/student/courses/"]');
    this.emptyState = page.getByTestId('recommendations-empty');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/recommendations');
  }

  async expectPage(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async clickRefresh(): Promise<void> {
    await this.refreshButton.click();
  }

  async expectCardCount(count: number): Promise<void> {
    await expect(this.viewDetailLinks).toHaveCount(count);
  }

  async expectEmpty(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }
}
