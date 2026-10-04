// Batch 6B — Login input validation. Tests that the browser's HTML5 form
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/auth/LoginPage';

test.describe('TC-LOGIN: input validation (HTML5 blocks invalid submit)', () => {
  test('TC-LOGIN-007: empty email blocks submit, stays on /auth/login', async ({ page }) => {
    const login = new LoginPage(page);
    await login.gotoLogin();

    // Fill only password so the email slot is empty.
    await login.passwordInput.fill('something');
    await login.submitButton.click();

    // No navigation, no error banner (banner is React-side, after API).
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(login.errorBanner).not.toBeVisible();
  });

  test('TC-LOGIN-008: invalid email format (no "@") blocks submit', async ({ page }) => {
    const login = new LoginPage(page);
    await login.gotoLogin();

    await login.emailInput.fill('not-an-email');
    await login.passwordInput.fill('somepass');
    await login.submitButton.click();

    // The browser's type=email kicks in for inputs WITHOUT "@" — submit is
    // blocked and the email input is marked :invalid.
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(login.errorBanner).not.toBeVisible();

    // Validity contract: HTMLInputElement.validity.typeMismatch === true.
    const isInvalid = await login.emailInput.evaluate(
      (el) => (el as HTMLInputElement).validity.typeMismatch
    );
    expect(isInvalid).toBe(true);
  });

  test('TC-LOGIN-009: empty password (with valid email) blocks submit', async ({ page }) => {
    const login = new LoginPage(page);
    await login.gotoLogin();

    await login.emailInput.fill('student@ioes.com');
    // Leave password empty.
    await login.submitButton.click();

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(login.errorBanner).not.toBeVisible();

    const isInvalid = await login.passwordInput.evaluate(
      (el) => (el as HTMLInputElement).validity.valueMissing
    );
    expect(isInvalid).toBe(true);
  });

  test('TC-LOGIN-010: clicking "Quên mật khẩu?" navigates to /auth/forgot-password', async ({
    page,
  }) => {
    const login = new LoginPage(page);
    await login.gotoLogin();

    // The link is rendered by LoginPage only — not in the layout.
    await login.forgotPasswordLink.click();
    await expect(page).toHaveURL(/\/auth\/forgot-password$/);
    // Forgot-password page renders its own email input — proves we're on the
    // right page and not, e.g., stuck at /auth/login due to a missing route.
    await expect(login.emailInput).toBeVisible();
  });
});
