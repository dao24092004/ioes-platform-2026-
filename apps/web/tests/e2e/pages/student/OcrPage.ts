/**
 * Wave 2D — E2E Page Object: OCRPage (student).
 *
 * Route: /student/ocr
 * Network: none in the current build (ComingSoon wrapper).
 *
 * Locator: the page renders `data-testid="ocr-page"`.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class OcrPage {
  readonly page: Page;
  readonly root: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('ocr-page');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/ocr');
  }

  async expectPage(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async expectComingSoonCopy(): Promise<void> {
    await expect(this.page.getByText(/Coming soon/i).first()).toBeVisible();
  }
}
