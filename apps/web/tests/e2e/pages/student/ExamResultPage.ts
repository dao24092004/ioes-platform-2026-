// apps/web/tests/e2e/pages/student/ExamResultPage.ts
// Page Object for the student exam result page (/student/exams/:examId/result).
// All raw selectors live here — spec files must not embed selectors.
//
// data-testid attributes used: (none currently; falls back to role+label).
//
// Locator strategy: rely on role + i18n label.
import { type Page, type Locator, expect } from '@playwright/test';

export class ExamResultPage {
  readonly page: Page;
  readonly titleHeading: Locator;
  readonly passedBadge: Locator;
  readonly failedBadge: Locator;
  readonly backToExamsLink: Locator;
  readonly reviewAnswersButton: Locator;
  readonly shareButton: Locator;
  readonly retakeButton: Locator;
  readonly previousResultsList: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    // Title heading i18n: "Kết quả bài thi" (vi) / "Exam result" (en).
    this.titleHeading = page.getByRole('heading', { name: /Kết quả bài thi|Exam result/i }).first();
    // Passed badge i18n: "ĐẬU" (vi) / "PASSED" (en).
    this.passedBadge = page.getByText(/^ĐẬU$|^PASSED$/);
    // Failed badge i18n: "CHƯA ĐẠT" (vi) / "FAILED" (en).
    this.failedBadge = page.getByText(/^CHƯA ĐẠT$|^FAILED$/);
    // Back link i18n: "Quay lại danh sách bài thi" (vi) / "Back to exams" (en).
    this.backToExamsLink = page.getByRole('link', {
      name: /Quay lại danh sách bài thi|Back to exams/i,
    });
    // Review button i18n: "Xem lại đáp án" (vi) / "Review answers" (en).
    this.reviewAnswersButton = page.getByRole('button', { name: /Xem lại đáp án|Review answers/i });
    // Share button i18n: "Chia sẻ" (vi) / "Share" (en).
    this.shareButton = page.getByRole('button', { name: /^Chia sẻ$|^Share$/ });
    // Retake button i18n: "Làm lại" (vi) / "Retake" (en).
    this.retakeButton = page.getByRole('button', { name: /Làm lại|Retake/i });
    // Previous results heading i18n: "Lần thi trước" (vi) / "Previous attempts" (en).
    this.previousResultsList = page.getByText(/Lần thi trước|Previous attempts/i);
    // Empty state i18n: "Chưa có bài thi nào đã nộp." (vi) / "No submissions yet" (en).
    this.emptyState = page.getByText(/Chưa có bài thi nào đã nộp|No submissions yet/i);
  }

  async goto(examId: string): Promise<void> {
    await this.page.goto(`/student/exams/${examId}/result`);
  }

  async expectResultCard(): Promise<void> {
    await expect(this.titleHeading).toBeVisible();
  }

  async expectPassed(): Promise<void> {
    await expect(this.passedBadge).toBeVisible();
  }

  async expectFailed(): Promise<void> {
    await expect(this.failedBadge).toBeVisible();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  async clickBackToExams(): Promise<void> {
    await this.backToExamsLink.click();
  }
}
