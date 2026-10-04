/**
 * Wave 2C — E2E Page Object: StreakPage (student)
 *
 * Wraps all streak interactions used by
 * `tests/e2e/streak.student.spec.ts`. The page issues one analytics call
 * (GET `/api/analytics/users/:id`) and renders:
 *   - a hero card with the current streak count
 *   - a best-streak card and a "to next milestone" card
 *   - a heatmap (visual-only, hard to assert — keep selectors text-based)
 *   - weekly + last-year summary cards
 *   - achievements list (4 milestones, m1..m365)
 *
 * Selectors use data-testid attributes added to the page source:
 *   - streak-freeze-button       → "Use freeze day" header action
 *   - streak-hero                → current-streak gradient card
 *   - streak-current-value       → the big streak number
 *   - streak-best                → best-streak card
 *   - streak-next-milestone      → days-to-next card
 *   - streak-milestone           → each milestone achievement card
 *
 * data-testid file:line (src/pages/student/StreakPage.tsx):
 *   - line 131: streak-freeze-button
 *   - line 140: streak-hero
 *   - line 145: streak-current-value
 *   - line 148: streak-best
 *   - line 157: streak-next-milestone
 *   - line 316: streak-milestone
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class StreakPage {
  readonly page: Page;

  readonly freezeButton: Locator;
  readonly hero: Locator;
  readonly currentValue: Locator;
  readonly bestCard: Locator;
  readonly nextMilestoneCard: Locator;
  readonly milestoneCards: Locator;

  constructor(page: Page) {
    this.page = page;

    this.freezeButton = page.getByTestId('streak-freeze-button');
    this.hero = page.getByTestId('streak-hero');
    this.currentValue = page.getByTestId('streak-current-value');
    this.bestCard = page.getByTestId('streak-best');
    this.nextMilestoneCard = page.getByTestId('streak-next-milestone');
    this.milestoneCards = page.getByTestId('streak-milestone');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/streak');
  }

  async expectHero(): Promise<void> {
    await expect(this.hero).toBeVisible();
  }

  async expectCurrentValue(value: string | number): Promise<void> {
    await expect(this.currentValue).toHaveText(String(value));
  }

  async expectBestCard(): Promise<void> {
    await expect(this.bestCard).toBeVisible();
  }

  async expectNextMilestoneCard(): Promise<void> {
    await expect(this.nextMilestoneCard).toBeVisible();
  }

  async expectFreezeButton(): Promise<void> {
    await expect(this.freezeButton).toBeVisible();
  }

  async clickFreezeButton(): Promise<void> {
    await this.freezeButton.click();
  }

  async expectMilestoneCount(count: number): Promise<void> {
    await expect(this.milestoneCards).toHaveCount(count);
  }
}
