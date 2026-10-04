/**
 * Wave 4B (admin) — E2E Page Object: AdminCourseApprovalPage.
 *
 * Route: /admin/courses/approval
 * Network: three reads and two writes, ALL intercepted by the spec so no real
 * course is ever approved or rejected:
 *   GET  /api/v1/courses/stats        -> the four stat cards (also the filter)
 *   GET  /api/v1/categories           -> categoryId -> name
 *   GET  /api/v1/courses              -> the card grid
 *   GET  /api/v1/courses/:id/detail   -> lesson/chapter counts in the modal
 *   POST /api/v1/courses/:id/approve
 *   POST /api/v1/courses/:id/reject
 *
 * Every locator is a data-testid so the object keeps working in both the `vi`
 * and the `en` locale.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class AdminCourseApprovalPage {
  readonly page: Page;
  readonly root: Locator;
  readonly statAll: Locator;
  readonly statPending: Locator;
  readonly statApproved: Locator;
  readonly statRejected: Locator;
  readonly cards: Locator;
  readonly search: Locator;
  readonly loading: Locator;
  readonly empty: Locator;
  readonly error: Locator;
  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly modalApprove: Locator;
  readonly modalReject: Locator;
  readonly modalCancel: Locator;
  readonly modalClose: Locator;
  readonly reasonInput: Locator;
  readonly mutationError: Locator;
  readonly lessonCount: Locator;
  readonly chapterCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('admin-shell-main');
    this.statAll = page.getByTestId('admin-course-approval-stat-all');
    this.statPending = page.getByTestId('admin-course-approval-stat-pending');
    this.statApproved = page.getByTestId('admin-course-approval-stat-approved');
    this.statRejected = page.getByTestId('admin-course-approval-stat-rejected');
    this.cards = page.getByTestId('admin-course-approval-card');
    this.search = page.getByTestId('admin-course-approval-search');
    this.loading = page.getByTestId('admin-course-approval-loading');
    this.empty = page.getByTestId('admin-course-approval-empty');
    this.error = page.getByTestId('admin-course-approval-error');
    this.modal = page.getByTestId('admin-course-approval-modal');
    this.modalTitle = page.getByTestId('admin-course-approval-modal-title');
    this.modalApprove = page.getByTestId('admin-course-approval-modal-approve');
    this.modalReject = page.getByTestId('admin-course-approval-modal-reject');
    this.modalCancel = page.getByTestId('admin-course-approval-cancel');
    this.modalClose = page.getByTestId('admin-course-approval-modal-close');
    this.reasonInput = page.getByTestId('admin-course-approval-reason-input');
    this.mutationError = page.getByTestId('admin-course-approval-mutation-error');
    this.lessonCount = page.getByTestId('admin-course-approval-lesson-count');
    this.chapterCount = page.getByTestId('admin-course-approval-chapter-count');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/courses/approval');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.statAll).toBeVisible();
    await expect(this.loading).toBeHidden();
  }

  async expectCardCount(n: number): Promise<void> {
    await expect(this.cards).toHaveCount(n);
  }

  async cardText(index: number): Promise<string> {
    return (await this.cards.nth(index).innerText()).replace(/\s+/g, ' ').trim();
  }

  async selectStatus(key: 'all' | 'pending' | 'approved' | 'rejected'): Promise<void> {
    await this.page.getByTestId(`admin-course-approval-stat-${key}`).click();
  }

  async searchFor(term: string): Promise<void> {
    await this.search.fill(term);
  }

  async openPreview(index: number): Promise<void> {
    await this.cards.nth(index).getByTestId('admin-course-approval-preview').click();
  }

  async approveFromCard(index: number): Promise<void> {
    await this.cards.nth(index).getByTestId('admin-course-approval-approve').click();
  }

  async rejectFromCard(index: number): Promise<void> {
    await this.cards.nth(index).getByTestId('admin-course-approval-reject').click();
  }

  async fillReason(text: string): Promise<void> {
    await this.reasonInput.fill(text);
  }

  async expectModalClosed(): Promise<void> {
    await expect(this.modal).toBeHidden();
  }
}
