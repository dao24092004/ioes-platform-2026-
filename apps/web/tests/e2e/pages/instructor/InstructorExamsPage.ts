/**
 * Wave 3C — E2E Page Object: InstructorExamsPage (/instructor/exams)
 *
 * All raw selectors for the instructor exam list live here. Spec files must
 * not embed selectors.
 *
 * Locator strategy: `data-testid` first (the testids added to
 * `src/pages/instructor/ExamsPage.tsx` in this wave), then role + bilingual
 * label regexes. The app renders Vietnamese by default, so every label regex
 * matches both locales.
 *
 * Note on the list body: the page renders either the table (there are exams)
 * or the empty block (there are none). Which one a shared instructor account
 * gets depends on the seed data, so the page object exposes both and the
 * specs assert that exactly one of them rendered rather than hard-coding
 * either outcome.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class InstructorExamsPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly stats: Locator;
  readonly searchInput: Locator;
  readonly statusFilters: Locator;
  readonly table: Locator;
  readonly emptyState: Locator;
  readonly createLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Layout heading i18n: "Bài thi" (vi) / "Exams" (en).
    this.heading = page.getByRole('heading', { name: /^Bài thi$|^Exams$/ });
    this.stats = page.getByTestId('instructor-exams-stats');
    this.searchInput = page.getByTestId('instructor-exams-search');
    this.statusFilters = page.getByTestId('instructor-exams-filters');
    this.table = page.getByTestId('instructor-exams-table');
    this.emptyState = page.getByTestId('instructor-exams-empty');
    // Header link i18n: "Tạo đề thi" (vi) / "Create exam" (en). It is hidden
    // below the sm breakpoint, so the desktop viewport is assumed.
    this.createLink = page.getByTestId('instructor-exams-create-link');
  }

  async goto(): Promise<void> {
    await this.page.goto('/instructor/exams');
    await expect(this.heading).toBeVisible();
  }

  /**
   * The list finished loading and settled on one of its two end states. The
   * loading spinner must be gone either way.
   */
  async expectListSettled(): Promise<void> {
    await expect(this.page.getByTestId('instructor-exams-loading')).toHaveCount(0);
    await expect(this.table.or(this.emptyState).first()).toBeVisible();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
    await expect(this.table).toHaveCount(0);
  }
}
