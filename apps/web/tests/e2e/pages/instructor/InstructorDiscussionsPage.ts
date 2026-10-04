/**
 * Wave 3D — E2E Page Object: DiscussionsPage (instructor).
 *
 * Routes: /instructor/discussions and /instructor/discussions/:courseId
 * Network: none — the page is a `ComingSoon` wrapper that never reads the
 * `:courseId` param and never asks the backend for threads.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class InstructorDiscussionsPage {
  readonly page: Page;

  readonly root: Locator;
  readonly title: Locator;
  readonly badge: Locator;
  readonly missingHeading: Locator;
  readonly missingItems: Locator;

  constructor(page: Page) {
    this.page = page;

    this.root = page.getByTestId('instructor-discussions-page');
    this.title = page.getByTestId('coming-soon-title');
    this.badge = page.getByText(/sắp phát triển|coming soon/i).first();
    this.missingHeading = page.getByText(/còn thiếu|what is missing/i).first();
    this.missingItems = page.getByTestId('instructor-discussions-page').locator('li');
  }

  /** Navigate to the index route. */
  async goto(): Promise<void> {
    await this.page.goto('/instructor/discussions');
  }

  /** Navigate to the course-scoped route, e.g. `c-1`. */
  async gotoCourse(courseId: string): Promise<void> {
    await this.page.goto(`/instructor/discussions/${courseId}`);
  }

  async expectPage(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async expectComingSoonCopy(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.title).toHaveText(/thảo luận|discussion/i);
    await expect(this.badge).toBeVisible();
    await expect(this.missingHeading).toBeVisible();
  }

  async expectMissingItems(count: number): Promise<void> {
    await expect(this.missingItems).toHaveCount(count);
  }
}
