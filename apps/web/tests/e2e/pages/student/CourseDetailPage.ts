/**
 * Wave 2A — E2E Page Object: CourseDetailPage (student)
 *
 * Wraps all course-detail interactions used by
 * `tests/e2e/courseDetail.student.spec.ts`. All selectors use
 * data-testid attributes that exist on the page source:
 *   - coursedetail-learn-button         → banner center play button
 *   - coursedetail-tab-about            → About tab
 *   - coursedetail-tab-curriculum       → Curriculum tab
 *   - coursedetail-tab-reviews          → Reviews tab
 *   - coursedetail-tab-discussions      → Discussions tab
 *   - coursedetail-enroll-button        → Enroll CTA (when not enrolled)
 *   - coursedetail-enroll-continue      → Continue link (when enrolled)
 *   - coursedetail-cancel-confirm-block → Cancel confirm wrapper
 *   - coursedetail-cancel-confirm-button → Final cancel button
 *
 * data-testid file:line (src/pages/student/CourseDetailPage.tsx):
 *   - line 153: coursedetail-learn-button
 *   - line 200: coursedetail-tab-about
 *   - line 201: coursedetail-tab-curriculum
 *   - line 202: coursedetail-tab-reviews
 *   - line 203: coursedetail-tab-discussions
 *   - line 363: coursedetail-enroll-button
 *   - line 310: coursedetail-enroll-continue
 *   - line 319: coursedetail-cancel-confirm-block
 *   - line 324: coursedetail-cancel-confirm-button
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class CourseDetailPage {
  readonly page: Page;

  readonly learnButton: Locator;
  readonly tabAbout: Locator;
  readonly tabCurriculum: Locator;
  readonly tabReviews: Locator;
  readonly tabDiscussions: Locator;
  readonly enrollButton: Locator;
  readonly enrollContinueLink: Locator;
  readonly cancelConfirmBlock: Locator;
  readonly cancelConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.learnButton = page.getByTestId('coursedetail-learn-button');
    this.tabAbout = page.getByTestId('coursedetail-tab-about');
    this.tabCurriculum = page.getByTestId('coursedetail-tab-curriculum');
    this.tabReviews = page.getByTestId('coursedetail-tab-reviews');
    this.tabDiscussions = page.getByTestId('coursedetail-tab-discussions');
    this.enrollButton = page.getByTestId('coursedetail-enroll-button');
    this.enrollContinueLink = page.getByTestId('coursedetail-enroll-continue');
    this.cancelConfirmBlock = page.getByTestId('coursedetail-cancel-confirm-block');
    this.cancelConfirmButton = page.getByTestId('coursedetail-cancel-confirm-button');
  }

  async goto(courseId: string): Promise<void> {
    await this.page.goto(`/student/courses/${courseId}`);
  }

  async expectLearnButton(): Promise<void> {
    await expect(this.learnButton).toHaveAttribute('href', /\/student\/learn\/.+/);
  }

  async clickTabAbout(): Promise<void> {
    await this.tabAbout.click();
  }

  async clickTabCurriculum(): Promise<void> {
    await this.tabCurriculum.click();
  }

  async clickTabReviews(): Promise<void> {
    await this.tabReviews.click();
  }

  async clickTabDiscussions(): Promise<void> {
    await this.tabDiscussions.click();
  }

  async expectAllTabs(): Promise<void> {
    await expect(this.tabAbout).toBeVisible();
    await expect(this.tabCurriculum).toBeVisible();
    await expect(this.tabReviews).toBeVisible();
    await expect(this.tabDiscussions).toBeVisible();
  }

  async expectEnrollButton(): Promise<void> {
    await expect(this.enrollButton).toBeVisible();
  }

  async clickEnroll(): Promise<void> {
    await this.enrollButton.click();
  }

  async expectContinueLink(): Promise<void> {
    await expect(this.enrollContinueLink).toBeVisible();
    await expect(this.enrollContinueLink).toHaveAttribute('href', /\/student\/learn\/.+/);
  }
}
