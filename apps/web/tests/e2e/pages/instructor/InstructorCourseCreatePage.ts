/**
 * Wave 3B — E2E Page Object: InstructorCourseCreatePage
 * (/instructor/courses/create)
 *
 * Wraps the three-step <CourseForm/> used by
 * tests/e2e/courseCreate.instructor.spec.ts.
 *
 * NOTE: form VALIDATION is deliberately NOT exercised here. CourseForm has no
 * exported validator, so its rules are covered at the integration level in
 * tests/integration/instructor.courseCreate.test.tsx (IT-ICOURSEADD-001..003).
 * Repeating them in the browser would violate the "a behaviour covered lower
 * must not be repeated higher" rule. This object only drives the happy path
 * far enough to inspect the real POST body.
 *
 * data-testid file:line (src/components/instructor/CourseForm.tsx):
 *   - line 155: instructor-course-form
 *   - line 231: instructor-course-form-stepper
 *   - line 236: instructor-course-form-step        (carries data-step)
 *   - line 281: instructor-course-form-title
 *   - line 293: instructor-course-form-shortdesc
 *   - line 321: instructor-course-form-category
 *   - line 338: instructor-course-form-level
 *   - line 401: instructor-course-form-add-chapter
 *   - line 416: instructor-course-form-chapter
 *   - line 425: instructor-course-form-chapter-title
 *   - line 433: instructor-course-form-remove-chapter
 *   - line 444: instructor-course-form-lesson-list
 *   - line 446: instructor-course-form-lesson
 *   - line 461: instructor-course-form-lesson-title
 *   - line 477: instructor-course-form-remove-lesson
 *   - line 489: instructor-course-form-add-lesson
 *   - line 200: instructor-course-form-submit
 * and (src/pages/instructor/CourseCreatePage.tsx):
 *   - line  93: instructor-course-create-error
 */
import { type Page, type Locator, expect } from '@playwright/test';

export const CREATE_COPY = {
  heading: /Tạo khóa học mới|Create New Course/i,
  saveDraft: /Lưu nháp|Save Draft/i,
  free: /^Miễn phí$|^Free$/i,
  paid: /^Trả phí$|^Paid$/i,
} as const;

export class InstructorCourseCreatePage {
  readonly page: Page;

  readonly heading: Locator;
  readonly form: Locator;
  readonly title: Locator;
  readonly category: Locator;
  readonly level: Locator;
  readonly shortDescription: Locator;
  readonly addChapter: Locator;
  readonly chapterTitles: Locator;
  readonly lessonTitles: Locator;
  readonly addLesson: Locator;
  readonly freeCard: Locator;
  readonly paidCard: Locator;
  readonly price: Locator;
  readonly submit: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;

    // Scoped by accessible name, not by level: the global LoadingScreen
    // overlay (src/components/common/LoadingScreen.tsx:356) also renders an
    // <h1>IOES</h1>, so `getByRole('heading', { level: 1 })` is ambiguous.
    this.heading = page.getByRole('heading', { name: CREATE_COPY.heading });
    this.form = page.getByTestId('instructor-course-form');
    this.title = page.getByTestId('instructor-course-form-title');
    this.category = page.getByTestId('instructor-course-form-category');
    this.level = page.getByTestId('instructor-course-form-level');
    this.shortDescription = page.getByTestId('instructor-course-form-shortdesc');
    this.addChapter = page.getByTestId('instructor-course-form-add-chapter');
    this.chapterTitles = page.getByTestId('instructor-course-form-chapter-title');
    this.lessonTitles = page.getByTestId('instructor-course-form-lesson-title');
    this.addLesson = page.getByTestId('instructor-course-form-add-lesson');
    this.freeCard = page.getByTestId('instructor-course-form-pricing-free');
    this.paidCard = page.getByTestId('instructor-course-form-pricing-paid');
    this.price = page.getByTestId('instructor-course-form-price');
    this.submit = page.getByTestId('instructor-course-form-submit');
    this.errorBanner = page.getByTestId('instructor-course-create-error');
  }

  /** The stepper button carrying a given data-step (1, 2 or 3). */
  step(n: 1 | 2 | 3): Locator {
    return this.page.locator('[data-testid="instructor-course-form-step"][data-step="' + n + '"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/instructor/courses/create');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.form).toBeVisible();
    // The category select is disabled until GET /api/v1/categories resolves.
    await expect(this.category).toBeEnabled();
  }

  /** Fill step 1 (basic info) and wait for the category options to arrive. */
  async fillBasics(title: string, categoryId: string): Promise<void> {
    await this.title.fill(title);
    await this.category.selectOption(categoryId);
  }

  async fillShortDescription(text: string): Promise<void> {
    await this.shortDescription.fill(text);
  }

  async goToPricing(): Promise<void> {
    await this.step(3).click();
    await expect(this.freeCard).toBeVisible();
  }

  async choosePaidWithPrice(price: string): Promise<void> {
    await this.paidCard.click();
    await expect(this.price).toBeVisible();
    await this.price.fill(price);
  }

  async saveDraft(): Promise<void> {
    await expect(this.submit).toHaveText(CREATE_COPY.saveDraft);
    await this.submit.click();
  }
}
