// Batch 6D — Register flow. Mirrors auth-validation.spec.ts for the
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';

test.describe('TC-REG: Register flow', () => {
  test('TC-REG-001: at /auth/register, the Register tab is active and fullName is visible', async ({
    page,
  }) => {
    const reg = new RegisterPage(page);
    await reg.goto();

    await expect(page).toHaveURL(/\/auth\/register$/);
    await expect(reg.fullNameInput).toBeVisible();
    await expect(reg.emailInput).toBeVisible();
    await expect(reg.passwordInput).toBeVisible();
    await expect(reg.confirmPasswordInput).toBeVisible();
    await expect(reg.agreeTermsCheckbox).toBeVisible();
  });

  test('TC-REG-002: footer "Đăng nhập" link returns to /auth/login', async ({ page }) => {
    const reg = new RegisterPage(page);
    await reg.goto();

    await reg.signInLink.click();
    await expect(page).toHaveURL(/\/auth\/login$/);

    // Sanity: we're really on the login form, not a 404-shaped route.
    const login = new LoginPage(page);
    await expect(login.emailInput).toBeVisible();
  });

  test('TC-REG-003: empty fullName blocks submit (HTML5 required)', async ({ page }) => {
    const reg = new RegisterPage(page);
    await reg.goto();

    // Fill everything except fullName, then check the terms checkbox and
    // click submit. The empty required fullName should block the form.
    await reg.emailInput.fill('someone@ioes.com');
    await reg.passwordInput.fill('Test@123');
    await reg.confirmPasswordInput.fill('Test@123');
    await reg.agreeTermsCheckbox.check();

    await reg.submitButton.click();

    await expect(page).toHaveURL(/\/auth\/register$/);
    await expect(reg.errorBanner).not.toBeVisible();

    const isMissing = await reg.fullNameInput.evaluate(
      (el) => (el as HTMLInputElement).validity.valueMissing
    );
    expect(isMissing).toBe(true);
  });

  test('TC-REG-004: password < 8 chars shows "Mật khẩu phải có ít nhất 8 ký tự"', async ({
    page,
  }) => {
    const reg = new RegisterPage(page);
    await reg.goto();

    await reg.fullNameInput.fill('Tester');
    await reg.emailInput.fill('tester@ioes.com');
    await reg.passwordInput.fill('Short1'); // 6 chars, < 8 threshold
    await reg.confirmPasswordInput.fill('Short1');
    await reg.agreeTermsCheckbox.check();

    await reg.submitButton.click();

    // React-side validation runs BEFORE the API call.
    await expect(reg.errorBanner).toBeVisible();
    await expect(reg.errorBanner).toContainText(/ít nhất 8|at least 8/i);
    await expect(page).toHaveURL(/\/auth\/register$/);
  });

  test('TC-REG-005: mismatched confirm-password shows "Mật khẩu nhập lại không khớp"', async ({
    page,
  }) => {
    const reg = new RegisterPage(page);
    await reg.goto();

    await reg.fullNameInput.fill('Tester');
    await reg.emailInput.fill('tester@ioes.com');
    await reg.passwordInput.fill('Test@123');
    await reg.confirmPasswordInput.fill('Different1!'); // mismatched
    await reg.agreeTermsCheckbox.check();

    await reg.submitButton.click();

    await expect(reg.errorBanner).toBeVisible();
    await expect(reg.errorBanner).toContainText(/không khớp|do not match/i);
    await expect(page).toHaveURL(/\/auth\/register$/);
  });

  // TC-REG-006: basic password strength meter — verifies meter text differs
  // between a weak password (length-only) and a strong password (4-of-5, last
  // in-bounds index). The 5-of-5 case is at TC-REG-010 (APP BUG) and crashes
  // the page; we deliberately use the 4-of-5 case here so the page does not
  // crash and we can compare two rendered labels.
  test('TC-REG-006: password strength meter shows different levels for weak vs strong passwords', async ({
    page,
  }) => {
    const reg = new RegisterPage(page);
    await reg.goto();

    // Weak password: only length criterion met (strength=1 → 'password.weak').
    await reg.passwordInput.fill('aaaaaaaa');
    await expect(reg.passwordStrengthText).toBeVisible();
    const weakText = await reg.passwordStrengthText.textContent();

    // Strong password (4-of-5, last in-bounds index → 'password.veryStrong').
    await reg.passwordInput.fill('GoodPass1word');
    await expect(reg.passwordStrengthText).toBeVisible();
    const strongText = await reg.passwordStrengthText.textContent();

    // Meter text must differ between weak and strong inputs.
    expect(strongText).not.toEqual(weakText);
    // 'Rất mạnh' (VI) or 'Very Strong' (EN) — match either via shared letters.
    expect(strongText?.toLowerCase()).toMatch(/r.t m.nh|very/i);
  });

  test('TC-REG-007: submit button is disabled until the terms checkbox is checked', async ({
    page,
  }) => {
    const reg = new RegisterPage(page);
    await reg.goto();

    // Source: `disabled={!agreeTerms || loading}` — without ticking the box,
    // the submit button is greyed out.
    await expect(reg.submitButton).toBeDisabled();

    await reg.agreeTermsCheckbox.check();
    await expect(reg.submitButton).toBeEnabled();

    await reg.agreeTermsCheckbox.uncheck();
    await expect(reg.submitButton).toBeDisabled();
  });

  test('TC-REG-008: a successful register redirects to /auth/login with the email pre-filled', async ({
    page,
  }) => {
    // Mock /api/auth/register so the happy path runs without an auth-service.
    // Use a regex match on the URL (POST /api/auth/register) so any payload
    // body is accepted; respond with a deterministic 200 envelope.
    await page.route(/\/api\/auth\/register(\?|$)/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          timestamp: '2026-10-03T00:00:00Z',
          data: { id: 'user-new', emailVerified: false },
        }),
      })
    );
    // Suppress /api/auth/me probes during the post-register navigation.
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 401, body: '{"success":false,"message":"Unauthorized"}' })
    );

    const reg = new RegisterPage(page);
    await reg.goto();

    // Use a unique email to avoid colliding with seed data; build it in-test
    // so the body matches the route mock and no real email is hardcoded.
    const unique = `t${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
    await reg.register('Batch 6', unique, 'Test@123');

    await expect(page).toHaveURL(/\/auth\/login$/);
    // Source: navigate('/auth/login', { state: { registeredEmail: email } })
    // and LoginPage picks it up — assertion: email input is prefilled.
    const login = new LoginPage(page);
    await expect(login.emailInput).toHaveValue(unique);
  });
});

// TC-REG-010/011: deeper password-strength assertions that go beyond the basic
// meter-update test (TC-REG-006). Kept in a separate describe so the report
// ends on a green TC-REG-011 after the documented-red TC-REG-010 (APP BUG).
test.describe('TC-REG: password strength — deeper assertions', () => {
  // APP BUG (RegisterPage.tsx strengthLevels index out of bounds):
  //   A 5-of-5 criteria password (length, lower, upper, digit, special) sets
  //   `strength` to 5. `strengthLevels` only has 4 entries, so
  //   `strengthLevels[strength-1]` reads past the array end. The dev-team
  //   patch (`Math.min(strength, 4)`) is intentionally NOT applied here.
  //   This test asserts: the strongest level (verystrong) is rendered WITHOUT
  //   an unhandled crash. If the app crashes during render, this fails on the
  //   crash (not on a level comparison); if the app silently renders an
  //   undefined/empty level, the assertion `toContainText(/verystrong/i)`
  //   fails. The test is the documented RED APP BUG.
  test('TC-REG-010: [APP BUG] a 5-of-5 password must render the strongest strength level without crashing (RegisterPage.tsx strengthLevels out-of-bounds)', async ({
    page,
  }) => {
    const reg = new RegisterPage(page);
    await reg.goto();

    // 5-of-5: length>=8 + lower + upper + digit + special.
    await reg.passwordInput.fill('Str0ng!Pass9');

    // If the page crashes on render (uncaught exception from
    // `t(undefined)` or `strengthColors[4]`), the toBeVisible assertion
    // below throws with the crash stack trace. That is the desired
    // behaviour: the test fails on the crash, not on a level comparison.
    await expect(reg.passwordStrengthText).toBeVisible({ timeout: 10_000 });

    // No crash: the page rendered, but the level text is undefined/empty
    // because of the out-of-bounds index. The strongest valid level
    // ('Rất mạnh' / 'Very Strong') is NOT present in the rendered text.
    // The assertion documents the APP BUG: it must fail until dev-team
    // applies the `Math.min(strength, 4)` patch in RegisterPage.tsx.
    await expect(reg.passwordStrengthText).toContainText(/r.t m.nh|very/i);
  });

  test('TC-REG-011: a 4-of-5 password (length+lower+upper+digit) renders the strongest valid strength level without crashing', async ({
    page,
  }) => {
    const reg = new RegisterPage(page);
    await reg.goto();

    // 4-of-5: missing special char — `strength` stays at 4 so the lookup
    // `strengthLevels[4-1] = strengthLevels[3] = 'password.veryStrong'` is
    // the last valid index. The strongest valid level should render
    // ('Rất mạnh' VI / 'Very Strong' EN).
    await reg.passwordInput.fill('GoodPass1word');
    await expect(reg.passwordStrengthText).toBeVisible({ timeout: 10_000 });
    await expect(reg.passwordStrengthText).toContainText(/r.t m.nh|very/i);
  });
});
