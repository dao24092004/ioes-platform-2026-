/**
 * Wave 3D — E2E Page Object: CopyrightPage (instructor).
 *
 * Route: /instructor/copyright
 * Network: none — the page is a `ComingSoon` wrapper.
 *
 * `ComingSoon` already exposes `data-testid="coming-soon-title"`, so the page
 * object only adds the instructor-specific wrapper testid. The badge and the
 * missing-items list are matched bilingually because the app boots in
 * Vietnamese (`I18nProvider` defaults to `vi`).
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class InstructorCopyrightPage {
  readonly page: Page;

  readonly root: Locator;
  readonly title: Locator;
  readonly badge: Locator;
  readonly missingHeading: Locator;
  readonly missingItems: Locator;
  readonly noFakeDataNote: Locator;

  constructor(page: Page) {
    this.page = page;

    this.root = page.getByTestId('instructor-copyright-page');
    this.title = page.getByTestId('coming-soon-title');
    this.badge = page.getByText(/sắp phát triển|coming soon/i).first();
    this.missingHeading = page.getByText(/còn thiếu|what is missing/i).first();
    this.missingItems = page.getByTestId('instructor-copyright-page').locator('li');
    this.noFakeDataNote = page.getByText(
      /không hiển thị dữ liệu mẫu|no sample data|does not show sample/i
    );
  }

  async goto(): Promise<void> {
    await this.page.goto('/instructor/copyright');
  }

  async expectPage(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async expectComingSoonCopy(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.title).toHaveText(/bản quyền và chống đạo văn|copyright and plagiarism/i);
    await expect(this.badge).toBeVisible();
    await expect(this.missingHeading).toBeVisible();
  }

  async expectMissingItems(count: number): Promise<void> {
    await expect(this.missingItems).toHaveCount(count);
  }

  async expectNoFakeDataNote(): Promise<void> {
    await expect(this.noFakeDataNote).toBeVisible();
  }
}
