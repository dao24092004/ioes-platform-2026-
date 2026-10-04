/**
 * Wave 3D — E2E Page Object: AIAssistantPage (instructor).
 *
 * Route: /instructor/ai-assistant
 * Network: GET /api/ai/chat/sessions, GET /api/ai/chat/:sessionId,
 *          POST /api/ai/chat  (all chat traffic is mocked in the spec).
 *
 * Locators are `data-testid`-first so they survive a locale switch; the only
 * text locator is bilingual because the send control is an icon button with
 * no accessible name of its own.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class InstructorAIAssistantPage {
  readonly page: Page;

  readonly root: Locator;
  readonly newChatButton: Locator;
  readonly input: Locator;
  readonly sendButton: Locator;
  readonly clearButton: Locator;
  readonly errorBanner: Locator;
  readonly userMessages: Locator;
  readonly assistantMessages: Locator;
  readonly sessionEntries: Locator;

  constructor(page: Page) {
    this.page = page;

    this.root = page.getByTestId('instructor-aiassistant-page');
    this.newChatButton = page.getByTestId('instructor-aiassistant-new-chat');
    this.input = page.getByTestId('instructor-aiassistant-input');
    this.sendButton = page.getByTestId('instructor-aiassistant-send');
    this.clearButton = page.getByTestId('instructor-aiassistant-clear');
    this.errorBanner = page.getByTestId('instructor-aiassistant-error');
    this.userMessages = page.getByTestId('instructor-aiassistant-message-user');
    this.assistantMessages = page.getByTestId('instructor-aiassistant-message-assistant');
    // Each stored session and the draft thread are <li> rows in the sidebar.
    this.sessionEntries = page.getByTestId('instructor-aiassistant-page').locator('aside li');
  }

  async goto(): Promise<void> {
    await this.page.goto('/instructor/ai-assistant');
  }

  async expectPage(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async waitForSessions(): Promise<void> {
    await expect(this.input).toBeVisible();
    await expect(this.newChatButton).toBeVisible();
  }

  async send(prompt: string): Promise<void> {
    await this.input.fill(prompt);
    await this.sendButton.click();
  }

  async expectUserMessage(text: string): Promise<void> {
    await expect(this.userMessages.filter({ hasText: text }).first()).toBeVisible();
  }

  async expectAssistantMessage(text: string): Promise<void> {
    await expect(this.assistantMessages.filter({ hasText: text }).first()).toBeVisible();
  }

  async expectNoErrorBanner(): Promise<void> {
    await expect(this.errorBanner).toHaveCount(0);
  }
}
