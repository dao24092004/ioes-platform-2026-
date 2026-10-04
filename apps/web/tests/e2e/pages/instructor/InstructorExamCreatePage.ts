/**
 * Wave 3C — E2E Page Object: InstructorExamCreatePage (/instructor/exams/create)
 *
 * The route renders `ComingSoon` inside `InstructorLayout` — exam-suite has no
 * `POST /exams`, so there is no form to drive. Modelled on
 * `tests/e2e/pages/student/CertificatesPage.ts`; the ComingSoon testids are owned by
 * `src/components/common/ComingSoon.tsx` and were not re-added here.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class InstructorExamCreatePage {
  readonly page: Page;

  readonly title: Locator;
  readonly description: Locator;
  readonly badge: Locator;
  readonly missingHeading: Locator;
  readonly missingItems: Locator;

  constructor(page: Page) {
    this.page = page;

    this.title = page.getByTestId('coming-soon-title');
    // The description is the paragraph immediately after the ComingSoon h1.
    this.description = page.locator('[data-testid="coming-soon-title"] + p');
    // Badge i18n: "Sắp phát triển" (vi) / "Coming soon" (en).
    this.badge = page.getByText(/sắp phát triển|coming soon/i).first();
    // Missing-items heading i18n: "Còn thiếu" (vi) / "What is missing" (en).
    this.missingHeading = page.getByText(/còn thiếu|what is missing/i);
    // Scope the list to the ComingSoon card — the InstructorLayout sidebar
    // also renders <ul><li> inside a `bg-slate-50` block.
    this.missingItems = page.locator('div:has(> [data-testid="coming-soon-title"]) ul > li');
  }

  async goto(): Promise<void> {
    await this.page.goto('/instructor/exams/create');
    await expect(this.title).toBeVisible();
  }

  async expectComingSoon(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.description).toBeVisible();
    await expect(this.badge).toBeVisible();
  }

  async expectMissingItems(count: number): Promise<void> {
    await expect(this.missingHeading).toBeVisible();
    await expect(this.missingItems).toHaveCount(count);
  }
}
