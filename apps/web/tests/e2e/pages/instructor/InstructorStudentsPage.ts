/**
 * Wave 3A — E2E Page Object: InstructorStudentsPage (`/instructor/students`).
 *
 * Wraps everything tests/e2e/students.instructor.spec.ts needs. All raw
 * selectors live here; the spec embeds none.
 *
 * Selectors are data-testid first; i18n'd labels use bilingual regexes
 * because the app renders Vietnamese by default.
 *
 * data-testid file:line (src/pages/instructor/StudentsPage.tsx):
 *   - line 46: instructor-students-stats
 *   - line 59: instructor-students-course-filter
 *   - line 91: instructor-students-rows
 *   - line 93: instructor-students-row
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class InstructorStudentsPage {
  readonly page: Page;

  /** The InstructorLayout header <h1>: "Học viên" / "Students". */
  readonly heading: Locator;
  readonly stats: Locator;
  readonly courseFilter: Locator;
  readonly rows: Locator;
  readonly studentRows: Locator;
  /** Empty-state copy: "Chưa có học viên nào ghi danh." */
  readonly empty: Locator;
  /** Error-state copy. */
  readonly loadError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', {
      level: 1,
      name: /Học viên|Students/i,
    });
    this.stats = page.getByTestId('instructor-students-stats');
    this.courseFilter = page.getByTestId('instructor-students-course-filter');
    this.rows = page.getByTestId('instructor-students-rows');
    this.studentRows = page.getByTestId('instructor-students-row');
    this.empty = page.getByText(/Chưa có học viên nào ghi danh|No students have enrolled yet/i);
    this.loadError = page.getByText(/Không tải được dữ liệu|Could not load data/i);
  }

  async goto(): Promise<void> {
    await this.page.goto('/instructor/students');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async expectStatsVisible(): Promise<void> {
    await expect(this.stats).toBeVisible();
  }

  /**
   * The three stat cards render in the order total / completed / average.
   *
   * StudentsPage uses the shared `StatCard` (src/components/common/StatCard.tsx):
   * the card root is `div.rounded-2xl` and the value is `div.text-2xl.font-bold`,
   * with the label as its sibling. Scoping to the card that contains the label
   * avoids XPath / index selectors.
   */
  async readStatValues(): Promise<{ total: string; completed: string; avg: string }> {
    const read = async (label: RegExp): Promise<string> => {
      const card = this.stats.locator('div.rounded-2xl').filter({ hasText: label });
      return ((await card.locator('div.text-2xl.font-bold').textContent()) ?? '').trim();
    };
    return {
      total: await read(/Tổng học viên|Total students/i),
      completed: await read(/Đã hoàn thành|^Completed$/i),
      avg: await read(/Tiến độ trung bình|Average progress/i),
    };
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.empty).toBeVisible();
  }

  async expectCourseFilterOptions(): Promise<void> {
    // Addressed by accessible name rather than by index: the reset option is
    // the "all courses" entry.
    await expect(
      this.courseFilter.getByRole('option', { name: /Tất cả khoá học của tôi|All my courses/i })
    ).toHaveCount(1);
  }
}
