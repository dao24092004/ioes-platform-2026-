/**
 * Wave 2D — E2E Page Object: AIAssistantPage (student).
 *
 * Route: /student/ai-assistant
 * Network: GET /api/ai/chat/sessions, POST /api/ai/chat
 *
 * Locators: page root is `data-testid="aiassistant-page"`. The "New chat"
 * button is the first action in the sidebar. The input is a textarea with
 * the i18n placeholder "Type your question...". The send button is the
 * submit type in the form at the bottom.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class AIAssistantPage {
  readonly page: Page;
  readonly root: Locator;
  readonly newChatButton: Locator;
  readonly input: Locator;
  readonly sendButton: Locator;
  readonly clearButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('aiassistant-page');
    this.newChatButton = page.getByRole('button', { name: /New chat/i });
    this.input = page.getByPlaceholder(/Type your question/i);
    // Send button is the only submit button in the chat form (the clear
    // button is type="button" with no type attr but the form has only one
    // submit).
    this.sendButton = page.locator('form button[type="submit"]');
    // Clear chat is identified by the title attribute on the icon button.
    this.clearButton = page.locator('button[title*="Clear" i]').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/ai-assistant');
  }

  async expectPage(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async clickNewChat(): Promise<void> {
    await this.newChatButton.click();
  }

  async typeMessage(text: string): Promise<void> {
    await this.input.fill(text);
  }

  async clickSend(): Promise<void> {
    await this.sendButton.click();
  }

  async expectAssistantReply(text: string | RegExp): Promise<void> {
    await expect(this.page.getByText(text).first()).toBeVisible();
  }
}
