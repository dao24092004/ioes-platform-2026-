// apps/web/tests/e2e/pages/auth/RegisterPage.ts
// Page Object for the Register page (/auth/register). The form lives inside
// AuthLayout's <Outlet /> alongside the LoginPage — both share the email/
// password inputs but Register adds fullName, confirmPassword, and the
// terms-agreement checkbox.
//
// Locator strategy: same convention as LoginPage — testid first, role/label
// second, text last.
import { type Page, type Locator, expect } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly agreeTermsCheckbox: Locator;
  readonly submitButton: Locator;
  readonly loginTab: Locator;
  readonly errorBanner: Locator;
  /** Strength meter label rendered under the password input. */
  readonly passwordStrengthText: Locator;
  /** Google register button has no testid; match by SVG adjacent label. */
  readonly googleButton: Locator;
  /** The footer link back to /auth/login. */
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fullNameInput = page.getByTestId('auth-fullname');
    this.emailInput = page.getByTestId('auth-email');
    this.passwordInput = page.getByTestId('auth-password');
    this.confirmPasswordInput = page.getByTestId('auth-confirm-password');
    this.agreeTermsCheckbox = page.getByTestId('auth-agree-terms');
    this.submitButton = page.getByTestId('auth-submit');
    this.loginTab = page.getByTestId('auth-tab-login');
    this.errorBanner = page.locator('p.text-red-600, p.text-red-500').first();
    // Strength meter is the only element with data-testid="auth-password-strength"
    // (added in Batch 6). It is rendered conditionally on password being non-empty.
    this.passwordStrengthText = page.getByTestId('auth-password-strength');
    this.googleButton = page.getByRole('button', { name: /google/i });
    this.signInLink = page
      .getByRole('link', { name: /(đăng nhập ngay|sign ?in now|sign ?in here)/i })
      .last();
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/register');
    await expect(this.fullNameInput).toBeVisible();
  }

  async register(fullName: string, email: string, password: string): Promise<void> {
    await this.fullNameInput.fill(fullName);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    if (!(await this.agreeTermsCheckbox.isChecked())) {
      await this.agreeTermsCheckbox.check();
    }
    await this.submitButton.click();
  }
}
