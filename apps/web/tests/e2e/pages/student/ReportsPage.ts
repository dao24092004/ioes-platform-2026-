/**
 * Wave 2C — E2E Page Object: ReportsPage (student)
 *
 * Wraps all reports-page interactions used by
 * `tests/e2e/reports.student.spec.ts`. The page issues three GETs
 * (`/api/v1/courses/enrollments/me`, `/api/attempts`,
 * `/api/analytics/users/:id`) and renders four stat cards, a course-
 * progress list, an exam-scores chart, and three recent cards. We rely
 * on data-testid attributes added to the page source for stable
 * selectors:
 *   - reports-stat-enrolled / reports-stat-completed
 *   - reports-stat-avg-score / reports-stat-pass-rate
 *   - reports-course-row            (per-enrollment row)
 *   - reports-recent-course-card    (latest-course card)
 *
 * data-testid file:line (src/pages/student/ReportsPage.tsx):
 *   - line 118: reports-stat-enrolled
 *   - line 126: reports-stat-completed
 *   - line 134: reports-stat-avg-score
 *   - line 142: reports-stat-pass-rate
 *   - line 177: reports-course-row
 *   - line 280: reports-recent-course-card wrapper
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class ReportsPage {
  readonly page: Page;

  readonly statEnrolled: Locator;
  readonly statCompleted: Locator;
  readonly statAvgScore: Locator;
  readonly statPassRate: Locator;
  readonly courseRows: Locator;
  readonly recentCourseCard: Locator;

  constructor(page: Page) {
    this.page = page;

    this.statEnrolled = page.getByTestId('reports-stat-enrolled');
    this.statCompleted = page.getByTestId('reports-stat-completed');
    this.statAvgScore = page.getByTestId('reports-stat-avg-score');
    this.statPassRate = page.getByTestId('reports-stat-pass-rate');
    this.courseRows = page.getByTestId('reports-course-row');
    this.recentCourseCard = page.getByTestId('reports-recent-course-card');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student/reports');
  }

  async expectStatCards(): Promise<void> {
    await expect(this.statEnrolled).toBeVisible();
    await expect(this.statCompleted).toBeVisible();
    await expect(this.statAvgScore).toBeVisible();
    await expect(this.statPassRate).toBeVisible();
  }

  async expectStatEnrolledText(text: string | RegExp): Promise<void> {
    await expect(this.statEnrolled).toContainText(text);
  }

  async expectCourseRowCount(count: number): Promise<void> {
    await expect(this.courseRows).toHaveCount(count);
  }

  async expectRecentCourseVisible(): Promise<void> {
    await expect(this.recentCourseCard).toBeVisible();
  }
}
