// apps/web/tests/e2e/pages/public/CheckoutVerifyPage.ts
// Page Object for the public Checkout (/checkout/:slug) and
// VerifyCertificate (/verify/:certId) pages. Both render the shared
// ComingSoon component with translated title/description/missing list.
//
// These pages have no interactive controls — they are pure "Coming Soon"
// state pages. The Page Object therefore provides navigation helpers and
// a single assertion for the ComingSoon title.
//
// Locator strategy (web-first, no waitForTimeout):
//   - ComingSoon renders an h1 for the title — queried by role heading.
//   - The badge "Coming soon" / "Sắp phát triển" — queried by text.
//   - Header: nav element with role="navigation", with Login/Register links.
//   - Footer: contentinfo role.
//
// No data-testid is required on these static pages — the ComingSoon h1
// and the nav are stable, semantic HTML.
//
// E2E test file: checkout-verify.spec.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class CheckoutVerifyPage {
  readonly page: Page;

  // --- Checkout page -------------------------------------------------------
  readonly checkoutTitle: Locator;
  readonly checkoutDescription: Locator;
  readonly checkoutBadge: Locator;
  readonly checkoutMissingHeading: Locator;
  readonly checkoutNoFakeData: Locator;

  // --- Verify Certificate page --------------------------------------------
  readonly verifyTitle: Locator;
  readonly verifyDescription: Locator;
  readonly verifyBadge: Locator;
  readonly verifyMissingHeading: Locator;
  readonly verifyNoFakeData: Locator;

  // --- Shared layout ------------------------------------------------------
  readonly headerNav: Locator;
  readonly headerLogin: Locator;
  readonly headerRegister: Locator;
  readonly footer: Locator;

  // --- ComingSoon (shared, used by both pages) ----------------------------
  readonly comingSoonCard: Locator;

  constructor(page: Page) {
    this.page = page;

    // Checkout page — ComingSoon rendered via t('comingSoon.checkout.*')
    // heading: <h1 className="mt-5 text-2xl ...">{title}</h1>
    this.checkoutTitle = page.getByRole('heading', { name: /Checkout|Thanh toán/i });
    this.checkoutDescription = page.getByText(/Buy courses|quản lý hóa đơn|mua khóa học/i);
    // Badge: "Sắp phát triển" (vi) / "Coming soon" (en) inside a span.
    this.checkoutBadge = page.getByText(/Coming soon|Sắp phát triển/i);
    this.checkoutMissingHeading = page.getByText(/Còn thiếu|What is missing/i);
    this.checkoutNoFakeData = page.getByText(/no sample data|không hiển thị dữ liệu mẫu/i);

    // Verify Certificate page — ComingSoon via t('comingSoon.blockchain.*')
    this.verifyTitle = page.getByRole('heading', {
      name: /Blockchain certificates|Chứng chỉ blockchain/i,
    });
    this.verifyDescription = page.getByText(/Issue certificates|NFT|blockchain/i);
    this.verifyBadge = page.getByText(/Coming soon|Sắp phát triển/i);
    this.verifyMissingHeading = page.getByText(/Còn thiếu|What is missing/i);
    this.verifyNoFakeData = page.getByText(/no sample data|không hiển thị dữ liệu mẫu/i);

    // Layout elements
    // Header renders a <nav role="navigation"> — shared across public pages.
    this.headerNav = page.getByRole('navigation');
    // With no session (chromium project = anonymous), header shows Login / Register.
    this.headerLogin = page.getByRole('link', { name: /Đăng nhập|^Login$/i });
    this.headerRegister = page.getByRole('link', { name: /Đăng ký|^Register$/i });
    this.footer = page.getByRole('contentinfo');

    // The white card wrapping ComingSoon content.
    // comingSoonCard = <div className="w-full max-w-xl rounded-2xl ...">
    this.comingSoonCard = page.locator('div.min-h-\\[60vh\\]').first();
  }

  // ----------------------------------------------------------------------
  // Navigation helpers
  // ----------------------------------------------------------------------
  /**
   * Navigate to /checkout/:slug.
   * Uses goto (full navigation) since these are public, no-auth pages.
   */
  async goto(slug: string): Promise<void> {
    await this.page.goto(`/checkout/${slug}`);
  }

  /**
   * Navigate to /verify/:certId.
   */
  async gotoVerify(certId: string): Promise<void> {
    await this.page.goto(`/verify/${certId}`);
  }

  // ----------------------------------------------------------------------
  // Assertions
  // ----------------------------------------------------------------------
  /**
   * Assert that the ComingSoon card is visible.
   * Accepts an optional visibleTitle regex to verify the specific title text.
   * Usage:
   *   await checkoutVerifyPage.expectComingSoon();          // just visible
   *   await checkoutVerifyPage.expectComingSoon(/Checkout/i); // with title check
   */
  async expectComingSoon(visibleTitle?: RegExp): Promise<void> {
    await expect(this.comingSoonCard).toBeVisible();
    if (visibleTitle) {
      await expect(this.page.getByRole('heading', { name: visibleTitle })).toBeVisible();
    }
  }

  /**
   * Assert that the checkout ComingSoon title is visible.
   */
  async expectCheckoutTitle(): Promise<void> {
    await expect(this.checkoutTitle).toBeVisible();
  }

  /**
   * Assert that the verify ComingSoon title is visible.
   */
  async expectVerifyTitle(): Promise<void> {
    await expect(this.verifyTitle).toBeVisible();
  }

  /**
   * Assert Header is visible with auth links.
   */
  async expectHeader(): Promise<void> {
    await expect(this.headerNav).toBeVisible();
    await expect(this.headerLogin).toBeVisible();
    await expect(this.headerRegister).toBeVisible();
  }

  /**
   * Assert Footer is visible.
   */
  async expectFooter(): Promise<void> {
    await expect(this.footer).toBeVisible();
  }
}
