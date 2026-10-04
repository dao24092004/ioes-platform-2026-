/**
 * Wave 3D — E2E Page Object: ProfilePage (instructor).
 *
 * Route: /instructor/profile
 * Network: GET /api/auth/me, GET /api/exams, GET /api/exams/grading/stats and
 *          POST /api/auth/change-password (mutating — always mocked).
 *
 * Every form-level locator is a `data-testid`, so the object works in both
 * locales; only the two tab labels are matched bilingually.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class InstructorProfilePage {
  readonly page: Page;

  readonly card: Locator;
  readonly loadError: Locator;
  readonly tabOverview: Locator;
  readonly tabSecurity: Locator;
  readonly oldPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly passwordSuccess: Locator;
  readonly passwordError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.card = page.getByTestId('instructor-profile-card');
    this.loadError = page.getByTestId('instructor-profile-load-error');
    this.tabOverview = page.getByTestId('instructor-profile-tab-overview');
    this.tabSecurity = page.getByTestId('instructor-profile-tab-security');
    this.oldPasswordInput = page.getByTestId('instructor-profile-old-password');
    this.newPasswordInput = page.getByTestId('instructor-profile-new-password');
    this.confirmPasswordInput = page.getByTestId('instructor-profile-confirm-password');
    this.submitButton = page.getByTestId('instructor-profile-change-password-submit');
    this.passwordSuccess = page.getByTestId('instructor-profile-password-success');
    this.passwordError = page.getByTestId('instructor-profile-password-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/instructor/profile');
  }

  async expectPage(): Promise<void> {
    await expect(this.card).toBeVisible();
    await expect(this.tabOverview).toBeVisible();
  }

  async expectEmail(email: string): Promise<void> {
    await expect(this.card.getByText(email).first()).toBeVisible();
  }

  async openSecurityTab(): Promise<void> {
    await this.tabSecurity.click();
    await expect(this.oldPasswordInput).toBeVisible();
  }

  async fillPasswords(oldPassword: string, newPassword: string): Promise<void> {
    await this.oldPasswordInput.fill(oldPassword);
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(newPassword);
  }

  async submitPasswordChange(): Promise<void> {
    await this.submitButton.click();
  }
}
