// apps/web/tests/e2e/pages/public/TenantsPage.ts
// Page Object for tenant pages: /tenants, /tenants/:tenantId, /tenant/:tenantId.
// All locators live here — spec files must not embed raw selectors.
// Web-first assertions used throughout; no waitForTimeout.
import { type Page, expect } from '@playwright/test';

export class TenantsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /**
   * Navigate to the public tenants list page.
   * Waits for the ComingSoon badge to be visible as a signal that the page
   * has rendered its content.
   */
  async gotoTenantsList(): Promise<void> {
    await this.page.goto('/tenants');
    await this.expectComingSoon();
  }

  /**
   * Navigate to a tenant detail page by id.
   * Any string is accepted — the page has no URL validation.
   */
  async gotoTenantDetail(id: string): Promise<void> {
    await this.page.goto(`/tenants/${id}`);
    await this.expectTenantDetailComingSoon();
  }

  /**
   * Navigate to an organization page by tenant id.
   * When unauthenticated this will redirect to /auth/login.
   * When authenticated it will render ComingSoon.
   */
  async gotoOrganization(id: string): Promise<void> {
    await this.page.goto(`/tenant/${id}`);
    // No automatic wait here — caller decides based on auth state.
  }

  // ---------------------------------------------------------------------------
  // Assertions
  // ---------------------------------------------------------------------------

  /**
   * Assert the ComingSoon component is visible on TenantsPage.
   * Uses the h1 heading to avoid strict mode violation (the title text also
   * appears in the description paragraph).
   */
  async expectComingSoon(): Promise<void> {
    // The ComingSoon badge text: "Sắp phát triển" in vi, "Coming soon" in en.
    await expect(this.page.getByText(/Sắp phát triển|coming soon/i)).toBeVisible();
    // Use the locale-agnostic data-testid to target the heading without
    // matching the description paragraph that also contains the title text.
    await expect(this.page.getByTestId('coming-soon-title')).toBeVisible();
  }

  /**
   * Assert ComingSoon is visible on TenantDetailPage.
   * TenantDetailPage uses a different i18n key (examApi.comingSoon.tenantDetail.title)
   * which falls back to the raw key in the dev build. The locale-agnostic
   * testid on the h1 is the only stable selector.
   */
  async expectTenantDetailComingSoon(): Promise<void> {
    await expect(this.page.getByText(/Sắp phát triển|coming soon/i)).toBeVisible();
    await expect(this.page.getByTestId('coming-soon-title')).toBeVisible();
  }

  /**
   * Assert the browser was redirected to /auth/login (the ProtectedRoute effect).
   * Call this after gotoOrganization() when testing unauthenticated access.
   */
  async expectLoginRedirect(): Promise<void> {
    await expect(this.page).toHaveURL(/\/auth\/login/);
    // The login form email input is a reliable indicator of the login page.
    await expect(this.page.getByTestId('auth-email')).toBeVisible();
  }
}
