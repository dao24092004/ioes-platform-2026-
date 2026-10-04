// apps/web/tests/e2e/pages/student/ExamTakingPage.ts
// Page Object for the student exam taking page (/student/exams/:examId/take).
// All raw selectors live here — spec files must not embed selectors.
//
// data-testid attributes used:
//   - exam-taking-page → ExamTakingPage.tsx root wrapper (already exists)
//
// Locator strategy: rely on testid first; fall back to role + i18n label.
import { type Page, type Locator, expect } from '@playwright/test';

export class ExamTakingPage {
  readonly page: Page;
  readonly root: Locator;
  readonly submitButton: Locator;
  readonly submitModal: Locator;
  readonly submitFinalButton: Locator;
  readonly submitContinueButton: Locator;
  readonly questionText: Locator;
  readonly navigatorGrid: Locator;
  readonly flagButton: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  readonly clock: Locator;
  readonly backToExamsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('exam-taking-page');
    // Submit button i18n: "Nộp bài" (vi) / "Submit" (en).
    this.submitButton = page.getByRole('button', { name: /Nộp bài|^Submit$/i });
    // Modal title i18n: "Xác nhận nộp bài" (vi) / "Confirm submission" (en).
    this.submitModal = page.getByRole('heading', { name: /Xác nhận nộp bài|Confirm submission/i });
    // Final submit button i18n: "Nộp bài" (vi) / "Submit" (en).
    this.submitFinalButton = page.getByRole('button', { name: /Nộp bài|^Submit$/ }).first();
    // Continue button i18n: "Tiếp tục làm" (vi) / "Continue" (en).
    this.submitContinueButton = page.getByRole('button', { name: /Tiếp tục làm|^Continue$/i });
    // The question text is in a <p> with text-lg leading-relaxed class.
    this.questionText = page.locator('p.text-lg.leading-relaxed');
    this.navigatorGrid = page.locator('div.grid.grid-cols-5');
    // Flag button i18n: "Đánh dấu" (vi) / "Flag" (en).
    this.flagButton = page.getByRole('button', { name: /Đánh dấu|^Flag$/i });
    // Previous button i18n: "Câu trước" (vi) / "Previous" (en).
    this.prevButton = page.getByRole('button', { name: /Câu trước|^Previous$/i });
    // Next button i18n: "Câu tiếp" (vi) / "Next" (en).
    this.nextButton = page.getByRole('button', { name: /Câu tiếp|^Next$/i });
    // The clock uses tabular-nums and is in a div with text-2xl.
    this.clock = page.locator('div.text-2xl.font-bold');
    // Back link i18n: "Về danh sách bài thi" (vi) / "Back to exam list" (en).
    this.backToExamsLink = page.getByRole('link', {
      name: /Về danh sách bài thi|Back to exam list/i,
    });
  }

  async goto(examId: string): Promise<void> {
    await this.page.goto(`/student/exams/${examId}/take`);
    // Wait for the page root to render (either the exam-taking-page root
    // or the error back-link).
    await expect(this.root.or(this.backToExamsLink).first()).toBeVisible();
  }

  async openSubmitModal(): Promise<void> {
    await this.submitButton.click();
    await expect(this.submitModal).toBeVisible();
  }

  async clickSubmitFinal(): Promise<void> {
    // The submit modal renders on a fixed overlay (z-50). The header "Submit"
    // button shares the role+name, so we scope the final click to the
    // modal container to avoid the overlay intercepting the click.
    const modal = this.page.locator('div.fixed.inset-0');
    await modal
      .getByRole('button', { name: /Nộp bài|^Submit$/ })
      .first()
      .click();
  }

  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }

  async clickPrev(): Promise<void> {
    await this.prevButton.click();
  }

  async selectFirstOption(): Promise<void> {
    // The first option button is the first <button> inside the option list.
    // Each option renders a button containing the letter A/B/C/D label.
    const options = this.page.locator('div.flex.flex-col.gap-4 > button');
    await options.first().click();
  }

  async expectErrorState(): Promise<void> {
    await expect(this.backToExamsLink).toBeVisible();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.root).toBeVisible();
  }
}
