/**
 * Wave 3C — E2E Page Object: InstructorGradingPage (/instructor/grading)
 *
 * Wraps the grading queue and its one mutating control. The grade button
 * calls `POST /api/exams/:examId/submissions/:attemptId/grade`, which changes
 * real data for the shared instructor account — specs MUST mock that call
 * with `page.route()` before calling `gradeFirstRow()`. The reads are mocked
 * too so the queue content is deterministic regardless of the seed data.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class InstructorGradingPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly queue: Locator;
  readonly stats: Locator;
  readonly queueTitle: Locator;
  readonly gradeButtons: Locator;
  readonly successBanner: Locator;
  readonly gradeErrorBanner: Locator;
  readonly loadErrorBanner: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;

    // Layout heading i18n: "Chấm điểm" (vi) / "Grading" (en).
    this.heading = page.getByRole('heading', { name: /^Chấm điểm$|^Grading$/ });
    this.queue = page.getByTestId('instructor-grading-queue');
    this.stats = page.getByTestId('instructor-grading-stats');
    // Section heading i18n: "Hàng đợi chấm bài" (vi) / "Grading queue" (en).
    this.queueTitle = page.getByRole('heading', {
      name: /^Hàng đợi chấm bài$|^Grading queue$/,
    });
    this.gradeButtons = page.getByTestId('instructor-grading-grade-button');
    this.successBanner = page.getByTestId('instructor-grading-grade-success');
    this.gradeErrorBanner = page.getByTestId('instructor-grading-grade-error');
    this.loadErrorBanner = page.getByTestId('instructor-grading-load-error');
    this.emptyState = page.getByTestId('instructor-grading-empty');
  }

  async goto(): Promise<void> {
    await this.page.goto('/instructor/grading');
    await expect(this.heading).toBeVisible();
    await expect(this.queue).toBeVisible();
  }

  /** Wait until the queue has resolved to rows (not the loading row). */
  async expectQueueLoaded(): Promise<void> {
    await expect(this.page.getByTestId('instructor-grading-loading')).toHaveCount(0);
    await expect(this.gradeButtons.first()).toBeVisible();
  }

  /**
   * Click the grade button of the first queue row. Button label i18n:
   * "Chấm tự động" (vi) / "Auto-grade" (en); it flips to "Đang chấm…"
   * ("Grading…") while the mutation is in flight.
   */
  async gradeFirstRow(): Promise<void> {
    await this.gradeButtons.first().click();
  }
}
