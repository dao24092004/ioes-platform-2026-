/**
 * Wave 3A — E2E Page Object: InstructorDashboardPage (`/instructor`).
 *
 * Wraps everything tests/e2e/dashboard.instructor.spec.ts needs. All raw
 * selectors live here; the spec embeds none.
 *
 * Selectors are data-testid first. Where a label is i18n'd the locator uses a
 * bilingual regex because the app renders Vietnamese by default
 * (`I18nProvider` reads `localStorage.i18nextLng` and defaults to `vi`).
 *
 * data-testid file:line (src/pages/instructor/DashboardPage.tsx):
 *   - line  72: instructor-dashboard-stats
 *   - line 123: instructor-dashboard-exam-list
 *   - line 129: instructor-dashboard-exam-item
 *   - line 177: instructor-dashboard-quick-actions
 *   - line 207: instructor-dashboard-leaderboard
 *   - line 211: instructor-dashboard-leaderboard-item
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class InstructorDashboardPage {
  readonly page: Page;

  /** The InstructorLayout header <h1>: "Dashboard Giảng viên" / "Instructor Dashboard". */
  readonly heading: Locator;
  /** The seeded instructor's name, rendered as an <h2>. */
  readonly instructorName: Locator;
  readonly stats: Locator;
  readonly examList: Locator;
  readonly examItems: Locator;
  readonly quickActions: Locator;
  readonly leaderboard: Locator;
  readonly leaderboardItems: Locator;
  /** Header action: "Tạo khóa học mới" / "Create New Course". */
  readonly createCourseLink: Locator;
  /** Empty-state copy when the instructor has no exams. */
  readonly noExams: Locator;
  /** Empty-state copy for the platform-wide leaderboard. */
  readonly noData: Locator;
  /** My-courses card, which has no backend yet. */
  readonly noCourseApi: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', {
      level: 1,
      name: /Dashboard Giảng viên|Instructor Dashboard/i,
    });
    this.instructorName = page.getByRole('heading', {
      level: 2,
      name: /Giang Vien|GV|Học|Instructor/i,
    });
    this.stats = page.getByTestId('instructor-dashboard-stats');
    this.examList = page.getByTestId('instructor-dashboard-exam-list');
    this.examItems = page.getByTestId('instructor-dashboard-exam-item');
    this.quickActions = page.getByTestId('instructor-dashboard-quick-actions');
    this.leaderboard = page.getByTestId('instructor-dashboard-leaderboard');
    this.leaderboardItems = page.getByTestId('instructor-dashboard-leaderboard-item');
    this.createCourseLink = page.getByRole('link', {
      name: /Tạo khóa học mới|Create New Course/i,
    });
    this.noExams = page.getByText(/Bạn chưa có bài thi nào|You have no exams yet/i);
    this.noData = page.getByText(/Chưa có dữ liệu|No data yet/i);
    this.noCourseApi = page.getByText(
      /Chưa có API danh sách khoá học|There is no API for an instructor/i
    );
  }

  async goto(): Promise<void> {
    await this.page.goto('/instructor');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async expectStatsVisible(): Promise<void> {
    await expect(this.stats).toBeVisible();
  }

  async expectQuickActionHrefs(): Promise<void> {
    // Every quick action is a real <Link>; assert the four documented hrefs.
    const expected: Array<[RegExp, string]> = [
      [/Tạo khóa học|Create Course/i, '/instructor/courses/create'],
      [/Chấm điểm|Grading/i, '/instructor/grading'],
      [/Tạo câu hỏi AI|Generate AI Question/i, '/instructor/ai-question'],
      [/Phân tích|Analytics/i, '/instructor/analytics'],
    ];
    for (const [name, href] of expected) {
      await expect(this.quickActions.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  }

  /**
   * Read the value text of the stat card whose label matches.
   *
   * Both DashboardPage's local StatCard and StudentsPage's shared StatCard
   * render the card root as `div.rounded-2xl` and the value as
   * `div.text-2xl.font-bold`, with the label as its sibling. Scoping to the
   * card that contains the label avoids XPath / index selectors.
   */
  async statValue(label: RegExp): Promise<string> {
    const card = this.stats.locator('div.rounded-2xl').filter({ hasText: label });
    return ((await card.locator('div.text-2xl.font-bold').textContent()) ?? '').trim();
  }
}
