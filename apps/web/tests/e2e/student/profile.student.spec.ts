/** Wave 2D — E2E: /student/profile */
import { test, expect } from '@playwright/test';
import { ProfilePage } from '../pages/student/ProfilePage';

test.describe('TC-PROFILE-001: /student/profile change password', () => {
  test('should switch to Security tab, fill passwords, and fire POST /api/auth/change-password', async ({
    page,
  }) => {
    let postCalled = 0;
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          timestamp: 't',
          data: {
            id: 'u-1',
            email: 's@ioes.com',
            fullName: 'Student One',
            avatarUrl: null,
            role: 'student',
            status: 'active',
            emailVerified: true,
            createdAt: '2024-01-01T00:00:00Z',
          },
        }),
      });
    });
    await page.route('**/api/auth/change-password', async (route) => {
      postCalled += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'ok', timestamp: 't', data: null }),
      });
    });

    const profile = new ProfilePage(page);
    await profile.goto();
    await profile.expectPage();
    await profile.clickSecurityTab();
    await profile.fillPasswords('old12345678', 'new12345678');
    await profile.clickChangePassword();
    await expect.poll(() => postCalled).toBe(1);
  });
});
