/**
 * Wave 2C — E2E Page Object: ReviewsPage (student)
 *
 * Wraps all reviews interactions used by
 * `tests/e2e/reviews.student.spec.ts`. ReviewsPage renders a `ComingSoon`
 * block (reviews feature not yet available) inside a `StudentLayout`.
 * Two routes share the same component:
 *   - /student/reviews            (list)
 *   - /student/reviews/:courseId  (per-course)
 *
 * Note: the i18n key `courseApi.comingSoon.reviews.title` is not yet
 * defined in the locale bundles, so the heading renders the raw key in
 * the dev build. Selectors below stay flexible by targeting the
 * ComingSoon structure (h1 + badge) rather than the title text.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class ReviewsPage {
  readonly page: Page;

  readonly pageHeading: Locator;
  readonly badge: Locator;
  readonly noFakeDataNotice: Locator;

  constructor(page: Page) {
    this.page = page;

    // ComingSoon renders its title in <h1> with data-testid="coming-soon-title".
    // This is locale-agnostic; the heading text differs between vi and en.
    this.pageHeading = page.getByTestId('coming-soon-title');
    // ComingSoon always renders a "Coming soon" badge pill.
    this.badge = page.getByText(/coming soon|sắp phát triển/i).first();
    // ComingSoon always ends with the "no fake data" notice.
    this.noFakeDataNotice = page.getByText(/no sample data|không hiển thị dữ liệu mẫu/i).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/reviews');
  }

  async gotoCourse(courseId: string): Promise<void> {
    await this.page.goto(`/student/reviews/${courseId}`);
  }

  async expectComingSoon(): Promise<void> {
    await expect(this.pageHeading).toBeVisible();
    await expect(this.badge).toBeVisible();
    await expect(this.noFakeDataNotice).toBeVisible();
  }
}
