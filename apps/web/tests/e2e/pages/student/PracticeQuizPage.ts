/**
 * Wave 2D — E2E Page Object: PracticeQuizPage (student).
 *
 * Route: /student/practice
 * Network: POST /api/ai/questions/generate
 *
 * Locators: setup form is wrapped in `data-testid="practicequiz-setup"`.
 * Quiz view is `data-testid="practicequiz-quiz"`. Option buttons render
 * the option text (e.g. "A"/"B"/"C") combined with the option's own text.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class PracticeQuizPage {
  readonly page: Page;
  readonly setupRoot: Locator;
  readonly quizRoot: Locator;
  readonly topicInput: Locator;
  readonly startButton: Locator;
  readonly changeTopicButton: Locator;
  readonly submitAllButton: Locator;
  readonly backLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.setupRoot = page.getByTestId('practicequiz-setup');
    this.quizRoot = page.getByTestId('practicequiz-quiz');
    this.topicInput = page.getByTestId('practicequiz-topic-input');
    this.startButton = page.getByTestId('practicequiz-start');
    this.changeTopicButton = page.getByRole('button', { name: /Change topic/i });
    this.submitAllButton = page.getByRole('button', { name: /Submit all/i });
    this.backLink = page.locator('a[href="/student"]').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/practice');
  }

  async expectSetupForm(): Promise<void> {
    await expect(this.setupRoot).toBeVisible();
  }

  async fillTopic(topic: string): Promise<void> {
    await this.topicInput.fill(topic);
  }

  async clickStart(): Promise<void> {
    await this.startButton.click();
  }

  async expectQuizView(): Promise<void> {
    await expect(this.quizRoot).toBeVisible();
  }

  async clickOption(letter: 'A' | 'B' | 'C' | 'D'): Promise<void> {
    // The option buttons each carry `data-testid="practicequiz-option-<letter>"`
    // on the letter badge. The badges sit inside the quiz-view root, so
    // we scope to it before clicking the badge.
    const badge = this.page.getByTestId(`practicequiz-option-${letter}`);
    await badge.click({ force: true });
  }

  async clickSubmitAll(): Promise<void> {
    await this.submitAllButton.first().click();
  }

  async clickBack(): Promise<void> {
    await this.backLink.click();
  }
}
