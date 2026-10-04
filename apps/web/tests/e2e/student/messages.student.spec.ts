/**
 * Wave 2D — E2E: /student/messages (ComingSoon wrapper)
 */
import { test } from '@playwright/test';
import { MessagesPage } from '../pages/student/MessagesPage';

test.describe('TC-MSG-001: /student/messages placeholder', () => {
  test('should render the ComingSoon placeholder', async ({ page }) => {
    const messages = new MessagesPage(page);
    await messages.goto();
    await messages.expectPage();
    await messages.expectComingSoonCopy();
  });
});
