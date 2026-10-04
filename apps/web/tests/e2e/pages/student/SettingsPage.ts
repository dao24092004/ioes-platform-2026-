/**
 * Wave 2D — E2E Page Object: SettingsPage (student).
 *
 * Route: /student/settings
 * Network: none (all preferences are local state).
 *
 * Locators: the page root is `data-testid="settings-page"`. Tab buttons are
 * labeled "General" / "Notifications" / "Privacy" / "Language".
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;
  readonly root: Locator;
  readonly tabGeneral: Locator;
  readonly tabNotifications: Locator;
  readonly tabPrivacy: Locator;
  readonly tabLanguage: Locator;
  readonly themeAutoButton: Locator;
  readonly themeLightButton: Locator;
  readonly themeDarkButton: Locator;
  readonly languageViButton: Locator;
  readonly languageEnButton: Locator;
  readonly switches: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('settings-page');
    this.tabGeneral = this.root.getByRole('button', { name: /^General$/i });
    this.tabNotifications = this.root.getByRole('button', { name: /^Notifications$/i });
    this.tabPrivacy = this.root.getByRole('button', { name: /^Privacy$/i });
    this.tabLanguage = this.root.getByRole('button', { name: /^Language$/i });
    this.themeAutoButton = this.root.getByRole('button', { name: /Auto/ });
    this.themeLightButton = this.root.getByRole('button', { name: /Light/ });
    this.themeDarkButton = this.root.getByRole('button', { name: /Dark/ });
    this.languageViButton = this.root.getByRole('button', { name: /Tiếng Việt/ });
    this.languageEnButton = this.root.getByRole('button', { name: /English/ });
    this.switches = this.root.getByRole('switch');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/settings');
  }

  async expectPage(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async clickTab(name: 'General' | 'Notifications' | 'Privacy' | 'Language'): Promise<void> {
    const map = {
      General: this.tabGeneral,
      Notifications: this.tabNotifications,
      Privacy: this.tabPrivacy,
      Language: this.tabLanguage,
    };
    await map[name].click();
  }
}
