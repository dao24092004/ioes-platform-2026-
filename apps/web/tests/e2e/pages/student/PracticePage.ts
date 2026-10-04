/**
 * Wave 2D — E2E Page Object: PracticePage (student).
 *
 * Route: /student/practice/:topicId
 * Network: GET /api/v1/question-bank/topics/:topicId/practice
 *
 * Locators: the page is a list of answer-option buttons rendered as full
 * width <button> elements with the option text inside. The back link to
 * /student/practice is rendered as a Link with title="Back".
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class PracticePage {
  readonly page: Page;
  readonly backLink: Locator;
  readonly submitButton: Locator;
  readonly nextButton: Locator;
  readonly flagToggle: Locator;
  readonly showExplanation: Locator;

  constructor(page: Page) {
    this.page = page;
    this.backLink = page.locator('a[href="/student/practice"]').first();
    // The submit and next buttons become visible after a question is shown.
    this.submitButton = page.getByRole('button', { name: /Submit Answer/i });
    this.nextButton = page.getByRole('button', { name: /Next Question/i });
    this.flagToggle = page.locator('button[title="Flag"]');
    this.showExplanation = page.locator('button[title*="explanation" i]').first();
  }

  async goto(topicId = 'topic-42'): Promise<void> {
    await this.page.goto(`/student/practice/${topicId}`);
  }

  async expectQuestionText(text: string | RegExp): Promise<void> {
    await expect(this.page.getByText(text).first()).toBeVisible();
  }

  async clickOption(optionText: string | RegExp): Promise<void> {
    await this.page.getByRole('button', { name: optionText }).first().click();
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }

  async clickBack(): Promise<void> {
    await this.backLink.click();
  }
}
