/**
 * Wave 2D — E2E Page Object: NotificationsPage (student).
 *
 * Route: /student/notifications
 * Network: GET /api/v1/notifications/user/:userId
 *
 * Locators: the page root is `data-testid="notifications-page"`. The
 * filter buttons (All / Pending / Sent / Failed / Retrying) sit just
 * inside the root. Each notification row has the type icon and subject.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class NotificationsPage {
  readonly page: Page;
  readonly root: Locator;
  readonly filterAll: Locator;
  readonly filterSent: Locator;
  readonly filterPending: Locator;
  readonly filterFailed: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('notifications-page');
    this.filterAll = page.getByTestId('notifications-filter-all');
    this.filterSent = page.getByTestId('notifications-filter-sent');
    this.filterPending = page.getByTestId('notifications-filter-pending');
    this.filterFailed = page.getByTestId('notifications-filter-failed');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/notifications');
  }

  async expectPage(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async clickFilterAll(): Promise<void> {
    await this.filterAll.click();
  }

  async expectSubjectVisible(subject: string | RegExp): Promise<void> {
    await expect(this.page.getByText(subject).first()).toBeVisible();
  }
}
