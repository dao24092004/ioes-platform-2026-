/**
 * Wave 2A — E2E Page Object: CourseLearnPage (student)
 *
 * Wraps all in-classroom interactions used by
 * `tests/e2e/courseLearn.student.spec.ts`. All selectors use
 * data-testid attributes that exist on the page source:
 *   - learn-back-to-course         → header "Back to course" link
 *   - learn-lesson-{lessonId}      → each lesson button in the sidebar
 *   - learn-mark-complete-button   → mark current lesson complete
 *   - learn-next-lesson-button     → advance to the next lesson
 *   - learn-locked-enroll-button   → enroll button on a locked lesson
 *
 * data-testid file:line (src/pages/student/CourseLearnPage.tsx):
 *   - line 191:  learn-back-to-course
 *   - line 245:  learn-lesson-{lessonId} (template — per lesson)
 *   - line 327:  learn-mark-complete-button
 *   - line 341:  learn-next-lesson-button
 *   - line 217:  learn-locked-enroll-button
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class CourseLearnPage {
  readonly page: Page;

  readonly backToCourseLink: Locator;
  readonly markCompleteButton: Locator;
  readonly nextLessonButton: Locator;
  readonly lockedEnrollButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.backToCourseLink = page.getByTestId('learn-back-to-course');
    this.markCompleteButton = page.getByTestId('learn-mark-complete-button');
    this.nextLessonButton = page.getByTestId('learn-next-lesson-button');
    this.lockedEnrollButton = page.getByTestId('learn-locked-enroll-button');
  }

  async goto(courseId: string, lessonId?: string): Promise<void> {
    const search = lessonId ? `?lesson=${lessonId}` : '';
    await this.page.goto(`/student/learn/${courseId}${search}`);
  }

  async expectBackToCourseLink(): Promise<void> {
    await expect(this.backToCourseLink).toBeVisible();
    await expect(this.backToCourseLink).toHaveAttribute('href', /\/student\/courses\/.+/);
  }

  lessonButton(lessonId: string): Locator {
    return this.page.getByTestId(`learn-lesson-${lessonId}`);
  }

  async expectLessonButton(lessonId: string): Promise<void> {
    await expect(this.lessonButton(lessonId)).toBeVisible();
  }

  async clickLesson(lessonId: string): Promise<void> {
    await this.lessonButton(lessonId).click();
  }

  async expectMarkCompleteButton(): Promise<void> {
    await expect(this.markCompleteButton).toBeVisible();
  }

  async clickMarkComplete(): Promise<void> {
    await this.markCompleteButton.click();
  }

  async expectNextLessonButton(): Promise<void> {
    await expect(this.nextLessonButton).toBeVisible();
  }

  async clickNextLesson(): Promise<void> {
    await this.nextLessonButton.click();
  }

  async expectLockedEnrollButton(): Promise<void> {
    await expect(this.lockedEnrollButton).toBeVisible();
  }
}
