/**
 * Wave 4 / subagent 2C — E2E Page Object: AdminExamManagementPage
 * (admin, /admin/exams)
 *
 * Wraps the interactions used by `tests/e2e/examManagement.admin.spec.ts`.
 * The page reads two endpoints — `/api/exams/admin/stats` (six stat cards)
 * and `/api/exams/admin/overview` (the table) — and offers a type-tab group,
 * a title search box and a seven-column table.
 *
 * Selectors are testid-first. The four IDs the page shares with the other
 * admin screens (`analytics-kpi`, `admin-exam-status-tab`, `admin-exam-search`,
 * `admin-exam-row`) live in `src/constants/ui.ts`; the `admin-exams-*` ones
 * were added for this module. Nothing here selects by CSS class or by visible
 * text alone.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class AdminExamManagementPage {
  readonly page: Page;

  /** <h1> rendered by AdminLayout from `examAdmin.title`. */
  readonly heading: Locator;
  readonly kpiCards: Locator;
  readonly statsError: Locator;
  /** The four type tabs: "all" + practice + graded + certification. */
  readonly typeTabs: Locator;
  readonly search: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly errorRow: Locator;
  readonly emptyRow: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { level: 1 });
    this.kpiCards = page.getByTestId('analytics-kpi');
    this.statsError = page.getByTestId('admin-exams-stats-error');
    this.typeTabs = page.getByTestId('admin-exam-status-tab');
    this.search = page.getByTestId('admin-exam-search');
    this.table = page.getByTestId('admin-exams-table');
    this.rows = page.getByTestId('admin-exam-row');
    this.errorRow = page.getByTestId('admin-exams-error-row');
    this.emptyRow = page.getByTestId('admin-exams-empty');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/exams');
  }

  /** The table is always rendered; the tbody branch tells us the query state. */
  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.table).toBeVisible();
    await expect(this.search).toBeVisible();
    await expect(this.typeTabs).toHaveCount(4);
  }

  async expectKpiCount(count: number): Promise<void> {
    await expect(this.kpiCards).toHaveCount(count);
  }

  /**
   * The card's value line, i.e. the first line of its rendered text.
   *
   * A card is "<value>\n<label>", so `innerText` alone returns both; the value
   * is what the stats payload feeds, so it is what assertions compare.
   */
  async kpiValue(index: number): Promise<string> {
    const text = await this.kpiCards.nth(index).innerText();
    return (
      text
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? ''
    );
  }

  async tabCount(index: number): Promise<string> {
    return (await this.typeTabs.nth(index).locator('span').last().innerText()).trim();
  }

  async clickTypeTab(index: number): Promise<void> {
    await this.typeTabs.nth(index).click();
  }

  async expectActiveTab(index: number): Promise<void> {
    await expect(this.typeTabs.nth(index)).toHaveAttribute('aria-pressed', 'true');
  }

  async searchFor(text: string): Promise<void> {
    await this.search.fill(text);
  }

  async expectRowCount(count: number): Promise<void> {
    await expect(this.rows).toHaveCount(count);
  }

  /** All rendered text of a row, whitespace collapsed. */
  async rowText(index: number): Promise<string> {
    return (await this.rows.nth(index).innerText()).replace(/\s+/g, ' ').trim();
  }

  async expectStatsError(): Promise<void> {
    await expect(this.statsError).toBeVisible();
  }

  /** The single full-width cell of the table error row. */
  async expectErrorRowSpanningSevenColumns(): Promise<void> {
    await expect(this.errorRow).toBeVisible();
    await expect(this.errorRow.locator('td')).toHaveAttribute('colspan', '7');
  }

  async expectEmptyRow(): Promise<void> {
    await expect(this.emptyRow).toBeVisible();
  }
}
