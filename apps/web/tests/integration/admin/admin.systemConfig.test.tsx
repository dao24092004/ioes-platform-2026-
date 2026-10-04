/** Wave 4B (admin) — Integration: SystemConfigPage (`/admin/settings`). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
  };
});

import SystemConfigPage from '@/pages/admin/SystemConfigPage';
import I18nProvider from '@/app/providers/I18nProvider';
import { apiClient } from '@/config/api.config';
import { useAuthStore } from '@/app/store/authStore';

/** Bilingual — the UI ships Vietnamese first, English after a language switch. */
const SAVED_AT = /đã lưu lúc|saved at/i;
const LOADING = /đang tải|loading/i;
const SAVE = /lưu|save/i;

const SECTIONS = [
  { key: 'general', own: 'admin-config-platform-name', foreign: 'admin-config-min-length' },
  { key: 'security', own: 'admin-config-min-length', foreign: 'admin-config-default-duration' },
  { key: 'exam', own: 'admin-config-default-duration', foreign: 'admin-config-email-channel' },
  { key: 'notification', own: 'admin-config-email-channel', foreign: 'admin-config-network' },
  { key: 'blockchain', own: 'admin-config-network', foreign: 'admin-config-auto-backup' },
  { key: 'backup', own: 'admin-config-auto-backup', foreign: 'admin-config-platform-name' },
] as const;

const renderPage = () => {
  // AdminLayout -> useAuth reads a QueryClient, so the provider is required
  // even though this page itself issues no query.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/admin/settings']}>
          <SystemConfigPage />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
};

/**
 * Fill a controlled input with ONE input event.
 *
 * `user.type()` re-reads the element's DOM `value` before every character, so
 * under load React's re-render lands after the read and the characters
 * interleave. `paste()` is still a real user gesture but fires a single input
 * event, which is both exact and cheap.
 */
const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  el: HTMLElement,
  text: string
): Promise<void> => {
  await user.clear(el);
  await user.paste(text);
};

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'admin.ops@ioes.test',
      full_name: 'IOES Ops Admin',
      role: 'admin' as const,
      avatar_url: null,
    },
    accessToken: 'fake-access-token',
    refreshToken: 'fake-refresh-token',
    isAuthenticated: true,
    isLoading: false,
  });
  for (const m of ['get', 'post', 'patch', 'delete', 'put'] as const) {
    vi.mocked(apiClient[m]).mockReset();
  }
});

// ---------------------------------------------------------------------------
// IT-ADMCONFIG-001 — section routing and the read/write path of every control
// ---------------------------------------------------------------------------
describe('IT-ADMCONFIG-001: SystemConfigPage sections and field state', () => {
  it('IT-ADMCONFIG-001: should open on the General section, render only that section, keep an edited value across a round trip through another section, and apply text, number, select and toggle edits to React state', async () => {
    const user = userEvent.setup();
    renderPage();

    const panel = screen.getByTestId('admin-config-panel');
    expect(panel).toBeInTheDocument();
    // Six section buttons, and General is the one open on first paint.
    for (const s of SECTIONS) {
      expect(screen.getByTestId(`admin-config-section-${s.key}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('admin-config-platform-name')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-config-min-length')).not.toBeInTheDocument();

    // The shipped defaults, read straight off the component.
    const name = screen.getByTestId('admin-config-platform-name');
    expect(name).toHaveValue('IOES Platform');
    expect(screen.getByTestId('admin-config-support-email')).toHaveValue('support@ioes.vn');
    expect(screen.getByTestId('admin-config-default-lang')).toHaveValue('vi');
    expect(screen.getByTestId('admin-config-timezone')).toHaveValue('Asia/Ho_Chi_Minh');
    expect(screen.getByTestId('admin-config-maintenance')).toHaveAttribute('aria-checked', 'false');

    // Text edit.
    await fill(user, name, 'IOES Exam Cloud');
    expect(name).toHaveValue('IOES Exam Cloud');

    // Select edits.
    await user.selectOptions(screen.getByTestId('admin-config-default-lang'), 'en');
    expect(screen.getByTestId('admin-config-default-lang')).toHaveValue('en');
    await user.selectOptions(screen.getByTestId('admin-config-timezone'), 'UTC');
    expect(screen.getByTestId('admin-config-timezone')).toHaveValue('UTC');

    // Toggle edit.
    await user.click(screen.getByTestId('admin-config-maintenance'));
    expect(screen.getByTestId('admin-config-maintenance')).toHaveAttribute('aria-checked', 'true');

    // Number edit, and the `parseInt(v,10) || 0` collapse for a blank field.
    await user.click(screen.getByTestId('admin-config-section-security'));
    const minLength = await screen.findByTestId('admin-config-min-length');
    expect(minLength).toHaveValue(8);
    expect(screen.getByTestId('admin-config-session-timeout')).toHaveValue(60);
    await fill(user, minLength, '12');
    expect(minLength).toHaveValue(12);
    await fill(user, minLength, '');
    expect(minLength).toHaveValue(0); // not NaN, not ''
    expect(screen.getByTestId('admin-config-mfa-required')).toHaveAttribute('aria-checked', 'true');

    // Back to General: the edited values are still there. State lives on the
    // page, not on the section, so unmounting a section keeps its values.
    await user.click(screen.getByTestId('admin-config-section-general'));
    expect(await screen.findByTestId('admin-config-platform-name')).toHaveValue('IOES Exam Cloud');
    expect(screen.getByTestId('admin-config-default-lang')).toHaveValue('en');
    expect(screen.getByTestId('admin-config-maintenance')).toHaveAttribute('aria-checked', 'true');

    // Exactly one section is mounted at a time.
    for (const s of SECTIONS) {
      await user.click(screen.getByTestId(`admin-config-section-${s.key}`));
      expect(screen.getByTestId(s.own)).toBeInTheDocument();
      expect(screen.queryByTestId(s.foreign)).not.toBeInTheDocument();
    }
  });
});

// ---------------------------------------------------------------------------
// IT-ADMCONFIG-002 — save, run-backup, and the fact that nothing is persisted
// ---------------------------------------------------------------------------
describe('IT-ADMCONFIG-002: SystemConfigPage save and backup', () => {
  it('IT-ADMCONFIG-002: should disable Save for 800ms and then stamp savedAt, re-stamp it from run-backup, issue no HTTP request at all, and lose every value on a remount', async () => {
    const user = userEvent.setup();
    const first = renderPage();

    const save = screen.getByTestId('admin-config-save');
    expect(save).toBeEnabled();
    expect(save).toHaveTextContent(SAVE);
    // Nothing is stamped before the first save.
    expect(screen.queryByTestId('admin-config-saved-at')).not.toBeInTheDocument();

    await user.click(save);
    // The 800ms timer holds the button in its pending state.
    expect(save).toBeDisabled();
    expect(save).toHaveTextContent(LOADING);

    const stamp = await screen.findByTestId('admin-config-saved-at', {}, { timeout: 3000 });
    expect(stamp).toHaveTextContent(SAVED_AT);
    expect(stamp).toHaveTextContent(/\d{1,2}:\d{2}/);
    await waitFor(() => expect(save).toBeEnabled());
    const firstStamp = stamp.textContent;

    // Run-backup takes the same two states with its own 1200ms timer.
    await user.click(screen.getByTestId('admin-config-section-backup'));
    const run = await screen.findByTestId('admin-config-run-backup');
    await user.click(run);
    expect(run).toBeDisabled();
    await waitFor(() => expect(run).toBeEnabled(), { timeout: 3000 });
    await waitFor(
      () => expect(screen.getByTestId('admin-config-saved-at').textContent).not.toBe(firstStamp),
      { timeout: 3000 }
    );

    // THE contract: the page reached no HTTP surface whatsoever. Every field
    // is a useState, and Save only stamps a clock reading.
    for (const m of ['get', 'post', 'patch', 'delete', 'put'] as const) {
      expect(vi.mocked(apiClient[m])).not.toHaveBeenCalled();
    }

    // A remount proves the values are React-local: the edited fields and the
    // savedAt stamp are both gone.
    await user.click(screen.getByTestId('admin-config-section-general'));
    await fill(user, screen.getByTestId('admin-config-platform-name'), 'IOES Exam Cloud');
    expect(screen.getByTestId('admin-config-platform-name')).toHaveValue('IOES Exam Cloud');
    first.unmount();

    renderPage();
    expect(screen.getByTestId('admin-config-platform-name')).toHaveValue('IOES Platform');
    expect(screen.queryByTestId('admin-config-saved-at')).not.toBeInTheDocument();
    for (const m of ['get', 'post', 'patch', 'delete', 'put'] as const) {
      expect(vi.mocked(apiClient[m])).not.toHaveBeenCalled();
    }
  });
});
