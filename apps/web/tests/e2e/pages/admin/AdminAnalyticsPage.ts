/**
 * Wave 4B (admin) — E2E Page Object: AdminAnalyticsPage.
 *
 * Route: /admin/analytics
 * Network: three reads, all intercepted by the spec
 *   GET /api/analytics/admin/kpi         -> the six KPI cards
 *   GET /api/analytics/admin/user-growth -> the line chart
 *   GET /api/auth/users/stats            -> the role donut
 *
 * Every locator is a data-testid so the object keeps working in both the `vi`
 * and the `en` locale — no visible-text selectors.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class AdminAnalyticsPage {
  readonly page: Page;
  readonly root: Locator;
  readonly rangeButtons: Locator;
  readonly kpiCards: Locator;
  readonly rangeLabel: Locator;
  readonly growthPanel: Locator;
  readonly growthChart: Locator;
  readonly emptyBoxes: Locator;
  readonly rolesPanel: Locator;
  readonly rolesDonut: Locator;
  readonly noSourcePanels: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('admin-shell-main');
    this.rangeButtons = page.getByTestId('analytics-range');
    this.kpiCards = page.getByTestId('analytics-kpi');
    this.rangeLabel = page.getByTestId('admin-analytics-range-label');
    this.growthPanel = page.getByTestId('admin-analytics-growth');
    this.growthChart = page.getByTestId('admin-analytics-growth-line');
    this.emptyBoxes = page.getByTestId('admin-analytics-empty');
    this.rolesPanel = page.getByTestId('admin-analytics-roles');
    this.rolesDonut = page.getByTestId('admin-analytics-roles-donut');
    this.noSourcePanels = page.locator(
      '[data-testid="admin-analytics-enrollments"],' +
        '[data-testid="admin-analytics-exam-completion"],' +
        '[data-testid="admin-analytics-pass-rate"],' +
        '[data-testid="admin-analytics-top-courses"]'
    );
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/analytics');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.kpiCards).toHaveCount(6);
    await expect(this.rangeButtons).toHaveCount(4);
  }

  /** The full card text (value + label) of the nth KPI card. */
  async kpiText(index: number): Promise<string> {
    return (await this.kpiCards.nth(index).innerText()).replace(/\s+/g, ' ').trim();
  }

  async checkedRangeIndex(): Promise<number> {
    const count = await this.rangeButtons.count();
    for (let i = 0; i < count; i += 1) {
      if ((await this.rangeButtons.nth(i).getAttribute('aria-checked')) === 'true') return i;
    }
    return -1;
  }

  async selectRange(index: number): Promise<void> {
    await this.rangeButtons.nth(index).click();
  }

  /** Markers drawn on the line chart; the chart must exist first. */
  async growthMarkerCount(): Promise<number> {
    await expect(this.growthChart).toBeVisible();
    return this.growthChart.locator('circle').count();
  }

  /** Arcs drawn on the role donut; zero-count roles are filtered out. */
  async roleArcCount(): Promise<number> {
    await expect(this.rolesDonut).toBeVisible();
    return this.rolesDonut.locator('path').count();
  }
}
