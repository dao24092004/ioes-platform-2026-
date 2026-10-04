/**
 * Wave 2C — E2E Page Object: TokenWalletPage (student)
 *
 * Wraps all token-wallet interactions used by
 * `tests/e2e/tokenWallet.student.spec.ts`. TokenWalletPage renders the
 * same blockchain `ComingSoon` block as CertificatesPage inside a
 * `StudentLayout`. The page is intentionally identical to
 * `CertificatesPage`'s visible contract — there is no wallet yet — so
 * the selectors mirror the structure used by the certificates PO.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class TokenWalletPage {
  readonly page: Page;

  readonly title: Locator;
  readonly description: Locator;
  readonly badge: Locator;
  readonly missingListItems: Locator;

  constructor(page: Page) {
    this.page = page;

    this.title = page.getByTestId('coming-soon-title');
    this.description = page.locator('[data-testid="coming-soon-title"] + p');
    this.badge = page.getByText(/coming soon/i).first();
    this.missingListItems = page.locator('div.bg-slate-50 ul > li');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/wallet');
  }

  async expectComingSoon(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.badge).toBeVisible();
  }

  async expectMissingItems(): Promise<void> {
    await expect(this.missingListItems.first()).toBeVisible();
  }
}
