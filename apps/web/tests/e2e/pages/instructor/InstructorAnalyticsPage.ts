/**
 * Wave 3A — E2E Page Object: InstructorAnalyticsPage (`/instructor/analytics`).
 *
 * Wraps everything tests/e2e/analytics.instructor.spec.ts needs. All raw
 * selectors live here; the spec embeds none.
 *
 * Selectors are data-testid first; i18n'd labels use bilingual regexes
 * because the app renders Vietnamese by default.
 *
 * data-testid file:line (src/pages/instructor/AnalyticsPage.tsx):
 *   - line 41: instructor-analytics-kpis
 *   - line 52: instructor-analytics-trend-empty
 *   - line 76: instructor-analytics-rows
 *   - line 93: instructor-analytics-row
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class InstructorAnalyticsPage {
  readonly page: Page;

  /** The InstructorLayout header <h1>: "Phân tích" / "Analytics". */
  readonly heading: Locator;
  readonly kpis: Locator;
  /** The explicit "no time-series endpoint" block. */
  readonly trendEmpty: Locator;
  readonly rows: Locator;
  readonly examRows: Locator;
  /** Table empty-state copy. */
  readonly noExams: Locator;
  /** Table error-state copy. */
  readonly loadError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', {
      level: 1,
      name: /Phân tích|Analytics/i,
    });
    this.kpis = page.getByTestId('instructor-analytics-kpis');
    this.trendEmpty = page.getByTestId('instructor-analytics-trend-empty');
    this.rows = page.getByTestId('instructor-analytics-rows');
    this.examRows = page.getByTestId('instructor-analytics-row');
    this.noExams = page.getByText(/Bạn chưa có bài thi nào|You have no exams yet/i);
    this.loadError = page.getByText(/Không tải được dữ liệu|Could not load data/i);
  }

  async goto(): Promise<void> {
    await this.page.goto('/instructor/analytics');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async expectKpisVisible(): Promise<void> {
    await expect(this.kpis).toBeVisible();
  }

  /**
   * The table always renders — as a spinner, an error row, a "no exams" row
   * or one row per exam. Waiting on the table (not on a row) keeps this stable
   * regardless of how much data the shared instructor account has.
   */
  async expectTableVisible(): Promise<void> {
    await expect(this.rows).toBeVisible();
  }

  async expectNoTimeSeriesNotice(): Promise<void> {
    await expect(this.trendEmpty).toBeVisible();
  }

  /**
   * Read one of the four KPI card values by its label.
   *
   * AnalyticsPage's local KpiCard renders the root as `div.rounded-2xl` and the
   * value as `div.text-3xl.font-bold`, with the label as its sibling. Scoping
   * to the card that contains the label avoids XPath / index selectors.
   */
  async kpiValue(label: RegExp): Promise<string> {
    const card = this.kpis.locator('div.rounded-2xl').filter({ hasText: label });
    return ((await card.locator('div.text-3xl.font-bold').textContent()) ?? '').trim();
  }
}
