/**
 * Wave 2A — E2E Page Object: CoursesPage (student)
 *
 * Wraps all course-list interactions used by
 * `tests/e2e/courses.student.spec.ts`. All selectors use data-testid
 * attributes that exist on the page source:
 *   - courses-search-link      → header "Search" link in StudentLayout actions
 *   - courses-search-input     → debounced search <input> in catalogue header
 *   - courses-card-link        → per-course "View detail" link in catalogue
 *
 * data-testid file:line (src/pages/student/CoursesPage.tsx):
 *   - line 60:  courses-search-link
 *   - line 78:  courses-search-input
 *   - line 122: courses-card-link
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class CoursesPage {
  readonly page: Page;

  readonly searchLink: Locator;
  readonly searchInput: Locator;
  readonly courseCardLinks: Locator;
  readonly firstCourseCardLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.searchLink = page.getByTestId('courses-search-link');
    this.searchInput = page.getByTestId('courses-search-input');
    this.courseCardLinks = page.getByTestId('courses-card-link');
    this.firstCourseCardLink = page.getByTestId('courses-card-link').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/courses');
  }

  async expectSearchLink(): Promise<void> {
    await expect(this.searchLink).toHaveAttribute('href', '/student/search');
  }

  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
  }

  async expectSearchInput(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
  }

  async expectCourseCardLink(courseId: string): Promise<void> {
    await expect(
      this.page
        .locator(`a[data-testid="courses-card-link"][href="/student/courses/${courseId}"]`)
        .first()
    ).toBeVisible();
  }

  async clickFirstCourseCard(): Promise<void> {
    await this.firstCourseCardLink.click();
  }

  async expectCourseCardCount(count: number): Promise<void> {
    await expect(this.courseCardLinks).toHaveCount(count);
  }

  async expectLoginRequired(): Promise<void> {
    await expect(this.page.locator('a[href="/auth/login"]').first()).toBeVisible();
  }
}
