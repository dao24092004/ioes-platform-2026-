/** Wave 2D — E2E: /student/notifications */
import { test } from '@playwright/test';
import { NotificationsPage } from '../pages/student/NotificationsPage';

test.describe('TC-NOTIF-001: /student/notifications inbox', () => {
  test('should render the inbox with one sent notification', async ({ page }) => {
    await page.route('**/api/notifications/user/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          timestamp: 't',
          data: [
            {
              id: 'n-1',
              userId: 'u-1',
              type: 'email',
              subject: 'Welcome to IOES',
              status: 'sent',
              sentAt: '2026-10-01T00:00:00Z',
              createdAt: '2026-10-01T00:00:00Z',
            },
          ],
        }),
      });
    });

    const notif = new NotificationsPage(page);
    await notif.goto();
    await notif.expectPage();
    await notif.expectSubjectVisible(/Welcome to IOES/);
  });
});
