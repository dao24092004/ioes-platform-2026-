/** apps/web/tests/integration/errorAuthLayout.test.tsx */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NotFoundPage from '@/pages/error/404';
import ServerErrorPage from '@/pages/error/500';
import AuthLayout from '@/pages/auth/AuthLayout';
import I18nProvider from '@/app/providers/I18nProvider';

// ---------------------------------------------------------------------------
// Test harness — renders AuthLayout inside MemoryRouter with login/register routes
// ---------------------------------------------------------------------------
const DummyLoginForm = () => <div data-testid="login-form-placeholder">LOGIN_FORM</div>;
const DummyRegisterForm = () => <div data-testid="register-form-placeholder">REGISTER_FORM</div>;

const renderAuthLayout = (initialRoute = '/auth/login') =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/auth/login" element={<DummyLoginForm />} />
            <Route path="/auth/register" element={<DummyRegisterForm />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );

// ---------------------------------------------------------------------------
// 404 page — render with MemoryRouter so Link resolves
// ---------------------------------------------------------------------------
const render404Page = () =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/non-existent']}>
        <Routes>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );

// ---------------------------------------------------------------------------
// 500 page — render with MemoryRouter; mock window.location.reload
// ---------------------------------------------------------------------------
const reloadMock = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: reloadMock, href: 'http://localhost/' },
  writable: true,
});

const render500Page = () =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/500']}>
        <Routes>
          <Route path="/500" element={<ServerErrorPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );

beforeEach(() => {
  reloadMock.mockClear();
});

// =====================================================================
// 404 PAGE
// =====================================================================
describe('404 page — NotFoundPage', () => {
  it('IT-ERRORAUTH-001: should render the 404 heading text', () => {
    render404Page();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('404');
  });

  it('IT-ERRORAUTH-002: should render the "Back to Home" link with href=/', () => {
    render404Page();
    // Vietnamese: "Quay về trang chủ", English: "Back to Home"
    const homeLink = screen.getByRole('link', { name: /quay về trang chủ|back to home/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('IT-ERRORAUTH-003: should render the "Back to Login" link with href=/auth/login', () => {
    render404Page();
    // Vietnamese: "Quay về đăng nhập", English: "Back to Login"
    const loginLink = screen.getByRole('link', { name: /quay về đăng nhập|back to login/i });
    expect(loginLink).toHaveAttribute('href', '/auth/login');
  });

  it('IT-ERRORAUTH-004: should render the IOES logo link with href=/', () => {
    render404Page();
    // The IOES logo is a link with "IOES" span text.
    const logoLinks = screen.getAllByText(/^IOES$/i);
    expect(logoLinks.length).toBeGreaterThanOrEqual(1);
    // Verify one of the IOES links points to /
    const logoLink = logoLinks.find((el) => {
      const anchor = el.closest('a');
      return anchor && anchor.getAttribute('href') === '/';
    });
    expect(logoLink).toBeDefined();
  });
});

// =====================================================================
// 500 PAGE
// =====================================================================
describe('500 page — ServerErrorPage', () => {
  it('IT-ERRORAUTH-005: should render the 500 heading text', () => {
    render500Page();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('500');
  });

  it('IT-ERRORAUTH-006: should render a "Try Again" button that calls window.location.reload on click', async () => {
    const user = userEvent.setup();
    render500Page();

    // Vietnamese: "Thử lại", English: "Try Again"
    const tryAgainBtn = screen.getByRole('button', { name: /thử lại|try again/i });
    await user.click(tryAgainBtn);

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('IT-ERRORAUTH-007: should render a "Back to Home" link with href=/', () => {
    render500Page();
    // Vietnamese: "Quay về trang chủ", English: "Back to Home"
    const homeLink = screen.getByRole('link', { name: /quay về trang chủ|back to home/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('IT-ERRORAUTH-008: should render the IOES logo link with href=/', () => {
    render500Page();
    // The IOES logo is a link with "IOES" span text.
    const logoLinks = screen.getAllByText(/^IOES$/i);
    expect(logoLinks.length).toBeGreaterThanOrEqual(1);
    const logoLink = logoLinks.find((el) => {
      const anchor = el.closest('a');
      return anchor && anchor.getAttribute('href') === '/';
    });
    expect(logoLink).toBeDefined();
  });
});

// =====================================================================
// AUTHLAYOUT SHELL
// =====================================================================
describe('AuthLayout — login state', () => {
  it('IT-ERRORAUTH-009: should show login form heading ("Chào mừng bạn!") when at /auth/login', () => {
    renderAuthLayout('/auth/login');

    // Vietnamese: "Chào mừng bạn!" (auth.welcomeBack), English: "Welcome Back!"
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /chào mừng bạn|welcome back/i,
      })
    ).toBeInTheDocument();
  });

  it('IT-ERRORAUTH-010: should show register form heading ("Tạo tài khoản") when at /auth/register', () => {
    renderAuthLayout('/auth/register');

    // Vietnamese: "Tạo tài khoản" (auth.createAccount), English: "Create Account"
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /tạo tài khoản|create account/i,
      })
    ).toBeInTheDocument();
  });

  it('IT-ERRORAUTH-011: should have the login tab marked as active when at /auth/login', () => {
    renderAuthLayout('/auth/login');

    const loginTab = screen.getByTestId('auth-tab-login');
    const registerTab = screen.getByTestId('auth-tab-register');

    // Active tab: login tab has text-white class; inactive tab (register) has text-slate-600.
    expect(loginTab).toHaveClass(/\btext-white\b/);
    expect(registerTab).toHaveClass(/\btext-slate-600\b/);
  });

  it('IT-ERRORAUTH-012: should have the register tab marked as active when at /auth/register', () => {
    renderAuthLayout('/auth/register');

    const loginTab = screen.getByTestId('auth-tab-login');
    const registerTab = screen.getByTestId('auth-tab-register');

    // Active tab: register tab has text-white class; inactive tab (login) has text-slate-600.
    expect(registerTab).toHaveClass(/\btext-white\b/);
    expect(loginTab).toHaveClass(/\btext-slate-600\b/);
  });

  it('IT-ERRORAUTH-013: should render the login form inside the Outlet when at /auth/login', () => {
    renderAuthLayout('/auth/login');
    expect(screen.getByTestId('login-form-placeholder')).toBeInTheDocument();
  });

  it('IT-ERRORAUTH-014: should render the register form inside the Outlet when at /auth/register', () => {
    renderAuthLayout('/auth/register');
    expect(screen.getByTestId('register-form-placeholder')).toBeInTheDocument();
  });

  it('IT-ERRORAUTH-015: should navigate to /auth/register and show register branding when the Register tab is clicked', async () => {
    const user = userEvent.setup();
    renderAuthLayout('/auth/login');

    const registerTab = screen.getByTestId('auth-tab-register');
    await user.click(registerTab);

    // After clicking, the Outlet should render the register form
    expect(screen.getByTestId('register-form-placeholder')).toBeInTheDocument();
    // Heading should now show "Tạo tài khoản" / "Create Account"
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /tạo tài khoản|create account/i,
      })
    ).toBeInTheDocument();
  });

  it('IT-ERRORAUTH-016: should navigate to /auth/login and show login branding when the Login tab is clicked from register', async () => {
    const user = userEvent.setup();
    renderAuthLayout('/auth/register');

    const loginTab = screen.getByTestId('auth-tab-login');
    await user.click(loginTab);

    // After clicking, the Outlet should render the login form
    expect(screen.getByTestId('login-form-placeholder')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /chào mừng bạn|welcome back/i,
      })
    ).toBeInTheDocument();
  });

  it('IT-ERRORAUTH-017: should render the mobile-only logo visible in DOM (lg breakpoint element exists)', () => {
    renderAuthLayout('/auth/login');

    // The mobile logo div is inside AuthLayout: <div className="lg:hidden ...">
    // In jsdom, both desktop and mobile elements are rendered; we assert existence.
    const mobileLogo = document.querySelector('.lg\\:hidden');
    expect(mobileLogo).toBeInTheDocument();
  });
});

// =============================================================================
// Merged from errorAuthLayout-extra.test.tsx (now deleted).
// Old → new ID mapping (Wave 1 second pass — eliminates the IT-ERRORAUTH-001..010
// collision that existed with the sibling errorAuthLayout.test.tsx file):
//   UT-ERRORAUTH-001  →  IT-ERRORAUTH-018  (pathIsLogin /auth/login)
//   UT-ERRORAUTH-002  →  IT-ERRORAUTH-019  (pathIsLogin /auth/register)
//   UT-ERRORAUTH-003  →  IT-ERRORAUTH-020  (pathIsLogin /)
//   UT-ERRORAUTH-004  →  IT-ERRORAUTH-021  (pathIsLogin /auth/login/reset)
//   UT-ERRORAUTH-005  →  IT-ERRORAUTH-022  (pathIsLogin '')
//   UT-ERRORAUTH-006  →  IT-ERRORAUTH-023  (pathIsLogin /auth/forgot-password)
//   UT-ERRORAUTH-007  →  IT-ERRORAUTH-024  (pathIsLogin /login substring)
//   UT-ERRORAUTH-008  →  IT-ERRORAUTH-025  (Button as={Link} → '/')
//   UT-ERRORAUTH-009  →  IT-ERRORAUTH-026  (Button as={Link} → '/auth/login')
//   UT-ERRORAUTH-010  →  IT-ERRORAUTH-027  (Button as={Link} → '/auth/register')
//   UT-ERRORAUTH-011..016  →  REMOVED  (404/500 tests duplicate
//                            IT-ERRORAUTH-001..008 above — coverage already
//                            provided by the main file's 404/500 describe blocks).
// =============================================================================

import { BrowserRouter, Link } from 'react-router-dom';
import Button from '@/components/common/Button';

/** Mirrors AuthLayout isLogin: pathname.includes('/login') (LOCKED LOGIC) */
function pathIsLogin(pathname: string): boolean {
  return pathname.includes('/login');
}

describe('pathIsLogin - isLogin derivation (AuthLayout.tsx:15)', () => {
  it('IT-ERRORAUTH-018: should return true when pathname is /auth/login', () => {
    expect(pathIsLogin('/auth/login')).toBe(true);
  });

  it('IT-ERRORAUTH-019: should return false when pathname is /auth/register', () => {
    expect(pathIsLogin('/auth/register')).toBe(false);
  });

  it('IT-ERRORAUTH-020: should return false when pathname is root /', () => {
    expect(pathIsLogin('/')).toBe(false);
  });

  it('IT-ERRORAUTH-021: should return true when pathname starts with /auth/login/', () => {
    expect(pathIsLogin('/auth/login/reset-password')).toBe(true);
  });

  it('IT-ERRORAUTH-022: should return false when pathname is empty string', () => {
    expect(pathIsLogin('')).toBe(false);
  });

  it('IT-ERRORAUTH-023: should return false when pathname is /auth/forgot-password', () => {
    expect(pathIsLogin('/auth/forgot-password')).toBe(false);
  });

  it('IT-ERRORAUTH-024: should return true when pathname contains /login as substring', () => {
    // /auth/login/reset-password contains /login → true
    expect(pathIsLogin('/auth/login/reset-password')).toBe(true);
  });
});

const renderButton = (to: string) =>
  render(
    <BrowserRouter>
      <Button as={Link} to={to} data-testid="test-button">
        Go somewhere
      </Button>
    </BrowserRouter>
  );

describe('Button `as` polymorphic prop - Link rendering', () => {
  it('IT-ERRORAUTH-025: should render an <a> element when as={Link} with correct href', () => {
    renderButton('/');
    const anchor = screen.getByTestId('test-button');
    expect(anchor.tagName).toBe('A');
    expect(anchor).toHaveAttribute('href', '/');
  });

  it('IT-ERRORAUTH-026: should render an <a> with href=/auth/login when to=/auth/login', () => {
    renderButton('/auth/login');
    const anchor = screen.getByTestId('test-button');
    expect(anchor.tagName).toBe('A');
    expect(anchor).toHaveAttribute('href', '/auth/login');
  });

  it('IT-ERRORAUTH-027: should render an <a> with href=/auth/register when to=/auth/register', () => {
    renderButton('/auth/register');
    const anchor = screen.getByTestId('test-button');
    expect(anchor.tagName).toBe('A');
    expect(anchor).toHaveAttribute('href', '/auth/register');
  });
});
