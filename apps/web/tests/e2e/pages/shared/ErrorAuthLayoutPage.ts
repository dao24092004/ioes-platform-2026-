// apps/web/tests/e2e/pages/shared/ErrorAuthLayoutPage.ts
//
// Subagent 1C1 — Page Object for error pages + AuthLayout shell.
//
// Locators cover:
//   - 404 NotFound page: 404 heading, back-home button, back-to-login button
//   - 500 ServerError page: 500 heading, reload button, back-home button
//
// No sleep/waitForTimeout. Web-first assertions throughout.
import { type Page, type Locator, expect } from '@playwright/test';

export class ErrorAuthLayoutPage {
  readonly page: Page;

  // --- 404 page ---
  readonly heading404: Locator;
  readonly backHomeBtn: Locator;
  readonly backToLoginBtn: Locator;

  // --- 500 page ---
  readonly heading500: Locator;
  readonly tryAgainBtn: Locator;
  readonly backHome500Btn: Locator;

  constructor(page: Page) {
    this.page = page;

    // 404
    this.heading404 = page.getByRole('heading', { level: 1, name: '404' });
    this.backHomeBtn = page.getByRole('link', { name: /quay về trang chủ|back to home/i });
    this.backToLoginBtn = page.getByRole('link', { name: /quay về đăng nhập|back to login/i });

    // 500
    this.heading500 = page.getByRole('heading', { level: 1, name: '500' });
    this.tryAgainBtn = page.getByRole('button', { name: /thử lại|try again/i });
    this.backHome500Btn = page.getByRole('link', { name: /quay về trang chủ|back to home/i });
  }

  // ---- Navigation ----

  async gotoNotFound(): Promise<void> {
    await this.page.goto('/this-route-does-not-exist');
    // The catch-all route "*" renders NotFoundPage (404)
    await expect(this.heading404).toBeVisible();
  }

  async goto500(): Promise<void> {
    await this.page.goto('/500');
    await expect(this.heading500).toBeVisible();
  }

  async gotoLogin(): Promise<void> {
    await this.page.goto('/auth/login');
    await expect(this.page).toHaveURL(/\/auth\/login$/);
    // AuthLayout is lazy-loaded + LoadingScreen (7s). Wait for the URL to confirm routing.
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoRegister(): Promise<void> {
    await this.page.goto('/auth/register');
    await expect(this.page).toHaveURL(/\/auth\/register$/);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickLoginTab(): Promise<void> {
    // AuthLayout tabs use lg:hidden (mobile-only). Use URL navigation instead.
    await this.page.goto('/auth/login');
    await expect(this.page).toHaveURL(/\/auth\/login$/);
  }

  async clickRegisterTab(): Promise<void> {
    await this.page.goto('/auth/register');
    await expect(this.page).toHaveURL(/\/auth\/register$/);
  }

  async clickBackHome(): Promise<void> {
    await this.backHomeBtn.click();
    await this.page.waitForURL('/');
  }

  // ---- 500 reload ----

  /**
   * clickTryAgain clicks the Try Again button. This calls window.location.reload().
   * In Playwright we verify the button is present and clickable without actually
   * reloading the page.
   */
  async clickTryAgain(): Promise<void> {
    await expect(this.tryAgainBtn).toBeEnabled();
    await this.tryAgainBtn.click();
  }
}
