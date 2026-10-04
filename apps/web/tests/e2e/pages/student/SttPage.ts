/**
 * Wave 2D — E2E Page Object: SpeechToTextPage (student).
 *
 * Route: /student/speech-to-text
 * Network: none in the current build (ComingSoon wrapper).
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class SttPage {
  readonly page: Page;
  readonly root: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('speechtotext-page');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/speech-to-text');
  }

  async expectPage(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async expectComingSoonCopy(): Promise<void> {
    await expect(this.page.getByText(/Coming soon/i).first()).toBeVisible();
  }
}
