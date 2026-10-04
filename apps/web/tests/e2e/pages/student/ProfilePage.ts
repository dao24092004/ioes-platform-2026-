/**
 * Wave 2D — E2E Page Object: ProfilePage (student).
 *
 * Route: /student/profile
 * Network: GET /api/auth/me, POST /api/auth/change-password
 *
 * Locators: the page root is `data-testid="profile-page"`. Each tab has
 * `data-testid="profile-tab-<id>"`; password inputs carry
 * `data-testid="profile-old-password"` etc. All form-level selectors
 * are stable across locales.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;
  readonly root: Locator;
  readonly tabOverview: Locator;
  readonly tabEdit: Locator;
  readonly tabAchievements: Locator;
  readonly tabSecurity: Locator;
  readonly oldPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly changePasswordButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('profile-page');
    this.tabOverview = page.getByTestId('profile-tab-overview');
    this.tabEdit = page.getByTestId('profile-tab-edit');
    this.tabAchievements = page.getByTestId('profile-tab-achievements');
    this.tabSecurity = page.getByTestId('profile-tab-security');
    this.oldPasswordInput = page.getByTestId('profile-old-password');
    this.newPasswordInput = page.getByTestId('profile-new-password');
    this.confirmPasswordInput = page.getByTestId('profile-confirm-password');
    this.changePasswordButton = page.getByTestId('profile-change-password-submit');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/profile');
  }

  async expectPage(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async clickSecurityTab(): Promise<void> {
    await this.tabSecurity.click();
  }

  async fillPasswords(oldP: string, newP: string): Promise<void> {
    await this.oldPasswordInput.fill(oldP);
    await this.newPasswordInput.fill(newP);
    await this.confirmPasswordInput.fill(newP);
  }

  async clickChangePassword(): Promise<void> {
    await this.changePasswordButton.click();
  }
}
