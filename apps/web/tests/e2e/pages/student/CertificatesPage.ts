/**
 * Wave 2C — E2E Page Object: CertificatesPage (student)
 *
 * Wraps all certificates-page interactions used by
 * `tests/e2e/certificates.student.spec.ts`. CertificatesPage renders a
 * `ComingSoon` block (blockchain feature not yet available) inside a
 * `StudentLayout`. We assert structural selectors that survive i18n
 * changes: the h1, the "Coming soon" badge, and the missing-items list
 * having at least one entry.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class CertificatesPage {
  readonly page: Page;

  readonly title: Locator;
  readonly description: Locator;
  readonly badge: Locator;
  readonly missingListItems: Locator;

  constructor(page: Page) {
    this.page = page;

    this.title = page.getByTestId('coming-soon-title');
    // ComingSoon's description is the first paragraph under the heading.
    this.description = page.locator('[data-testid="coming-soon-title"] + p');
    // ComingSoon always renders a "Coming soon" badge pill at the top.
    this.badge = page.getByText(/coming soon/i).first();
    // The "What is missing" list: every <li> inside the ComingSoon block.
    this.missingListItems = page.locator('div.bg-slate-50 ul > li');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/certificates');
  }

  async expectComingSoon(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.badge).toBeVisible();
  }

  async expectMissingItems(): Promise<void> {
    // The ComingSoon should list at least one missing prerequisite.
    await expect(this.missingListItems.first()).toBeVisible();
  }
}
