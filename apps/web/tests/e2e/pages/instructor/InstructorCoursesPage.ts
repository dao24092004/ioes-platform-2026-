/**
 * Wave 3B — E2E Page Object: InstructorCoursesPage (/instructor/courses)
 *
 * Wraps the affordances used by tests/e2e/courses.instructor.spec.ts.
 * The page issues two content-service reads on mount:
 *   - GET /api/v1/courses?mine=true&per_page=100
 *   - GET /api/v1/categories
 * Both return BARE payloads (no ApiEnvelope) — see the header comment of
 * src/services/api/content.api.ts — so the spec fulfills them bare too.
 *
 * Selector strategy: data-testid first. Where a visible label is itself the
 * thing under test, a bilingual regex is used, because I18nProvider defaults
 * to vi (localStorage.i18nextLng) and the app therefore renders Vietnamese.
 *
 * data-testid file:line (src/pages/instructor/CoursesPage.tsx):
 *   - line  92: instructor-courses-create-link
 *   - line 103: instructor-courses-stats
 *   - line 110: instructor-courses-list
 *   - line 116: instructor-courses-filter          (carries data-status)
 *   - line 133: instructor-courses-search
 *   - line 145: instructor-courses-sort
 *   - line 158: instructor-courses-loading
 *   - line 162: instructor-courses-error
 *   - line 164: instructor-courses-empty
 *   - line 171: instructor-courses-empty-create-link
 *   - line 184: instructor-course-row              (repeated per course)
 *   - line 225: instructor-courses-edit-link       (repeated per course)
 */
import { type Page, type Locator, expect } from '@playwright/test';

/** Bilingual labels: the app renders Vietnamese unless localStorage says otherwise. */
export const COURSES_COPY = {
  heading: /Khóa học của tôi|My Courses/i,
  createNew: /Tạo khóa học|Create course/i,
  edit: /^Sửa$|^Edit$/i,
  filterAll: /^Tất cả$|^All$/i,
  uncategorized: /Chưa phân loại|Uncategorized/i,
  notSubmitted: /Chưa gửi duyệt|Not submitted/i,
} as const;

export class InstructorCoursesPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly createLink: Locator;
  readonly stats: Locator;
  readonly list: Locator;
  readonly search: Locator;
  readonly sort: Locator;
  readonly rows: Locator;
  readonly editLinks: Locator;

  constructor(page: Page) {
    this.page = page;

    // Scoped by accessible name, not by level: the global LoadingScreen
    // overlay (src/components/common/LoadingScreen.tsx:356) also renders an
    // <h1>IOES</h1>, so `getByRole('heading', { level: 1 })` is ambiguous.
    this.heading = page.getByRole('heading', { name: COURSES_COPY.heading });
    this.createLink = page.getByTestId('instructor-courses-create-link');
    this.stats = page.getByTestId('instructor-courses-stats');
    this.list = page.getByTestId('instructor-courses-list');
    this.search = page.getByTestId('instructor-courses-search');
    this.sort = page.getByTestId('instructor-courses-sort');
    this.rows = page.getByTestId('instructor-course-row');
    this.editLinks = page.getByTestId('instructor-courses-edit-link');
  }

  /** The status filter button carrying a given data-status. */
  filter(status: 'all' | 'published' | 'draft' | 'archived'): Locator {
    return this.page.locator(
      '[data-testid="instructor-courses-filter"][data-status="' + status + '"]'
    );
  }

  async goto(): Promise<void> {
    await this.page.goto('/instructor/courses');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.list).toBeVisible();
  }

  async expectRowCount(count: number): Promise<void> {
    await expect(this.rows).toHaveCount(count);
  }

  /** Loading and error placeholders must both be gone once rows have rendered. */
  async expectNoPlaceholderLeft(): Promise<void> {
    await expect(this.page.getByTestId('instructor-courses-loading')).toHaveCount(0);
    await expect(this.page.getByTestId('instructor-courses-error')).toHaveCount(0);
  }

  async createLinkHref(): Promise<string | null> {
    return this.createLink.getAttribute('href');
  }

  async firstRowText(): Promise<string> {
    return (await this.rows.first().innerText()).replace(/\s+/g, ' ').trim();
  }

  async firstEditLinkHref(): Promise<string | null> {
    return this.editLinks.first().getAttribute('href');
  }

  async clickFirstEditLink(): Promise<void> {
    await this.editLinks.first().click();
  }
}
