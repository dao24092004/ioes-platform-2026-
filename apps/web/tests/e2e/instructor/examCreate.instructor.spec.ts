/** Wave 3C — E2E: /instructor/exams/create (role = instructor) */
import { test, expect } from '@playwright/test';
import { InstructorExamCreatePage } from '../pages/instructor/InstructorExamCreatePage';

test.describe('/instructor/exams/create: ComingSoon', () => {
  test('TC-IEXAMCREATE-001: should render the ComingSoon title, description and both missing-backend items when an instructor opens the create-exam route', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const create = new InstructorExamCreatePage(page);
    await create.goto();

    await expect(page).toHaveURL(/\/instructor\/exams\/create$/);
    await create.expectComingSoon();

    // Title i18n: "Tạo bài thi" (vi) / "Create exam" (en).
    await expect(create.title).toHaveText(/^Tạo bài thi$|^Create exam$/);
    // Description i18n: "Soạn đề thi, chọn câu hỏi, ..." (vi) / "Compose an
    // exam, pick questions, ..." (en).
    await expect(create.description).toContainText(/soạn đề thi|compose an exam/i);

    // Both backend gaps are named so an instructor is not left guessing why
    // there is no Save button.
    await create.expectMissingItems(2);

    // No form control that could not work, and no failed request while the
    // page settles.
    await expect(page.getByTestId('instructor-exams-create-link')).toHaveCount(0);
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
