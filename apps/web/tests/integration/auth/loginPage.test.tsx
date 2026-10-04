/** Batch 4a — Integration: LoginPage */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import I18nProvider from '@/app/providers/I18nProvider';
import LoginPage from '@/pages/auth/LoginPage';
import { useAuthStore } from '@/app/store/authStore';

// ---- Network boundary mock -------------------------------------------------
vi.mock('@/services/api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

// Stub ApiError nếu test chạm vào nhánh lỗi.
vi.mock('@/config/api.config', () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

import { authApi } from '@/services/api/auth.api';
import type { AuthUser, AuthSession } from '@/services/api/auth.api';

// ---- Helper ----------------------------------------------------------------
/** AuthUser factory: every required field is filled with a sane default so
 *  mock objects satisfy the type without per-test boilerplate. */
const makeAuthUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'u1',
  email: 'student@ioes.com',
  fullName: 'Student User',
  avatarUrl: null,
  role: 'student',
  status: 'active',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

/** AuthSession factory: wraps `makeAuthUser` with the two extra fields the
 *  server normally returns (tokenType, expiresIn). */
const makeAuthSession = (overrides: Partial<AuthSession> = {}): AuthSession => ({
  user: makeAuthUser(),
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  tokenType: 'Bearer',
  expiresIn: 3600,
  ...overrides,
});

interface RenderOptions {
  initialEntries?: string[];
  initialState?: unknown;
}

const renderLogin = ({ initialEntries = ['/auth/login'], initialState }: RenderOptions = {}) =>
  render(
    <I18nProvider>
      <MemoryRouter
        initialEntries={initialEntries}
        initialIndex={0}
        {...(initialState !== undefined ? { initialState } : {})}
      >
        <Routes>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route
            path="/auth/register"
            element={<div data-testid="register-page">REGISTER_PAGE</div>}
          />
          <Route
            path="/auth/forgot-password"
            element={<div data-testid="forgot-password-page">FORGOT_PASSWORD_PAGE</div>}
          />
          <Route path="/student" element={<div data-testid="student-home">STUDENT_HOME</div>} />
          <Route
            path="/instructor"
            element={<div data-testid="instructor-home">INSTRUCTOR_HOME</div>}
          />
          <Route path="/admin" element={<div data-testid="admin-home">ADMIN_HOME</div>} />
          <Route path="/" element={<div data-testid="home">HOME</div>} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );

const getEmailInput = () => screen.getByPlaceholderText('email@company.com') as HTMLInputElement;
const getPasswordInput = () => screen.getByLabelText(/Mật khẩu/i) as HTMLInputElement;
// Submit button: exact "Đăng nhập" text inside the <form>. Demo quick-login
// buttons ("Admin", "Student", …) and social buttons ("Đăng nhập với Google")
// are excluded by the exact-name match.
const getSubmitButton = () =>
  screen.getByRole('button', { name: /^Đăng nhập$/ }) as HTMLButtonElement;

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
  });
  vi.mocked(authApi.login).mockReset();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
//  Validation — HTML5 contract
// =============================================================================
describe('LoginPage — email validation (HTML5 contract)', () => {
  it('IT-LOGINFORM-001: email field is type=email and required (HTML5 validity is enforced by browser)', () => {
    renderLogin();
    const email = getEmailInput();
    expect(email.type).toBe('email');
    expect(email.required).toBe(true);
    // Empty required email → form invalid (checkValidity=false).
    expect(email.checkValidity()).toBe(false);
    expect(email.validationMessage).not.toBe('');
  });

  it('IT-LOGINFORM-002: empty email value keeps checkValidity=false with a "fill out" message', () => {
    renderLogin();
    const email = getEmailInput();
    email.value = '';
    expect(email.checkValidity()).toBe(false);
    // The validationMessage is localized by jsdom's C locale; we only
    // assert non-empty so this test passes across machines.
    expect(email.validationMessage.length).toBeGreaterThan(0);
  });

  it('IT-LOGINFORM-003: invalid email string (no "@") flips checkValidity back to false after fix', async () => {
    const user = userEvent.setup();
    renderLogin();
    const email = getEmailInput();

    await user.type(email, 'not-an-email');
    // HTMLInputElement of type=email with text lacking '@' is invalid.
    expect(email.checkValidity()).toBe(false);

    await user.clear(email);
    await user.type(email, 'tester@ioes.com');
    expect(email.checkValidity()).toBe(true);
  });
});

// =============================================================================
//  Field interaction + masking
// =============================================================================
describe('LoginPage — input behavior', () => {
  it('IT-LOGINFORM-004: typing into the email field updates the controlled value', async () => {
    const user = userEvent.setup();
    renderLogin();
    const email = getEmailInput();

    await user.type(email, 'student@ioes.com');
    expect(email.value).toBe('student@ioes.com');
  });

  it('IT-LOGINFORM-005: password field is type=password (masked) and required', () => {
    renderLogin();
    const pwd = getPasswordInput();
    expect(pwd.type).toBe('password');
    expect(pwd.required).toBe(true);
  });

  it('IT-LOGINFORM-006: typing into the password field updates the controlled value but never renders it as text', async () => {
    const user = userEvent.setup();
    renderLogin();
    const pwd = getPasswordInput();

    await user.type(pwd, 'Secret123');
    expect(pwd.value).toBe('Secret123');
    // The DOM must NOT contain the raw secret anywhere — only as a value attr
    // of a type=password input. jsdom's value is set programmatically, so
    // container.textContent should never leak the secret.
    expect(document.body.textContent).not.toContain('Secret123');
  });

  it('IT-LOGINFORM-007: a very long valid email (boundary) still passes checkValidity', async () => {
    const user = userEvent.setup();
    renderLogin();
    const email = getEmailInput();

    // 60-char local + @ + 30-char domain = valid per HTML5.
    const longEmail = `${'a'.repeat(60)}@${'b'.repeat(30)}.com`;
    await user.type(email, longEmail);
    expect(email.checkValidity()).toBe(true);
  });

  it('IT-LOGINFORM-008: SQL/XSS-like strings typed into email/password are rendered as plain text, never executed', async () => {
    const user = userEvent.setup();
    renderLogin();
    const email = getEmailInput();
    const pwd = getPasswordInput();

    const xss = "'; DROP TABLE users;-- <script>alert(1)</script>";
    const beforeScripts = document.querySelectorAll('script').length;
    await user.type(email, xss);
    await user.type(pwd, xss);

    // Raw payload is stored verbatim in input.value; nothing is parsed.
    expect(email.value).toBe(xss);
    expect(pwd.value).toBe(xss);
    // No new <script> element was injected into the DOM (proves no eval).
    expect(document.querySelectorAll('script').length).toBe(beforeScripts);
  });
});

// =============================================================================
//  Submit + remember-me + nav
// =============================================================================
describe('LoginPage — submit & navigation', () => {
  it('IT-LOGINFORM-009: submitting valid credentials calls authApi.login and navigates by role (student)', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockResolvedValue(
      makeAuthSession({
        user: makeAuthUser({
          id: 'u1',
          email: 'student@ioes.com',
          fullName: 'Student User',
          role: 'student',
        }),
      })
    );

    renderLogin();
    await user.type(getEmailInput(), 'student@ioes.com');
    await user.type(getPasswordInput(), 'Test@123');
    await user.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByTestId('student-home')).toBeInTheDocument();
    });
    expect(authApi.login).toHaveBeenCalledTimes(1);
    expect(authApi.login).toHaveBeenCalledWith({
      email: 'student@ioes.com',
      password: 'Test@123',
    });
    // AuthStore updated with user + tokens.
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('student@ioes.com');
    expect(state.accessToken).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
  });

  it('IT-LOGINFORM-010: API failure renders the error message in red and keeps the user on /auth/login', async () => {
    const user = userEvent.setup();
    const apiError = new Error('Sai mật khẩu. Vui lòng thử lại.');
    // Use real ApiError shape from the mock factory.
    Object.setPrototypeOf(
      apiError,
      (await import('@/config/api.config')).ApiError.prototype
    );
    vi.mocked(authApi.login).mockRejectedValue(apiError);

    renderLogin();
    await user.type(getEmailInput(), 'student@ioes.com');
    await user.type(getPasswordInput(), 'WrongPassword');
    await user.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByText('Sai mật khẩu. Vui lòng thử lại.')).toBeInTheDocument();
    });
    // Stay on login.
    expect(screen.queryByTestId('student-home')).not.toBeInTheDocument();
    // Store remains unauthenticated.
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('IT-LOGINFORM-011: remember-me checkbox toggles state', async () => {
    const user = userEvent.setup();
    renderLogin();
    const checkbox = screen.getByRole('checkbox', { name: /Ghi nhớ đăng nhập/i });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('IT-LOGINFORM-012: forgot-password link points to /auth/forgot-password', () => {
    renderLogin();
    const link = screen.getByRole('link', { name: /Quên mật khẩu/i });
    expect(link).toHaveAttribute('href', '/auth/forgot-password');
  });

  it('IT-LOGINFORM-013: register link points to /auth/register', () => {
    renderLogin();
    const link = screen.getByRole('link', { name: /Đăng ký ngay/i });
    expect(link).toHaveAttribute('href', '/auth/register');
  });

  it('IT-LOGINFORM-014: when arrived from RegisterPage (registeredEmail in location.state), the email input is pre-filled and a success banner is shown', () => {
    renderLogin({
      initialEntries: [
        { pathname: '/auth/login', state: { registeredEmail: 'newuser@ioes.com' } } as never,
      ],
    });
    const email = getEmailInput();
    expect(email.value).toBe('newuser@ioes.com');
    expect(
      screen.getByText(/Đăng ký thành công\. Đăng nhập bằng tài khoản vừa tạo\./)
    ).toBeInTheDocument();
  });
});

// =============================================================================
//  Social login (placeholder alerts) + DEMO accounts
// =============================================================================
describe('LoginPage — social & demo placeholders', () => {
  it('IT-LOGINFORM-015: Google button triggers the "OAuth not connected" alert and does NOT submit the form', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    renderLogin();
    await user.type(getEmailInput(), 'student@ioes.com');
    await user.type(getPasswordInput(), 'Test@123');

    const googleBtn = screen.getByRole('button', { name: /Đăng nhập với Google/i });
    await user.click(googleBtn);

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('Google OAuth not connected yet.');
    // Form not submitted → authApi.login never invoked.
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('IT-LOGINFORM-016: GitHub button triggers the "OAuth not connected" alert and does NOT submit the form', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    renderLogin();
    await user.type(getEmailInput(), 'student@ioes.com');
    await user.type(getPasswordInput(), 'Test@123');

    const githubBtn = screen.getByRole('button', { name: /Đăng nhập với GitHub/i });
    await user.click(githubBtn);

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('GitHub OAuth not connected yet.');
    expect(authApi.login).not.toHaveBeenCalled();
  });
});
