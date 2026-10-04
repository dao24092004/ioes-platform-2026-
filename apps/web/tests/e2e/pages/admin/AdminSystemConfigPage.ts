/**
 * Wave 4B (admin) — E2E Page Object: AdminSystemConfigPage.
 *
 * Route: /admin/settings
 * Network: NONE. SystemConfigPage issues no HTTP request at all — every field
 * is a `useState`, `handleSave()` and the run-backup handler only flip a flag
 * and stamp `savedAt` from a `setTimeout`. TC-ADMCONFIG-001 asserts exactly
 * that by watching every request the page makes.
 *
 * Every locator is a data-testid so the object keeps working in both the `vi`
 * and the `en` locale.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export type ConfigSection =
  'general' | 'security' | 'exam' | 'notification' | 'blockchain' | 'backup';

export class AdminSystemConfigPage {
  readonly page: Page;
  readonly root: Locator;
  readonly panel: Locator;
  readonly sectionButtons: Locator;
  readonly saveButton: Locator;
  readonly runBackupButton: Locator;
  readonly savedAt: Locator;
  readonly platformName: Locator;
  readonly supportEmail: Locator;
  readonly defaultLang: Locator;
  readonly timezone: Locator;
  readonly maintenance: Locator;
  readonly minLength: Locator;
  readonly mfaRequired: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('admin-shell-main');
    this.panel = page.getByTestId('admin-config-panel');
    this.sectionButtons = page.locator('[data-testid^="admin-config-section-"]');
    this.saveButton = page.getByTestId('admin-config-save');
    this.runBackupButton = page.getByTestId('admin-config-run-backup');
    this.savedAt = page.getByTestId('admin-config-saved-at');
    this.platformName = page.getByTestId('admin-config-platform-name');
    this.supportEmail = page.getByTestId('admin-config-support-email');
    this.defaultLang = page.getByTestId('admin-config-default-lang');
    this.timezone = page.getByTestId('admin-config-timezone');
    this.maintenance = page.getByTestId('admin-config-maintenance');
    this.minLength = page.getByTestId('admin-config-min-length');
    this.mfaRequired = page.getByTestId('admin-config-mfa-required');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/settings');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.panel).toBeVisible();
    await expect(this.sectionButtons).toHaveCount(6);
    await expect(this.saveButton).toBeEnabled();
  }

  async openSection(section: ConfigSection): Promise<void> {
    await this.page.getByTestId(`admin-config-section-${section}`).click();
  }

  /** Click Save and wait out the page's own 800 ms pending window. */
  async save(): Promise<string> {
    await this.saveButton.click();
    await expect(this.saveButton).toBeDisabled();
    await expect(this.savedAt).toBeVisible();
    await expect(this.saveButton).toBeEnabled();
    return (await this.savedAt.innerText()).trim();
  }

  /** Click Run backup and wait out the page's own 1200 ms pending window. */
  async runBackup(): Promise<string> {
    await this.openSection('backup');
    await this.runBackupButton.click();
    await expect(this.runBackupButton).toBeDisabled();
    await expect(this.runBackupButton).toBeEnabled();
    return (await this.savedAt.innerText()).trim();
  }

  async switchState(locator: Locator): Promise<string | null> {
    return locator.getAttribute('aria-checked');
  }
}
