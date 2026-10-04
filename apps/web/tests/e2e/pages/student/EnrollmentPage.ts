/**
 * Wave 2A — E2E Page Object: EnrollmentPage (student)
 *
 * Wraps all enrollment-list interactions used by
 * `tests/e2e/enrollment.student.spec.ts`. All selectors use data-testid
 * attributes that exist on the page source:
 *   - enrollment-filter-{all,active,completed} → status filter chips
 *   - enrollment-cancel-button          → first-click cancel trigger
 *   - enrollment-cancel-confirm         → confirm wrapper (two-step cancel)
 *   - enrollment-cancel-confirm-button  → final cancel button (fires DELETE)
 *   - enrollment-continue-link          → per-row Continue link
 *
 * data-testid file:line (src/pages/student/EnrollmentPage.tsx):
 *   - line 60-64:  enrollment-filter-all, enrollment-filter-active, enrollment-filter-completed
 *   - line 156:    enrollment-cancel-button
 *   - line 116:    enrollment-cancel-confirm
 *   - line 121:    enrollment-cancel-confirm-button
 *   - line 142:    enrollment-continue-link
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class EnrollmentPage {
  readonly page: Page;

  readonly filterAll: Locator;
  readonly filterActive: Locator;
  readonly filterCompleted: Locator;
  readonly cancelButton: Locator;
  readonly cancelConfirm: Locator;
  readonly cancelConfirmButton: Locator;
  readonly continueLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.filterAll = page.getByTestId('enrollment-filter-all');
    this.filterActive = page.getByTestId('enrollment-filter-active');
    this.filterCompleted = page.getByTestId('enrollment-filter-completed');
    this.cancelButton = page.getByTestId('enrollment-cancel-button');
    this.cancelConfirm = page.getByTestId('enrollment-cancel-confirm');
    this.cancelConfirmButton = page.getByTestId('enrollment-cancel-confirm-button');
    this.continueLink = page.getByTestId('enrollment-continue-link');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/enrollment');
  }

  async clickFilterAll(): Promise<void> {
    await this.filterAll.click();
  }

  async clickFilterActive(): Promise<void> {
    await this.filterActive.click();
  }

  async clickFilterCompleted(): Promise<void> {
    await this.filterCompleted.click();
  }

  async expectFilters(): Promise<void> {
    await expect(this.filterAll).toBeVisible();
    await expect(this.filterActive).toBeVisible();
    await expect(this.filterCompleted).toBeVisible();
  }

  async expectContinueLinks(): Promise<void> {
    await expect(this.continueLink.first()).toBeVisible();
  }

  async expectContinueLinkCount(count: number): Promise<void> {
    await expect(this.continueLink).toHaveCount(count);
  }

  async clickFirstCancel(): Promise<void> {
    await this.cancelButton.first().click();
  }

  async expectCancelConfirm(): Promise<void> {
    await expect(this.cancelConfirm).toBeVisible();
  }

  async clickCancelConfirm(): Promise<void> {
    await this.cancelConfirmButton.click();
  }
}
