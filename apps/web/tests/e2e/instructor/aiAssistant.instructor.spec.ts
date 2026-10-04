/** Wave 3D — E2E: /instructor/ai-assistant */
import { test, expect, type Page } from '@playwright/test';
import { InstructorAIAssistantPage } from '../pages/instructor/InstructorAIAssistantPage';

type ConsoleErrorListener = (msg: { type: () => string; text: () => string }) => void;

function catchConsoleErrors(page: Page, fn: () => Promise<void>): Promise<string[]> {
  const errors: string[] = [];
  const listener: ConsoleErrorListener = (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  };
  page.on('console', listener);
  return fn()
    .finally(() => page.off('console', listener))
    .then(() => errors);
}

const envelope = <T>(data: T) => ({
  success: true,
  message: 'ok',
  timestamp: '2026-10-04T00:00:00Z',
  data,
});

const storedSession = {
  id: 's-1',
  userId: 'u-inst-1',
  title: 'Soạn giáo án mảng',
  status: 'active',
  messageCount: 2,
  lastMessageAt: '2026-10-04T01:00:00Z',
  metadata: {},
  createdAt: '2026-10-03T01:00:00Z',
  updatedAt: '2026-10-04T01:00:00Z',
};

const chatTurn = {
  sessionId: 's-new',
  messageId: 'm-9',
  answer: 'Dưới đây là gợi ý giáo án cho bài mảng.',
  grounded: true,
  sources: [{ docId: 'd1', chunkId: 'c1', title: 'Mảng', score: 0.9 }],
  model: 'gemini',
  latencyMs: 900,
};

test.describe('TC-IAIASSIST-001: /instructor/ai-assistant chat round trip', () => {
  test('should list a stored session, send a padded question and render the assistant answer', async ({
    page,
  }) => {
    const askBodies: unknown[] = [];
    // A pathname predicate, NOT a `**\/api\/**` glob: in dev the module URL of
    // `src/services/api/ai.api.ts` also contains `/api/`, and such a glob
    // answers the app's own source request with JSON and leaves a blank page.
    await page.route(
      (url) => url.pathname.startsWith('/api/ai/'),
      async (route) => {
        const url = route.request().url();
        if (route.request().method() === 'POST' && url.endsWith('/api/ai/chat')) {
          askBodies.push(route.request().postDataJSON());
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(envelope(chatTurn)),
          });
          return;
        }
        if (url.endsWith('/api/ai/chat/sessions')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(envelope([storedSession])),
          });
          return;
        }
        // Any other read of the mock is answered with an empty transcript.
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(envelope([])),
        });
      }
    );

    const assistant = new InstructorAIAssistantPage(page);
    const errors = await catchConsoleErrors(page, async () => {
      await assistant.goto();
      await assistant.expectPage();
      await assistant.waitForSessions();

      // The stored session is listed next to the local draft thread.
      await expect(assistant.page.getByText('Soạn giáo án mảng')).toBeVisible();
      await expect(assistant.sessionEntries).toHaveCount(2);

      // A padded prompt is trimmed by the page before it is sent.
      await assistant.send('   Soạn giáo án giúp tôi   ');
      await assistant.expectUserMessage('Soạn giáo án giúp tôi');
      await assistant.expectAssistantMessage('Dưới đây là gợi ý giáo án cho bài mảng.');
      await assistant.expectNoErrorBanner();
    });

    expect(errors).toHaveLength(0);
    // The wire payload carries the trimmed question and, on the first turn of
    // a draft thread, no sessionId.
    expect(askBodies).toHaveLength(1);
    expect(askBodies[0]).toEqual({ question: 'Soạn giáo án giúp tôi' });
  });
});
