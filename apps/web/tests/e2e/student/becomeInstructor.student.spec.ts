/** Wave 2D — E2E: /student/become-instructor */
import { test } from '@playwright/test';
import { BecomeInstructorPage } from '../pages/student/BecomeInstructorPage';

test.describe('TC-BECOMEINSTR-001: /student/become-instructor submission', () => {
  test('should submit the application and render the pending banner', async ({ page }) => {
    const become = new BecomeInstructorPage(page);
    await become.goto();
    await become.expectPage();
    await become.fillBio('Senior engineer with 8 years of experience.');
    await become.clickSubmit();
    await become.expectPendingBanner();
  });
});
