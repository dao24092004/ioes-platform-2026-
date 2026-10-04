/**
 * Wave 3D — E2E Page Object: SettingsPage (instructor).
 *
 * Route: /instructor/settings
 * Network: none — the "Lưu" button of the old page was removed because it
 * only showed a toast without sending anything. The only persisted control
 * is the language select, which writes `localStorage['ioes-lang']`.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class InstructorSettingsPage {
  readonly page: Page;

  readonly nav: Locator;
  readonly panel: Locator;
  readonly sectionGeneral: Locator;
  readonly sectionTeaching: Locator;
  readonly sectionNotifications: Locator;
  readonly sectionIntegrations: Locator;
  readonly sectionBilling: Locator;
  readonly languageSelect: Locator;
  readonly comingSoonTitle: Locator;

  constructor(page: Page) {
    this.page = page;

    this.nav = page.getByTestId('instructor-settings-nav');
    this.panel = page.getByTestId('instructor-settings-panel');
    this.sectionGeneral = page.getByTestId('instructor-settings-section-general');
    this.sectionTeaching = page.getByTestId('instructor-settings-section-teaching');
    this.sectionNotifications = page.getByTestId('instructor-settings-section-notifications');
    this.sectionIntegrations = page.getByTestId('instructor-settings-section-integrations');
    this.sectionBilling = page.getByTestId('instructor-settings-section-billing');
    this.languageSelect = page.getByTestId('instructor-settings-language');
    this.comingSoonTitle = page.getByTestId('coming-soon-title');
  }

  async goto(): Promise<void> {
    await this.page.goto('/instructor/settings');
  }

  async expectPage(): Promise<void> {
    await expect(this.nav).toBeVisible();
    await expect(this.panel).toBeVisible();
  }

  async expectGeneralPanel(): Promise<void> {
    await expect(this.languageSelect).toBeVisible();
    await expect(this.languageSelect).toHaveValue('vi');
  }

  async chooseLanguage(value: 'vi' | 'en'): Promise<void> {
    await this.languageSelect.selectOption(value);
  }

  async expectLanguage(value: 'vi' | 'en'): Promise<void> {
    await expect(this.languageSelect).toHaveValue(value);
  }

  async expectComingSoonPanel(title: RegExp): Promise<void> {
    await expect(this.comingSoonTitle).toBeVisible();
    await expect(this.comingSoonTitle).toHaveText(title);
  }
}
