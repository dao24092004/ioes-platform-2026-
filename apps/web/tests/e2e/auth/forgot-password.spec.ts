// Batch 6E — Forgot-password flow. The page simulates the API call locally
import { test, expect } from '@playwright/test';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { LoginPage } from '../pages/auth/LoginPage';

test.describe('TC-FORGOT: Forgot-password flow', () => {
  test('TC-FORGOT-001: at /auth/forgot-password, the email input and back-to-login link are visible', async ({
    page,
  }) => {
    const forgot = new ForgotPasswordPage(page);
    await forgot.goto();

    await expect(page).toHaveURL(/\/auth\/forgot-password$/);
    await expect(forgot.emailInput).toBeVisible();
    await expect(forgot.submitButton).toBeVisible();
    // "← Quay lại đăng nhập" link is rendered alongside the form.
    await expect(forgot.backToLoginLink).toBeVisible();
  });

  test('TC-FORGOT-002: submitting a valid email shows the success state (countdown + email chip)', async ({
    page,
  }) => {
    const forgot = new ForgotPasswordPage(page);
    await forgot.goto();

    await forgot.requestReset('student@ioes.com');

    // The page transitions to the success state. Source simulates the API with
    // a 1500ms timer before flipping the success flag and rendering this card.
    await expect(forgot.sentEmailChip).toBeVisible();
    await expect(forgot.sentEmailChip).toContainText('student@ioes.com');
    // Countdown starts at 24:00 (24 * 60 seconds).
    await expect(forgot.countdownText).toBeVisible();
    await expect(forgot.countdownText).toContainText(/24:00|23:5[5-9]|23:5\d/);
  });

  test('TC-FORGOT-003: back-to-login link navigates to /auth/login', async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);
    await forgot.goto();

    await forgot.backToLoginLink.click();
    await expect(page).toHaveURL(/\/auth\/login$/);

    // Sanity: login form is mounted.
    const login = new LoginPage(page);
    await expect(login.emailInput).toBeVisible();
  });

  test('TC-FORGOT-004: clicking "Thử email khác" after success returns to the empty form', async ({
    page,
  }) => {
    const forgot = new ForgotPasswordPage(page);
    await forgot.goto();

    await forgot.requestReset('someone@ioes.com');
    await expect(forgot.sentEmailChip).toBeVisible();

    // Source: `handleTryAfter` clears email + success flag → input is editable again.
    await forgot.tryAnotherButton.click();
    await expect(forgot.emailInput).toHaveValue('');
    await expect(forgot.sentEmailChip).not.toBeVisible();
  });
});
