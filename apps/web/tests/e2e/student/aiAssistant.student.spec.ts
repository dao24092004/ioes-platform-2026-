/** Wave 2D — E2E: /student/ai-assistant */
import { test } from '@playwright/test';
import { AIAssistantPage } from '../pages/student/AIAssistantPage';

test.describe('TC-AIASSIST-001: /student/ai-assistant chat flow', () => {
  test('should send a user message and render the assistant reply', async ({ page }) => {
    await page.route('**/api/ai/chat/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'ok', timestamp: 't', data: [] }),
      });
    });
    await page.route('**/api/ai/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          timestamp: 't',
          data: {
            sessionId: 's-1',
            messageId: 'm-1',
            answer: 'Use React hooks for state and effects.',
            grounded: true,
            sources: [],
            model: 'gemini',
            latencyMs: 200,
          },
        }),
      });
    });

    const ai = new AIAssistantPage(page);
    await ai.goto();
    await ai.expectPage();
    await ai.typeMessage('How do I use React state?');
    await ai.clickSend();
    await ai.expectAssistantReply(/Use React hooks/);
  });
});
