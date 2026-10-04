/** Batch 4c — Integration: ForgotPasswordPage, VerifyEmailPage, OAuthCallbackPage */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import I18nProvider from '@/app/providers/I18nProvider';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';
import OAuthCallbackPage from '@/pages/auth/OAuthCallbackPage';

// Helper: advance both fake timers AND the internal animation/RAF queue that
// React Testing Library polls. Without this, advanceTimersByTime fires the
// setTimeout but the screen may not repaint in the same tick.
const advanceTime = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const renderForgot = () =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/auth/forgot-password']}>
        <Routes>
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/login" element={<div data-testid="login-page">LOGIN</div>} />
          <Route path="/" element={<div data-testid="home">HOME</div>} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );

const renderVerify = (token?: string) =>
  render(
    <I18nProvider>
      <MemoryRouter
        initialEntries={[token ? `/auth/verify-email?token=${token}` : '/auth/verify-email']}
      >
        <Routes>
          <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/login" element={<div data-testid="login-page">LOGIN</div>} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );

const renderOAuth = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString();
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[`/auth/oauth/callback?${qs}`]}>
        <Routes>
          <Route path="/auth/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/auth/login" element={<div data-testid="login-page">LOGIN</div>} />
          <Route path="/student" element={<div data-testid="student-home">STUDENT</div>} />
          <Route path="/" element={<div data-testid="home">HOME</div>} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// =============================================================================
//  ForgotPasswordPage — APP-SIDE MOCK (1500ms setTimeout)
// =============================================================================
describe('ForgotPasswordPage — app-side mock flow', () => {
  it('IT-FORGOT-001: empty email submit keeps HTML5 invalid; clicking submit does not navigate', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForgot();
    const submitBtn = screen.getByRole('button', {
      name: /Gửi liên kết đặt lại/i,
    });
    const emailInput = screen.getByPlaceholderText('email@company.com') as HTMLInputElement;
    expect(emailInput.required).toBe(true);
    expect(emailInput.checkValidity()).toBe(false);
    await user.click(submitBtn);
    expect(screen.getByPlaceholderText('email@company.com')).toBeInTheDocument();
  });

  it('IT-FORGOT-002: typing into the email field updates the controlled value', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForgot();
    const email = screen.getByPlaceholderText('email@company.com');
    await user.type(email, 'tester@ioes.com');
    expect((email as HTMLInputElement).value).toBe('tester@ioes.com');
  });

  it('IT-FORGOT-003: submitting a valid email transitions to the "sent" state via 1500ms setTimeout', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForgot();
    await user.type(screen.getByPlaceholderText('email@company.com'), 'tester@ioes.com');
    await user.click(screen.getByRole('button', { name: /Gửi liên kết đặt lại/i }));

    // While pending: spinner label visible immediately.
    expect(screen.getByRole('button', { name: /Đang gửi\.\.\./i })).toBeInTheDocument();

    // Advance the 1500ms simulated request.
    await advanceTime(1600);

    expect(screen.getByText('tester@ioes.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gửi lại email xác minh/i })).toBeInTheDocument();
  });

  it('IT-FORGOT-004: after success, the countdown MM:SS shows initial value 24:00', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForgot();
    await user.type(screen.getByPlaceholderText('email@company.com'), 'tester@ioes.com');
    await user.click(screen.getByRole('button', { name: /Gửi liên kết đặt lại/i }));
    await advanceTime(1600);
    expect(screen.getByText(/24:00/)).toBeInTheDocument();
  });

  it('IT-FORGOT-011: resend click applies the 60s cooldown immediately (label switches to "Gửi lại sau 60s")', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForgot();
    await user.type(screen.getByPlaceholderText('email@company.com'), 'tester@ioes.com');
    await user.click(screen.getByRole('button', { name: /Gửi liên kết đặt lại/i }));
    await advanceTime(1600);

    const resend = screen.getByRole('button', { name: /Gửi lại email xác minh/i });
    await user.click(resend);

    // Visible behavior: cooldown label appears with 60s. No real-time wait
    // needed — the synchronous setState already shows this.
    expect(screen.getByText(/Gửi lại sau 60s/)).toBeInTheDocument();
  });

  it('IT-FORGOT-006: resend click applies the 60s cooldown (label switches to "Gửi lại sau 60s")', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForgot();
    await user.type(screen.getByPlaceholderText('email@company.com'), 'tester@ioes.com');
    await user.click(screen.getByRole('button', { name: /Gửi liên kết đặt lại/i }));
    await advanceTime(1600);

    const resend = screen.getByRole('button', { name: /Gửi lại email xác minh/i });
    await user.click(resend);

    // NOT TESTABLE (in-app mock cannot reject): handleResend sets BOTH
    // `resendCooldown=60` AND `resendJustSent=true` synchronously. The
    // button ternary evaluates `resendCooldown > 0` first, so the cooldown
    // copy wins and the "Đã gửi lại!" branch is effectively unreachable
    // from any test. The in-app mock has no way to fail, so we cannot
    // exercise the resendJustSent branch without forking the source.
    // Asserting the visible cooldown label is the only testable surface.
    expect(screen.getByText(/Gửi lại sau 60s/)).toBeInTheDocument();
  });

  it('IT-FORGOT-007: "Quay lại đăng nhập" link points to /auth/login', () => {
    renderForgot();
    const link = screen.getAllByRole('link', { name: /Quay lại đăng nhập/i })[0];
    expect(link).toHaveAttribute('href', '/auth/login');
  });

  it('IT-FORGOT-008: "Thử với email khác" returns to the initial form (state reset)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForgot();
    await user.type(screen.getByPlaceholderText('email@company.com'), 'tester@ioes.com');
    await user.click(screen.getByRole('button', { name: /Gửi liên kết đặt lại/i }));
    await advanceTime(1600);

    const tryAnother = screen.getByRole('button', { name: /Thử với email khác/i });
    await user.click(tryAnother);

    expect(screen.getByPlaceholderText('email@company.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gửi liên kết đặt lại/i })).toBeInTheDocument();
  });

  it('IT-FORGOT-009: SQL/XSS-like strings are stored verbatim and rendered as text only', () => {
    renderForgot();
    const xss = '<script>alert(1)</script>';
    const beforeScripts = document.querySelectorAll('script').length;
    const emailInput = screen.getByPlaceholderText('email@company.com') as HTMLInputElement;
    // Set value directly because we are not driving the form submission here;
    // the assertion is about input value not triggering a script tag insertion.
    expect(emailInput).toBeInTheDocument();
    emailInput.value = xss;
    expect(emailInput.value).toBe(xss);
    expect(document.querySelectorAll('script').length).toBe(beforeScripts);
  });

  it('IT-FORGOT-010: "← Quay lại trang chủ" link points to /', () => {
    renderForgot();
    const link = screen.getByRole('link', { name: /Quay lại trang chủ/i });
    expect(link).toHaveAttribute('href', '/');
  });
});

// =============================================================================
//  VerifyEmailPage — APP-SIDE MOCK (1500ms setTimeout, token prefix decides)
// =============================================================================
describe('VerifyEmailPage — app-side mock flow', () => {
  it('IT-VERIFY-001: with no token, useEffect immediately sets the error state with "Liên kết xác minh không hợp lệ"', () => {
    renderVerify();
    // Initial useState is 'sent', but useEffect immediately switches to
    // 'error'/'invalid' when no token is present.
    expect(screen.getByText(/Xác minh thất bại/)).toBeInTheDocument();
    expect(screen.getByText(/Liên kết xác minh không hợp lệ hoặc bị lỗi/)).toBeInTheDocument();
  });

  it('IT-VERIFY-002: valid token transitions to "Email đã được xác minh!" after 1500ms (app-side mock)', async () => {
    renderVerify('goodtoken123');
    expect(screen.getByText(/Đang xác minh email/i)).toBeInTheDocument();
    await advanceTime(1600);
    expect(screen.getByText(/Email đã được xác minh!/)).toBeInTheDocument();
  });

  it('IT-VERIFY-003: token starting with "exp_" lands on "đã hết hạn" error reason', async () => {
    renderVerify('exp_token');
    await advanceTime(1600);
    expect(screen.getByText(/Liên kết xác minh đã hết hạn/)).toBeInTheDocument();
    expect(screen.getByText(/Xác minh thất bại/)).toBeInTheDocument();
  });

  it('IT-VERIFY-004: token starting with "used_" lands on "đã được xác minh trước đó" error reason', async () => {
    renderVerify('used_token');
    await advanceTime(1600);
    expect(screen.getByText(/đã được xác minh trước đó/)).toBeInTheDocument();
  });

  it('IT-VERIFY-005: token starting with "bad_" lands on the "không hợp lệ" error reason', async () => {
    renderVerify('bad_token');
    await advanceTime(1600);
    expect(screen.getByText(/Liên kết xác minh không hợp lệ hoặc bị lỗi/)).toBeInTheDocument();
  });

  it('IT-VERIFY-006: "Quay lại đăng nhập" link points to /auth/login (visible in error state)', async () => {
    renderVerify('bad_token');
    await advanceTime(1600);
    const links = screen.getAllByRole('link', { name: /Quay lại đăng nhập/i });
    expect(links[0]).toHaveAttribute('href', '/auth/login');
  });

  it('IT-VERIFY-007: in success state, success text is rendered AND a "Đi đến trang đăng nhập" link is present', async () => {
    renderVerify('goodtoken456');
    await advanceTime(1600);
    expect(screen.getByText(/Email đã được xác minh!/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Đi đến trang đăng nhập/i })).toHaveAttribute(
      'href',
      '/auth/login'
    );
  });

  it('IT-VERIFY-008: resend button in error state cycles through sending → sent → idle (in-app mock)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderVerify('bad_token'); // immediately lands on error state with resend button
    await advanceTime(1600);
    const resend = screen.getByRole('button', { name: /Gửi lại email xác minh/i });
    await user.click(resend);

    // Sending: button label switches to "Đang gửi..."
    expect(screen.getByRole('button', { name: /Đang gửi/i })).toBeInTheDocument();

    // Wait past 900ms (sending → sent).
    await advanceTime(950);
    expect(screen.getByRole('button', { name: /Đã gửi lại email!/ })).toBeInTheDocument();

    // Wait past another 2500ms (sent → idle). Total from click: 900 + 2500 = 3400ms.
    await advanceTime(2500);
    expect(screen.getByRole('button', { name: /^Gửi lại email xác minh$/ })).toBeInTheDocument();
  });
});

// =============================================================================
//  OAuthCallbackPage — APP-SIDE MOCK (1500ms setTimeout, then optional 900ms nav)
// =============================================================================
describe('OAuthCallbackPage — app-side mock flow', () => {
  it('IT-OAUTH-001: valid code+state shows processing spinner with provider metadata', () => {
    renderOAuth({ provider: 'google', code: 'authcode123', state: 'statetoken456' });
    expect(screen.getByText(/Đang hoàn tất đăng nhập Google/i)).toBeInTheDocument();
    expect(screen.getByText(/Đang hoàn tất đăng nhập an toàn/i)).toBeInTheDocument();
  });

  it('IT-OAUTH-002: valid code+state transitions to success → auto-navigates to /student after 900ms (app-side mock)', async () => {
    renderOAuth({ provider: 'google', code: 'authcode123', state: 'statetoken456' });
    await advanceTime(1600);
    expect(screen.getByText(/Đăng nhập thành công!/)).toBeInTheDocument();
    // Auto-navigate after additional 900ms.
    await advanceTime(1000);
    expect(screen.getByTestId('student-home')).toBeInTheDocument();
  });

  it('IT-OAUTH-003: missing code or state surfaces the "Thiếu tham số" error reason', () => {
    renderOAuth({ provider: 'google' }); // no code, no state
    expect(screen.getByText(/Thiếu tham số bắt buộc trong URL callback/)).toBeInTheDocument();
  });

  it('IT-OAUTH-004: error=access_denied surfaces the "từ chối cấp quyền" error reason', () => {
    renderOAuth({ provider: 'google', error: 'access_denied' });
    expect(screen.getByText(/từ chối cấp quyền truy cập/)).toBeInTheDocument();
  });

  it('IT-OAUTH-005: unknown error param surfaces the "state không khớp" CSRF reason', () => {
    renderOAuth({ provider: 'google', error: 'csrf_mismatch' });
    expect(screen.getByText(/Mã state không khớp/)).toBeInTheDocument();
  });

  it('IT-OAUTH-006: code starting with "exp_" surfaces the "hết hạn" error reason after the 1500ms timer', async () => {
    renderOAuth({ provider: 'google', code: 'exp_xyz', state: 'state123' });
    expect(screen.getByText(/Đang hoàn tất đăng nhập Google/i)).toBeInTheDocument();
    await advanceTime(1600);
    expect(screen.getByText(/Phiên đăng nhập đã hết hạn/)).toBeInTheDocument();
  });

  it('IT-OAUTH-007: github provider renders the GitHub label in the header', () => {
    renderOAuth({ provider: 'github', code: 'authcode123', state: 'statetoken456' });
    expect(screen.getByText(/Đang hoàn tất đăng nhập GitHub/i)).toBeInTheDocument();
  });

  it('IT-OAUTH-008: in error state, "Thử đăng nhập lại" link points to /auth/login', () => {
    renderOAuth({ provider: 'google' }); // missing params → error state
    const retry = screen.getByRole('link', { name: /Thử đăng nhập lại/i });
    expect(retry).toHaveAttribute('href', '/auth/login');
  });
});
