/** Wave 4 (admin) — Integration: the AdminLayout shell around /admin/*. */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import viJson from '@/locales/vi/common.json';
import { useAuthStore } from '@/app/store/authStore';
import { useUIStore } from '@/app/store/uiStore';
import ProtectedRoute from '@/app/router/ProtectedRoute';
import AdminLayout from '@/components/layout/AdminLayout';
import WalletPage from '@/pages/admin/WalletPage';

/** Spies on the HTTP boundary; AdminLayout pulls it in through useAuth. */
vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
  };
});

import { apiClient } from '@/config/api.config';

/**
 * The i18n instance AdminLayout drives from: `language` decides both the
 * language-toggle caption and the bundle every `t()` reads, and
 * `changeLanguage` is what the toggle is expected to call.
 */
const { i18nMock } = vi.hoisted(() => ({
  i18nMock: { language: 'vi', changeLanguage: vi.fn() },
}));

vi.mock('react-i18next', async () => {
  const { default: viBundle } = await import('@/locales/vi/common.json');
  return {
    useTranslation: () => ({
      t: (key: string, opts?: { returnObjects?: boolean }) => {
        const value = key.split('.').reduce<unknown>((node, part) => {
          if (node === null || typeof node !== 'object') return undefined;
          return (node as Record<string, unknown>)[part];
        }, viBundle);
        if (opts?.returnObjects === true) return Array.isArray(value) ? value : [];
        return typeof value === 'string' ? value : key;
      },
      i18n: i18nMock,
    }),
  };
});

/**
 * The 16 nav items, in the order AdminLayout lists them, with the i18n key
 * that produces each label. Mirrors the `sections` array so a re-pointed item
 * has to be changed here too.
 */
const NAV_ITEMS: Array<{ path: string; key: string }> = [
  { path: '/admin', key: 'admin.nav.dashboard' },
  { path: '/admin/analytics', key: 'admin.nav.analytics' },
  { path: '/admin/users', key: 'admin.nav.users' },
  { path: '/admin/courses/approval', key: 'admin.nav.courses' },
  { path: '/admin/instructors/approval', key: 'admin.nav.instructorApproval' },
  { path: '/admin/exams', key: 'admin.nav.exams' },
  { path: '/admin/discussions', key: 'admin.nav.discussions' },
  { path: '/admin/blockchain', key: 'admin.nav.blockchain' },
  { path: '/admin/tenants', key: 'admin.nav.tenants' },
  { path: '/admin/heatmaps', key: 'admin.nav.heatmaps' },
  { path: '/admin/funnels', key: 'admin.nav.funnels' },
  { path: '/admin/wallet', key: 'admin.nav.wallet' },
  { path: '/admin/security', key: 'admin.nav.security' },
  { path: '/admin/audit-log', key: 'admin.nav.auditLog' },
  { path: '/admin/notifications', key: 'admin.nav.notifications' },
  { path: '/admin/settings', key: 'admin.nav.settings' },
];

/** The class AdminLayout puts on the item whose page is open. */
const ACTIVE_TOKENS = ['bg-blue-50', 'text-blue-600'];
/** A class only the inactive item carries. */
const INACTIVE_TOKEN = 'text-slate-600';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const buildUser = (role: 'admin' | 'super_admin') => ({
  id: 'admin-1',
  email: 'admin@ioes.test',
  full_name: 'Admin One',
  role,
  avatar_url: null,
});

const navLink = (path: string) => screen.getByTestId(`admin-shell-nav-${path}`);
const classTokens = (element: HTMLElement) =>
  (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

/** Resolve a dotted i18n key against a shipped bundle, the way i18next does. */
function lookup(bundle: unknown, dottedKey: string): unknown {
  return dottedKey.split('.').reduce<unknown>((node, part) => {
    if (node === null || typeof node !== 'object') return undefined;
    return (node as Record<string, unknown>)[part];
  }, bundle);
}

function expectActive(path: string) {
  const tokens = classTokens(navLink(path));
  for (const token of ACTIVE_TOKENS) {
    expect(tokens, `${path} should be active`).toContain(token);
  }
  expect(tokens, `${path} should not also look inactive`).not.toContain(INACTIVE_TOKEN);
}

function expectInactive(path: string) {
  const tokens = classTokens(navLink(path));
  expect(tokens, `${path} should not be active`).not.toContain('bg-blue-50');
  expect(tokens, `${path} should look inactive`).toContain(INACTIVE_TOKEN);
}

/** Render AdminLayout at `path` with the given signed-in role. */
function renderShell(
  path: string,
  role: 'admin' | 'super_admin' = 'admin',
  props: { title?: string; subtitle?: string } = {}
) {
  useAuthStore.setState({
    user: buildUser(role),
    accessToken: 'admin-token',
    refreshToken: null,
    isAuthenticated: true,
    isLoading: false,
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AdminLayout title={props.title ?? viJson.admin.auditLog.title} subtitle={props.subtitle}>
          <div data-testid="shell-child" />
        </AdminLayout>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  i18nMock.language = 'vi';
  i18nMock.changeLanguage.mockClear();
  useUIStore.setState({ theme: 'system' });
  vi.mocked(apiClient.get).mockClear();
  vi.mocked(apiClient.post).mockClear();
});

afterEach(() => {
  cleanup();
});

describe('IT-ADMSHELL: the AdminLayout sidebar, role label, drawer and guard', () => {
  it('IT-ADMSHELL-001: should render all 16 nav items as links with the expected href and label', async () => {
    renderShell('/admin');

    expect(screen.getByTestId('admin-shell-brand')).toHaveAttribute('href', '/');
    for (const { path, key } of NAV_ITEMS) {
      const link = navLink(path);
      expect(link.tagName, `${path} should be an anchor`).toBe('A');
      expect(link, `${path} href`).toHaveAttribute('href', path);
      expect(link, `${path} label`).toHaveTextContent(lookup(viJson, key) as string);
    }
    // Five section headings, each with its own <ul> of items.
    expect(within(screen.getByTestId('admin-shell-nav')).getAllByRole('list')).toHaveLength(5);
  });

  it('IT-ADMSHELL-002: should mark only the current page active — /admin exactly, its siblings by prefix', async () => {
    renderShell('/admin');
    expectActive('/admin');
    for (const { path } of NAV_ITEMS.filter((item) => item.path !== '/admin')) {
      expectInactive(path);
    }

    // A nested route still lights its section: 'Tenants' is a prefix of
    // '/admin/tenants/t-42'.
    cleanup();
    renderShell('/admin/tenants/t-42');
    expectActive('/admin/tenants');
    // ...but '/admin' itself is an exact match, so the dashboard does NOT stay
    // highlighted while a child page is open.
    expectInactive('/admin');
    expectInactive('/admin/analytics');
    expectInactive('/admin/exams');

    // The instructor-approval item is nested two segments deep, so a prefix
    // match has to work for it as well.
    cleanup();
    renderShell('/admin/courses/approval');
    expectActive('/admin/courses/approval');
    expectInactive('/admin/instructors/approval');
  });

  it('IT-ADMSHELL-003: should label the footer with the admin role and with super_admin respectively', async () => {
    renderShell('/admin', 'admin');
    const asAdmin = screen.getByTestId('admin-shell-role-label');
    expect(asAdmin).toHaveTextContent(viJson.admin.role.admin);
    // The shared admin account may be either role and the app is Vietnamese
    // by default, so the label has to read as an admin label in both locales.
    expect(asAdmin).toHaveTextContent(/quản trị|admin/i);
    expect(screen.getByTestId('admin-shell-user-name')).toHaveTextContent('Admin One');

    cleanup();
    renderShell('/admin', 'super_admin');
    const asSuperAdmin = screen.getByTestId('admin-shell-role-label');
    expect(asSuperAdmin).toHaveTextContent(viJson.admin.role.superAdmin);
    expect(asSuperAdmin).toHaveTextContent(/super\s*admin/i);
    // The two branches must not collapse into the same string.
    expect(asSuperAdmin.textContent).not.toBe(asAdmin.textContent);
  });

  it('IT-ADMSHELL-004: should flip the collapsed state of the sidebar from the toggle button', async () => {
    const user = userEvent.setup();
    renderShell('/admin');

    const sidebar = screen.getByTestId('admin-shell-sidebar');
    const toggle = screen.getByTestId('admin-shell-sidebar-toggle');
    // Collapsed: the drawer is parked off-canvas and there is no scrim.
    expect(screen.queryByTestId('admin-shell-overlay')).not.toBeInTheDocument();
    expect(classTokens(sidebar)).toContain('-translate-x-full');

    await user.click(toggle);
    expect(screen.getByTestId('admin-shell-overlay')).toBeInTheDocument();
    expect(classTokens(screen.getByTestId('admin-shell-sidebar'))).toContain('translate-x-0');

    await user.click(toggle);
    expect(screen.queryByTestId('admin-shell-overlay')).not.toBeInTheDocument();
    expect(classTokens(sidebar)).toContain('-translate-x-full');

    // Tapping a nav item closes the drawer again, otherwise a phone-sized
    // screen would keep the menu covering the page that was just opened.
    await user.click(screen.getByTestId('admin-shell-sidebar-toggle'));
    await user.click(navLink('/admin/wallet'));
    expect(screen.queryByTestId('admin-shell-overlay')).not.toBeInTheDocument();
  });

  it('IT-ADMSHELL-005: should drive the language and theme controls and offer a logout control without using it', async () => {
    const user = userEvent.setup();
    renderShell('/admin', 'admin', {
      title: viJson.admin.auditLog.title,
      subtitle: viJson.admin.auditLog.subtitle,
    });

    expect(screen.getByTestId('admin-shell-header-title')).toHaveTextContent(
      viJson.admin.auditLog.title
    );
    expect(screen.getByText(viJson.admin.auditLog.subtitle)).toBeInTheDocument();

    // Language toggle: vi -> en, and its caption follows the current language.
    const langToggle = screen.getByTestId('admin-shell-lang-toggle');
    expect(langToggle).toHaveTextContent('VN');
    await user.click(langToggle);
    expect(i18nMock.changeLanguage).toHaveBeenCalledWith('en');

    cleanup();
    i18nMock.language = 'en';
    renderShell('/admin');
    const enLangToggle = screen.getByTestId('admin-shell-lang-toggle');
    expect(enLangToggle).toHaveTextContent('EN');
    await user.click(enLangToggle);
    expect(i18nMock.changeLanguage).toHaveBeenLastCalledWith('vi');

    // Theme toggle: the store's default 'system' flips to 'dark' first.
    cleanup();
    i18nMock.language = 'vi';
    useUIStore.setState({ theme: 'system' });
    renderShell('/admin');
    expect(useUIStore.getState().theme).toBe('system');
    await user.click(screen.getByTestId('admin-shell-theme-toggle'));
    expect(useUIStore.getState().theme).toBe('dark');
    await user.click(screen.getByTestId('admin-shell-theme-toggle'));
    expect(useUIStore.getState().theme).toBe('light');

    expect(screen.getByTestId('admin-shell-notifications-button')).toBeInTheDocument();

    // The logout control is present and carries the translated title. It is
    // deliberately not clicked: that would end the shared admin session.
    const logout = screen.getByTestId('admin-shell-logout');
    expect(logout.tagName).toBe('BUTTON');
    expect(logout).toHaveAttribute('title', viJson.header.logout);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('IT-ADMSHELL-006: should let admin and super_admin through the admin guard and bounce an anonymous visitor', async () => {
    const guard = (role: 'admin' | 'super_admin' | null) => {
      useAuthStore.setState({
        user: role ? buildUser(role) : null,
        accessToken: role ? 'admin-token' : null,
        refreshToken: null,
        isAuthenticated: role !== null,
        isLoading: false,
      });
      return render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/admin/wallet']}>
            <Routes>
              <Route path="/auth/login" element={<div>LOGIN_PAGE</div>} />
              <Route path="/admin" element={<div>ADMIN_HOME</div>} />
              <Route
                path="/admin/wallet"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                    <WalletPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );
    };

    guard('admin');
    expect(await screen.findByTestId('admin-coming-wallet')).toBeInTheDocument();

    cleanup();
    guard('super_admin');
    expect(await screen.findByTestId('admin-coming-wallet')).toBeInTheDocument();

    cleanup();
    guard(null);
    expect(await screen.findByText('LOGIN_PAGE')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-shell-root')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-coming-wallet')).not.toBeInTheDocument();
  });
});
