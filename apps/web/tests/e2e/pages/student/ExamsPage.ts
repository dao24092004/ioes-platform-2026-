// apps/web/tests/e2e/pages/student/ExamsPage.ts
// Page Object for the student exams list (/student/exams).
// All raw selectors live here — spec files must not embed selectors.
//
// data-testid attributes used:
//   - exams-page             → ExamsPage.tsx filter bar wrapper
//   - exams-search-input     → ExamsPage.tsx search <input> (NEW)
//
// Locator strategy: rely on testid first; fall back to role + i18n label
// for the rest (no XPath / nth-child / index selectors allowed).
import { type Page, type Locator, expect } from '@playwright/test';

export class ExamsPage {
  readonly page: Page;
  readonly root: Locator;
  readonly searchInput: Locator;
  readonly startLinks: Locator;
  readonly viewResultLinks: Locator;
  readonly titleHeading: Locator;
  readonly statusFilterAll: Locator;
  readonly statusFilterAvailable: Locator;
  readonly statusFilterInProgress: Locator;
  readonly statusFilterCompleted: Locator;
  readonly sortSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('exams-page');
    this.searchInput = page.getByTestId('exams-search-input');
    // "Bắt đầu" and "Tiếp tục" buttons in the table action column.
    this.startLinks = page.getByRole('link', { name: /^(Bắt đầu|Tiếp tục)$/i });
    this.viewResultLinks = page.getByRole('link', { name: /Xem kết quả/i });
    this.titleHeading = page.getByRole('heading', { name: /Bài thi/i }).first();
    this.statusFilterAll = page.getByRole('button', { name: /^Tất cả$/ });
    this.statusFilterAvailable = page.getByRole('button', { name: /^Có thể làm$/ });
    this.statusFilterInProgress = page.getByRole('button', { name: /^Đang làm$/ });
    this.statusFilterCompleted = page.getByRole('button', { name: /^Hoàn thành$/ });
    this.sortSelect = page.locator('select');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/exams');
    // Wait for the filter bar to be visible — signals the layout has rendered.
    await expect(this.root).toBeVisible();
  }

  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
  }

  async clickFilterAvailable(): Promise<void> {
    await this.statusFilterAvailable.click();
  }

  async clickFilterCompleted(): Promise<void> {
    await this.statusFilterCompleted.click();
  }

  async clickStartOnRow(rowTitle: string): Promise<void> {
    const row = this.page.getByRole('row', { name: new RegExp(rowTitle, 'i') });
    const link = row.getByRole('link', { name: /^(Bắt đầu|Tiếp tục)$/i });
    await link.click();
  }

  async expectPageRendered(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.titleHeading).toBeVisible();
  }
}
