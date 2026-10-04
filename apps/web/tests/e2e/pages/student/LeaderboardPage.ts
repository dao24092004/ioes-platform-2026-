/**
 * Wave 2C — E2E Page Object: LeaderboardPage (student)
 *
 * Wraps all leaderboard interactions used by
 * `tests/e2e/leaderboardGaps.student.spec.ts` (gap-fill only — the
 * colocated `LeaderboardPage.test.ts` already covers the `getInitials`
 * pure function). The page issues two analytics calls:
 *   - GET `/api/analytics/leaderboard?period=…&limit=50`
 *   - GET `/api/analytics/leaderboard/me?period=…`
 * and renders a top-3 podium + a ranked table for the rest.
 *
 * Selectors use data-testid attributes added to the page source:
 *   - leaderboard-period-weekly / -monthly / -alltime  → period buttons
 *   - leaderboard-row                                → table rows (rank ≥ 4)
 *   - leaderboard-your-rank                          → "Your rank" card
 *
 * data-testid file:line (src/pages/student/LeaderboardPage.tsx):
 *   - line 106:      leaderboard-period-{weekly|monthly|alltime}
 *   - line 189:      leaderboard-row
 *   - line 225:      leaderboard-your-rank wrapper
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class LeaderboardPage {
  readonly page: Page;

  readonly periodWeekly: Locator;
  readonly periodMonthly: Locator;
  readonly periodAllTime: Locator;
  readonly tableRows: Locator;
  readonly yourRankCard: Locator;
  readonly podium: Locator;

  constructor(page: Page) {
    this.page = page;

    this.periodWeekly = page.getByTestId('leaderboard-period-weekly');
    this.periodMonthly = page.getByTestId('leaderboard-period-monthly');
    this.periodAllTime = page.getByTestId('leaderboard-period-alltime');
    this.tableRows = page.getByTestId('leaderboard-row');
    this.yourRankCard = page.getByTestId('leaderboard-your-rank');
    // Podium is the top-3 grid; selectors below rely on text fallbacks since
    // the podium divs do not carry data-testid (intentional — the top-3
    // visual order is part of the page contract, not the data contract).
    this.podium = page.locator('.grid.grid-cols-1.md\\:grid-cols-3').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/leaderboard');
  }

  async expectPeriodButtons(): Promise<void> {
    await expect(this.periodWeekly).toBeVisible();
    await expect(this.periodMonthly).toBeVisible();
    await expect(this.periodAllTime).toBeVisible();
  }

  async clickMonthly(): Promise<void> {
    await this.periodMonthly.click();
  }

  async clickAllTime(): Promise<void> {
    await this.periodAllTime.click();
  }

  async clickWeekly(): Promise<void> {
    await this.periodWeekly.click();
  }

  async expectYourRank(): Promise<void> {
    await expect(this.yourRankCard).toBeVisible();
  }

  async expectRankName(name: string | RegExp): Promise<void> {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }
}
