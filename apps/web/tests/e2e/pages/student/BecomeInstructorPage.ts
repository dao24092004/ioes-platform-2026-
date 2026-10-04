/**
 * Wave 2D — E2E Page Object: BecomeInstructorPage (student).
 *
 * Route: /student/become-instructor
 * Network: no real API call (submit is local setTimeout 900ms → pending).
 *
 * Locators: page root is `data-testid="becomeinstructor-page"`. The form
 * has profile + expertise + documents cards. The submit button is the
 * primary "Submit" button at the end of the form. A banner appears after
 * 900ms with `data-testid="becomeinstructor-pending-banner"`.
 *
 * Form inputs are addressed via data-testid so the page object works
 * in both `vi` and `en` locales (the placeholder text differs).
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class BecomeInstructorPage {
  readonly page: Page;
  readonly root: Locator;
  readonly submitButton: Locator;
  readonly bioTextarea: Locator;
  readonly motivationTextarea: Locator;
  readonly portfolioInput: Locator;
  readonly fullNameInput: Locator;
  readonly pendingBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('becomeinstructor-page');
    this.submitButton = page.getByTestId('becomeinstructor-submit');
    this.bioTextarea = page.getByTestId('becomeinstructor-bio');
    this.motivationTextarea = page.getByTestId('becomeinstructor-motivation');
    this.portfolioInput = page.getByTestId('becomeinstructor-portfolio');
    this.fullNameInput = page.getByTestId('becomeinstructor-fullname');
    this.pendingBanner = page.getByTestId('becomeinstructor-pending-banner');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/become-instructor');
  }

  async expectPage(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async fillBio(text: string): Promise<void> {
    await this.bioTextarea.fill(text);
  }

  async fillMotivation(text: string): Promise<void> {
    await this.motivationTextarea.fill(text);
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  async expectPendingBanner(): Promise<void> {
    await expect(this.pendingBanner).toBeVisible();
  }
}
