// apps/web/tests/e2e/pages/auth/OAuthCallbackPage.ts
// Page Object for /auth/oauth/callback. The page is a stub that simulates
// provider callbacks without a real OAuth provider — query params
// determine the state:
//
//   ?code=&state=                → processing → success → navigate('/student')
//   ?code=exp_*&state=           → processing → error (expired)
//   (no code, no state)           → error (missing_params) — immediate
//   ?error=access_denied         → error (denied) — immediate
//   ?error=invalid_state_token   → error (invalid_state) — immediate
//
// Provider icon/label render based on `?provider=` (defaults to google).
//
// Note: the success → /student path redirects to /auth/login via
// ProtectedRoute when unauthenticated — both are accepted in test
// assertions that look at the final URL.
import { type Page, type Locator } from '@playwright/test';

export class OAuthCallbackPage {
  readonly page: Page;
  /** Title (h1.text-xl.font-bold) contains the provider name (Google / GitHub / Microsoft). */
  readonly title: Locator;
  /** Spinner shown while cbState === 'processing'. */
  readonly spinner: Locator;
  /** Success state: green check icon + "Redirecting" text. */
  readonly successIcon: Locator;
  /** Error state: red X icon + reason message. */
  readonly errorIcon: Locator;
  /** Retry / Go-home buttons shown in the error state. */
  readonly retryLoginLink: Locator;
  readonly goHomeLink: Locator;
  /** Debug block showing provider, code (first 8 chars), state token. */
  readonly debugCodeRow: Locator;

  constructor(page: Page) {
    this.page = page;
    // Source renders the h1 with `text-xl font-bold ...` — match by class
    // to avoid pulling in any unrelated <h1> (e.g. AuthLayout's branding
    // h1 reachable when the page has bounced to /auth/login via the
    // success → /student → ProtectedRoute → /auth/login chain).
    this.title = page.locator('h1.text-xl.font-bold').first();
    // Spinner: any element with class animate-spin (border-t-transparent).
    this.spinner = page.locator('.animate-spin').first();
    // The success view renders a single SVG <path d="M20 6L9 17l-5-5"> (check).
    this.successIcon = page.locator('svg path[d^="M20 6L9 17l-5-5"]').first();
    // Error view renders <line> elements for the X icon.
    this.errorIcon = page.locator('svg line').first();
    this.retryLoginLink = page.getByRole('link', {
      name: /(đăng nhập lại|retry ?login|back to login)/i,
    });
    this.goHomeLink = page.getByRole('link', { name: /(về trang chủ|go ?home|trang chủ)/i });
    // Debug row: a font-mono span containing the truncated code. The error
    // view shows the un-truncated code; the processing view shows truncated.
    this.debugCodeRow = page.locator('.font-mono').first();
  }

  /** Visit the callback URL with explicit query params. */
  async gotoWithParams(params: Record<string, string>): Promise<void> {
    const qs = new URLSearchParams(params).toString();
    // The router maps /auth/oauth/callback (slash) — NOT /auth/oauth-callback.
    await this.page.goto(`/auth/oauth/callback${qs ? `?${qs}` : ''}`);
  }
}
