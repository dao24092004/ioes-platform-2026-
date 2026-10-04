// apps/web/tests/e2e/pages/auth/ForgotPasswordPage.ts
// Page Object for /auth/forgot-password. The page has two states:
//   1. empty form (email field + back-to-login)
//   2. success state (sent-email chip + countdown + try-another + resend)
//
// The success state's countdown lives in `.font-mono` and after expiry
// flips to an "expired" label inside the same container — same locator.
//
// Locator strategy: testid first, then role/label, then text.
import { type Page, type Locator, expect } from '@playwright/test';

export class ForgotPasswordPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly backToLoginLink: Locator;
  /** Email chip rendered in the success state. */
  readonly sentEmailChip: Locator;
  /** MM:SS countdown rendered in the success state. */
  readonly countdownText: Locator;
  /** "Try another email" link/button to return to the empty form. */
  readonly tryAnotherButton: Locator;
  /** Resend button (disabled during cooldown). */
  readonly resendButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('auth-email');
    this.submitButton = page.getByTestId('auth-submit');
    // Source renders an inline link "← Quay lại đăng nhập" — match by visible text.
    this.backToLoginLink = page
      .getByRole('link', { name: /(quay lại đăng nhập|back to login)/i })
      .first();
    // Email shown in success state — a div containing a `truncate` span.
    this.sentEmailChip = page.locator('div.flex-1.min-w-0 > div.font-semibold').first();
    // Countdown is the .font-mono timer; after expiry it's replaced with the
    // "expired" label — both render in the same div, so the locator is broad.
    this.countdownText = page.locator('div.font-mono, div.text-3xl').first();
    // "Thử với email khác" / "Try another email" / "Try with another email"
    this.tryAnotherButton = page.getByRole('button', {
      name: /(thử với email khác|thử email khác|try (with )?another)/i,
    });
    // Resend button shows count-down text or "Gửi lại" depending on cooldown.
    this.resendButton = page.getByRole('button', { name: /(gửi lại|resend)/i }).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/forgot-password');
    await expect(this.emailInput).toBeVisible();
  }

  async requestReset(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }
}
