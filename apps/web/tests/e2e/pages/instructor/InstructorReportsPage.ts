/**
 * Wave 3A — E2E Page Object: InstructorReportsPage (`/instructor/reports`).
 *
 * Wraps everything tests/e2e/reports.instructor.spec.ts needs. ReportsPage is
 * a pure `ComingSoon` wrapper, so this object asserts the same structural
 * selectors that tests/e2e/pages/student/CertificatesPage.ts uses for the student
 * equivalent: the ComingSoon heading, the "coming soon" badge and the
 * missing-items list.
 *
 * `data-testid="coming-soon-title"` already exists in
 * src/components/common/ComingSoon.tsx — it is NOT re-added here.
 * The page-level wrapper testid lives at src/pages/instructor/ReportsPage.tsx:19.
 *
 * Selectors are data-testid first; i18n'd labels use bilingual regexes
 * because the app renders Vietnamese by default.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class InstructorReportsPage {
  readonly page: Page;

  /** The InstructorLayout header <h1>: "Báo cáo" / "Reports". */
  readonly heading: Locator;
  /** The page-level wrapper around the ComingSoon block (ReportsPage.tsx:19). */
  readonly block: Locator;
  /** ComingSoon's own <h1>, supplied by src/components/common/ComingSoon.tsx. */
  readonly comingSoonTitle: Locator;
  /** ComingSoon's description paragraph, the sibling right after the title. */
  readonly description: Locator;
  /** ComingSoon's "coming soon" badge pill. */
  readonly badge: Locator;
  /** The "what is missing" heading. */
  readonly missingHeading: Locator;
  /** Every bullet in the missing-items list. */
  readonly missingItems: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', {
      level: 1,
      name: /^Báo cáo$|^Reports$/i,
    });
    this.block = page.getByTestId('instructor-reports-coming-soon');
    this.comingSoonTitle = page.getByTestId('coming-soon-title');
    this.description = page.locator('[data-testid="coming-soon-title"] + p');
    this.badge = page.getByText(/Sắp phát triển|Coming soon/i);
    this.missingHeading = page.getByText(/^Còn thiếu$|^What is missing$/i);
    this.missingItems = page.locator('[data-testid="instructor-reports-coming-soon"] ul > li');
  }

  async goto(): Promise<void> {
    await this.page.goto('/instructor/reports');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async expectComingSoon(): Promise<void> {
    await expect(this.block).toBeVisible();
    await expect(this.comingSoonTitle).toHaveText(/Báo cáo giảng dạy|Teaching reports/i);
    await expect(this.badge).toBeVisible();
  }

  async expectMissingItems(): Promise<void> {
    // The ComingSoon must list at least one missing prerequisite. Asserted by
    // count rather than by indexing a specific bullet.
    await expect(this.missingHeading).toBeVisible();
    expect(await this.missingItems.count()).toBeGreaterThan(0);
  }
}
