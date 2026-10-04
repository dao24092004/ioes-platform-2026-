/**
 * Wave 2D — E2E Page Object: DiscussionsPage (student).
 *
 * Routes: /student/discussions, /student/discussions/:courseId
 *
 * DiscussionsPage is a `ComingSoon` wrapper (discussions backend not yet
 * available). The same component is rendered for both routes.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class DiscussionsPage {
  readonly page: Page;
  readonly root: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('discussions-page');
  }

  async goto(courseId = 'course-1'): Promise<void> {
    await this.page.goto(`/student/discussions/${courseId}`);
  }

  async gotoIndex(): Promise<void> {
    await this.page.goto('/student/discussions');
  }

  async expectPage(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async expectComingSoon(): Promise<void> {
    // The ComingSoon h1 carries the locale-agnostic testid we added.
    await expect(this.page.getByTestId('coming-soon-title')).toBeVisible();
  }
}
