/**
 * Wave 4 / subagent 2C — E2E Page Object: AdminNotificationsPage
 * (admin, /admin/notifications)
 *
 * Wraps the interactions used by `tests/e2e/notifications.admin.spec.ts`.
 * The page reads three endpoints — `/api/notifications/stats` (four stat
 * cards), `/api/notifications/user/{adminId}` (the inbox list and the status
 * filter pills) and `/api/notifications/templates` — and offers a broadcast
 * form with a recipient field, a channel radio group, a title field, a message
 * textarea and a send button.
 *
 * SAFETY: this page object deliberately exposes NO `send()` method. The only
 * write on the page is `POST /api/notifications/send`, a real broadcast to a
 * real recipient, and the E2E suite must not mutate shared data. The specs
 * only inspect the form's gate and field state.
 *
 * Selectors are testid-first. The `admin-notif-*` and `admin-broadcast-*` IDs
 * come from `src/constants/ui.ts` plus the `admin-notif-*` ones added for
 * this module.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class AdminNotificationsPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly kpiCards: Locator;
  /** The inbox card, holding the filter pills and the list. */
  readonly inbox: Locator;
  readonly inboxLoading: Locator;
  readonly inboxError: Locator;
  readonly inboxEmpty: Locator;
  readonly items: Locator;
  /** Five pills: "all" + pending + sent + failed + retrying. */
  readonly filterPills: Locator;
  readonly templatesCount: Locator;
  readonly templateNames: Locator;
  readonly templateEmpty: Locator;
  readonly broadcastCard: Locator;
  readonly recipient: Locator;
  readonly channels: Locator;
  readonly title: Locator;
  readonly message: Locator;
  readonly sendButton: Locator;
  readonly sendError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { level: 1 });
    this.kpiCards = page.getByTestId('analytics-kpi');
    this.inbox = page.getByTestId('admin-notif-inbox');
    this.inboxLoading = page.getByTestId('admin-notif-inbox-loading');
    this.inboxError = page.getByTestId('admin-notif-inbox-error');
    this.inboxEmpty = page.getByTestId('admin-notif-inbox-empty');
    this.items = page.getByTestId('admin-notif-item');
    this.filterPills = page.getByTestId('admin-notif-filter');
    this.templatesCount = page.getByTestId('admin-notif-templates-count');
    this.templateNames = page.getByTestId('admin-notif-template-name');
    this.templateEmpty = page.getByTestId('admin-notif-template-empty');
    this.broadcastCard = page.getByTestId('admin-notif-broadcast');
    this.recipient = page.getByTestId('admin-broadcast-recipient');
    this.channels = page.getByTestId('admin-broadcast-channel');
    this.title = page.getByTestId('admin-broadcast-title');
    this.message = page.getByTestId('admin-broadcast-message');
    this.sendButton = page.getByTestId('admin-broadcast-send');
    this.sendError = page.getByTestId('admin-notif-send-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/notifications');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.inbox).toBeVisible();
    await expect(this.broadcastCard).toBeVisible();
    // Five pills and three channel radios are static, so they prove the two
    // halves of the page rendered even if both reads are still in flight.
    await expect(this.filterPills).toHaveCount(5);
    await expect(this.channels).toHaveCount(3);
  }

  async expectKpiCount(count: number): Promise<void> {
    await expect(this.kpiCards).toHaveCount(count);
  }

  /**
   * The card's value line, i.e. the first non-empty line of its rendered text
   * (a card is "<value>\n<label>"). The value is what the stats payload feeds.
   */
  async kpiValue(index: number): Promise<string> {
    const text = await this.kpiCards.nth(index).innerText();
    return (
      text
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? ''
    );
  }

  async expectItemCount(count: number): Promise<void> {
    await expect(this.items).toHaveCount(count);
  }

  /** All rendered text of an inbox item, whitespace collapsed. */
  async itemText(index: number): Promise<string> {
    return (await this.items.nth(index).innerText()).replace(/\s+/g, ' ').trim();
  }

  async itemSubject(index: number): Promise<string> {
    return (await this.items.nth(index).getByTestId('admin-notif-item-subject').innerText()).trim();
  }

  async itemStatus(index: number): Promise<string> {
    return (await this.items.nth(index).getByTestId('admin-notif-item-status').innerText()).trim();
  }

  async itemMeta(index: number): Promise<string> {
    return (await this.items.nth(index).getByTestId('admin-notif-item-meta').innerText())
      .replace(/\s+/g, ' ')
      .trim();
  }

  async pillCount(index: number): Promise<string> {
    return (await this.filterPills.nth(index).locator('span').last().innerText()).trim();
  }

  async clickFilterPill(index: number): Promise<void> {
    await this.filterPills.nth(index).click();
  }

  async expectActivePill(index: number): Promise<void> {
    await expect(this.filterPills.nth(index)).toHaveAttribute('aria-pressed', 'true');
  }

  async expectTemplateNames(names: string[]): Promise<void> {
    await expect(this.templateNames).toHaveCount(names.length);
    for (const [i, name] of names.entries()) {
      await expect(this.templateNames.nth(i)).toHaveText(name);
    }
  }

  async expectTemplatesCount(count: number): Promise<void> {
    await expect(this.templatesCount).toHaveText(String(count));
  }

  async expectInboxError(): Promise<void> {
    await expect(this.inboxError).toBeVisible();
  }

  async expectInboxEmpty(): Promise<void> {
    await expect(this.inboxEmpty).toBeVisible();
  }

  /** The send gate: enabled only when recipient, title and message are set. */
  async expectSendEnabled(enabled: boolean): Promise<void> {
    if (enabled) {
      await expect(this.sendButton).toBeEnabled();
    } else {
      await expect(this.sendButton).toBeDisabled();
    }
  }

  async expectChannelState(
    index: number,
    opts: { enabled: boolean; checked: boolean }
  ): Promise<void> {
    const radio = this.channels.nth(index);
    if (opts.enabled) {
      await expect(radio).toBeEnabled();
    } else {
      await expect(radio).toBeDisabled();
    }
    if (opts.checked) {
      await expect(radio).toHaveAttribute('aria-checked', 'true');
    } else {
      await expect(radio).toHaveAttribute('aria-checked', 'false');
    }
  }

  /** Fill the three free-text fields. Playwright's fill is a single event. */
  async fillBroadcastForm(values: {
    recipient?: string;
    title?: string;
    message?: string;
  }): Promise<void> {
    if (values.recipient !== undefined) await this.recipient.fill(values.recipient);
    if (values.title !== undefined) await this.title.fill(values.title);
    if (values.message !== undefined) await this.message.fill(values.message);
  }

  async expectSendErrorVisible(): Promise<void> {
    await expect(this.sendError).toBeVisible();
  }
}
