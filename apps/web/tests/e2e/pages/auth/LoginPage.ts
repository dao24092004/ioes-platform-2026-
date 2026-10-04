// apps/web/tests/e2e/pages/auth/LoginPage.ts
// Page Object for the Login page (/auth/login). The Register form shares
// many inputs (email/password/submit) but lives in its own object — see
// RegisterPage.ts. Other auth pages (forgot-password, verify-email, oauth
// callback) have their own dedicated files: ForgotPasswordPage.ts,
// OAuthCallbackPage.ts.
//
// Locator strategy:
// - testid FIRST (auth-email, auth-password, auth-submit, auth-tab-*) — these
//   are minimal one-line additions to the source, added in Batch 6.
// - role/label SECOND (e.g. 'GetByRole("button", {name: ...})') for buttons
//   without a testid (Google, GitHub).
// - text LAST for fallback.
//
// The submit button has its visible label changing (Đăng nhập vs a spinner
// svg), so `auth-submit` is preferred over `getByRole` to avoid label
// mismatches while the request is in flight.
import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly loginTab: Locator;
  readonly registerTab: Locator;
  readonly googleButton: Locator;
  readonly githubButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly errorBanner: Locator;
  /**
   * HTML5 `:invalid` pseudo-class — login & register use native `required` +
   * `type=email` so the browser blocks empty / non-email submits with a
   * tooltip. We assert via `:invalid` (instead of waiting for our React error
   * banner) so we test the actual contract the user sees.
   */
  readonly emailValidity: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('auth-email');
    this.passwordInput = page.getByTestId('auth-password');
    this.submitButton = page.getByTestId('auth-submit');
    this.loginTab = page.getByTestId('auth-tab-login');
    this.registerTab = page.getByTestId('auth-tab-register');
    this.googleButton = page.getByTestId('auth-google');
    this.githubButton = page.getByTestId('auth-github');
    // The "Quên mật khẩu?" link is rendered by LoginPage only — a
    // /auth/forgot-password link inside the same form.
    this.forgotPasswordLink = page.getByRole('link', { name: /quên mật khẩu|forgot password/i });
    // Remember-me checkbox has no testid in source — match by the wrapping
    // label text inside LoginPage.
    this.rememberMeCheckbox = page.getByRole('checkbox', { name: /ghi nhớ|remember me/i });
    // Inline error banner — `<div className="...bg-red-50...">` containing
    // `<p data-testid="auth-error">` rendered by LoginPage/RegisterPage after
    // a failed submit. role="alert" makes the banner announced by assistive
    // tech and lets selectors fall back if the testid is ever removed.
    this.errorBanner = page.getByTestId('auth-error');
    this.emailValidity = this.emailInput;
  }

  async gotoLogin(): Promise<void> {
    await this.page.goto('/auth/login');
    // The login tab is a `Link` so it's the active tab on this URL. Wait
    // for the email input to be ready.
    await expect(this.emailInput).toBeVisible();
  }

  async gotoRegister(): Promise<void> {
    await this.page.goto('/auth/register');
    await expect(this.emailInput).toBeVisible();
  }

  async switchToRegister(): Promise<void> {
    await this.registerTab.click();
    await this.page.waitForURL(/\/auth\/register$/);
  }

  async switchToLogin(): Promise<void> {
    await this.loginTab.click();
    await this.page.waitForURL(/\/auth\/login$/);
  }

  async fillCredentials(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password);
    await this.submit();
  }
}
