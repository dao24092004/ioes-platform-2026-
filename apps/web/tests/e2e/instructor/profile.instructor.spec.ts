/** Wave 3D — E2E: /instructor/profile */
import { test, expect, type Page } from '@playwright/test';
import { InstructorProfilePage } from '../pages/instructor/InstructorProfilePage';

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

const instructor = {
  id: 'u-inst-1',
  email: 'instructor.e2e@example.test',
  fullName: 'Nguyễn Vân An',
  avatarUrl: null,
  role: 'instructor',
  status: 'active',
  emailVerified: true,
  createdAt: '2023-09-01T02:00:00Z',
};

const examRow = {
  id: 'e-1',
  courseId: null,
  instructorId: 'u-inst-1',
  title: 'Kiểm tra giữa kỳ',
  description: null,
  examType: 'MULTIPLE_CHOICE',
  timeLimitMinutes: 30,
  passingScore: 5,
  maxAttempts: 3,
  isRandomized: true,
  showResults: true,
};

test.describe('TC-IPROFILE-001: /instructor/profile change password', () => {
  test('should post the mocked change-password request and show the success line', async ({
    page,
  }) => {
    const changePasswordBodies: unknown[] = [];
    let changePasswordCalls = 0;

    await page.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(instructor)),
      })
    );
    await page.route('**/api/exams/grading/stats', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope({ pending: 3, graded: 7, oldestPendingSubmittedAt: null })),
      })
    );
    await page.route('**/api/exams', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope([examRow])),
      })
    );
    await page.route('**/api/auth/change-password', (route) => {
      changePasswordCalls += 1;
      changePasswordBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          timestamp: '2026-10-04T00:00:00Z',
          data: null,
        }),
      });
    });

    const profile = new InstructorProfilePage(page);
    const errors = await catchConsoleErrors(page, async () => {
      await profile.goto();
      await profile.expectPage();
      await profile.expectEmail(instructor.email);

      await profile.openSecurityTab();
      await profile.fillPasswords('old-pass-1234', 'new-pass-5678');
      await profile.submitPasswordChange();

      await expect(profile.passwordSuccess).toBeVisible();
      // The mutation resets all three controlled inputs.
      await expect(profile.oldPasswordInput).toHaveValue('');
      await expect(profile.newPasswordInput).toHaveValue('');
      await expect(profile.confirmPasswordInput).toHaveValue('');
    });

    expect(errors).toHaveLength(0);
    expect(changePasswordCalls).toBe(1);
    expect(changePasswordBodies[0]).toEqual({
      oldPassword: 'old-pass-1234',
      newPassword: 'new-pass-5678',
    });
  });
});
