/**
 * Wave 2D — E2E Page Object: LearningPathPage (student).
 *
 * Route: /student/learning-path
 * Network: GET /api/ai/learning-path/me, /api/ai/learning-path/history,
 *          /api/ai/learning-path/:id; POST /api/ai/learning-path/generate
 *
 * Locators: the page root is `data-testid="learningpath-page"`. The form
 * has input id="lp-goal", id="lp-hours", id="lp-skills". The submit button
 * is the "Generate" button. The "Regenerate" button appears in the header
 * when a path is loaded.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class LearningPathPage {
  readonly page: Page;
  readonly root: Locator;
  readonly goalInput: Locator;
  readonly hoursInput: Locator;
  readonly skillsInput: Locator;
  readonly generateButton: Locator;
  readonly regenerateButton: Locator;
  readonly formHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('learningpath-page');
    this.goalInput = page.getByTestId('lp-goal');
    this.hoursInput = page.getByTestId('lp-hours');
    this.skillsInput = page.locator('#lp-skills');
    this.generateButton = page.getByTestId('lp-submit');
    this.regenerateButton = this.root.getByRole('button', { name: /Regenerate|Tạo lại/i });
    // Locale-agnostic: the section carries `data-testid="lp-form"`.
    this.formHeading = page.getByTestId('lp-form');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/learning-path');
  }

  async expectPage(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async fillGoal(goal: string): Promise<void> {
    await this.goalInput.fill(goal);
  }

  async fillHours(hours: string): Promise<void> {
    await this.hoursInput.fill(hours);
  }

  async clickGenerate(): Promise<void> {
    await this.generateButton.click();
  }

  async clickRegenerate(): Promise<void> {
    await this.regenerateButton.click();
  }

  async expectFormHeading(): Promise<void> {
    await expect(this.formHeading).toBeVisible();
  }
}
