/**
 * Wave 2A — E2E Page Object: DashboardPage (student)
 *
 * Wraps all dashboard interactions used by
 * `tests/e2e/dashboard.student.spec.ts`. All selectors use data-testid
 * attributes that already exist on the page source:
 *   - dashboard-greeting        → greeting heading (h2)
 *   - dashboard-continue-learning-link  → link in Continue Learning card
 *   - dashboard-exam-start-link         → upcoming-exam start button
 *   - dashboard-header-exams-link       → top-right "Exams" header link
 *   - dashboard-analytics-error         → analytics error banner
 *
 * data-testid file:line (src/pages/student/DashboardPage.tsx):
 *   - 84:  dashboard-header-exams-link
 *   - 93:  dashboard-greeting
 *   - 99:  dashboard-analytics-error
 *   - 134: dashboard-continue-learning-link
 *   - 198: dashboard-exam-start-link
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  readonly greeting: Locator;
  readonly headerExamsLink: Locator;
  readonly continueLearningLink: Locator;
  readonly examStartLink: Locator;
  readonly analyticsErrorBanner: Locator;

  constructor(page: Page) {
    this.page = page;

    this.greeting = page.getByTestId('dashboard-greeting');
    this.headerExamsLink = page.getByTestId('dashboard-header-exams-link');
    this.continueLearningLink = page.getByTestId('dashboard-continue-learning-link');
    this.examStartLink = page.getByTestId('dashboard-exam-start-link');
    this.analyticsErrorBanner = page.getByTestId('dashboard-analytics-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/student');
  }

  async expectGreeting(name: string): Promise<void> {
    await expect(this.greeting).toContainText(name);
  }

  async expectHeaderExamsLink(): Promise<void> {
    await expect(this.headerExamsLink).toHaveAttribute('href', '/student/exams');
  }

  async expectContinueLearningLink(): Promise<void> {
    await expect(this.continueLearningLink.first()).toBeVisible();
  }

  async clickHeaderExams(): Promise<void> {
    await this.headerExamsLink.click();
  }
}
