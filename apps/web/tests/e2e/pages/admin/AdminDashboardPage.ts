/**
 * Wave 4A (admin) — E2E Page Object: AdminDashboardPage (`/admin`).
 *
 * Wraps every interaction used by `tests/e2e/dashboard.admin.spec.ts`.
 * The dashboard is read-only, so the page object only navigates and asserts;
 * all network mocking lives in the spec.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class AdminDashboardPage {
  readonly page: Page;

  // KPI cards
  readonly statsGrid: Locator;
  readonly viewAllLink: Locator;

  // Recent users
  readonly recentPanel: Locator;
  readonly recentTbody: Locator;
  readonly recentRows: Locator;
  readonly recentEmpty: Locator;

  // Right column
  readonly quickActions: Locator;
  readonly quickActionLinks: Locator;
  readonly recentActivityPanel: Locator;
  readonly systemStatusPanel: Locator;
  readonly noDataSourceBlocks: Locator;

  constructor(page: Page) {
    this.page = page;

    this.statsGrid = page.getByTestId('admin-dashboard-stats');
    this.viewAllLink = page.getByTestId('admin-dashboard-view-all');

    this.recentPanel = page.getByTestId('admin-dashboard-recent-users');
    this.recentTbody = page.getByTestId('admin-dashboard-recent-tbody');
    this.recentRows = page.getByTestId('admin-dashboard-recent-row');
    this.recentEmpty = page.getByTestId('admin-dashboard-recent-empty');

    this.quickActions = page.getByTestId('admin-dashboard-quick-actions');
    this.quickActionLinks = page.getByTestId('admin-dashboard-quick-action');
    this.recentActivityPanel = page.getByTestId('admin-dashboard-recent-activity');
    this.systemStatusPanel = page.getByTestId('admin-dashboard-system-status');
    this.noDataSourceBlocks = page.getByTestId('admin-dashboard-no-data-source');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin');
  }

  /** The rendered value of KPI card `i` (0 = users, 3 = pass rate). */
  statValue(i: number): Locator {
    return this.page.getByTestId(`admin-dashboard-stat-value-${i}`);
  }

  statLabel(i: number): Locator {
    return this.page.getByTestId(`admin-dashboard-stat-label-${i}`);
  }

  recentIdentity(id: string): Locator {
    return this.page.getByTestId(`admin-dashboard-recent-identity-${id}`);
  }

  /** One recent <tr>, located by the identity cell that carries the user id. */
  recentRow(id: string): Locator {
    return this.recentRows.filter({ has: this.recentIdentity(id) });
  }

  /** The initials fallback of a recent row with no avatar. */
  initials(id: string): Locator {
    return this.page.getByTestId(`admin-dashboard-recent-initials-${id}`);
  }

  /** The avatar <img> of a recent row that has one. */
  avatar(id: string): Locator {
    return this.page.getByTestId(`admin-dashboard-recent-avatar-${id}`);
  }

  /** The vi-VN formatted joined-date cell of one recent row. */
  joinedCell(id: string): Locator {
    return this.page.getByTestId(`admin-dashboard-recent-joined-${id}`);
  }

  recentRowLink(id: string): Locator {
    return this.page.getByTestId(`admin-dashboard-recent-row-link-${id}`);
  }

  async expectKpiCards(): Promise<void> {
    await expect(this.statsGrid).toBeVisible();
    for (const i of [0, 1, 2, 3]) {
      await expect(this.page.getByTestId(`admin-dashboard-stat-${i}`)).toBeVisible();
    }
  }

  async expectRecentRowCount(n: number): Promise<void> {
    await expect(this.recentRows).toHaveCount(n);
  }

  /** The quick action whose label matches `pattern`, e.g. add user. */
  quickAction(pattern: RegExp): Locator {
    return this.quickActionLinks.filter({ hasText: pattern });
  }

  async expectNoDataSourcePanels(): Promise<void> {
    await expect(this.recentActivityPanel).toBeVisible();
    await expect(this.systemStatusPanel).toBeVisible();
    await expect(this.noDataSourceBlocks).toHaveCount(2);
  }
}
