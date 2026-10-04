/** Wave 3D — E2E: /instructor/copyright */
import { test, expect, type Page } from '@playwright/test';
import { InstructorCopyrightPage } from '../pages/instructor/InstructorCopyrightPage';

type ConsoleErrorListener = (msg: { type: () => string; text: () => string }) => void;

function catchConsoleErrors(page: Page, fn: () => Promise<void>): Promise<string[]> {
  const errors: string[] = [];
  const listener: ConsoleErrorListener = (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  };
  page.on('console', listener);
  return fn()
    .finally(() => page.off('console', listener))
    .then(() => errors);
}

/** Seed a student session: `ProtectedRoute` must refuse the instructor route. */
async function seedStudentSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem(
      'ioes-auth',
      JSON.stringify({
        state: {
          user: {
            id: 'u-student-1',
            email: 'not-a-real-account@example.test',
            full_name: 'Seed Student',
            role: 'student',
          },
          accessToken: 'seed.access.token',
          refreshToken: 'seed.refresh.token',
          isAuthenticated: true,
        },
        version: 0,
      })
    );
  });
  // The student dashboard must not reach the real gateway with the fake token.
  // A pathname predicate, NOT a `**\/api\/**` glob: in dev the module URL of
  // `src/services/api/auth.api.ts` also contains `/api/`, and such a glob
  // answers the app's own source request with JSON and leaves a blank page.
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          timestamp: '2026-10-04T00:00:00Z',
          data: null,
        }),
      })
  );
}

test.describe('TC-ICOPYRIGHT-001: /instructor/copyright placeholder, guard and console', () => {
  test('should show the copyright placeholder from the sidebar with no console errors and refuse a student session', async ({
    page,
  }) => {
    const copyright = new InstructorCopyrightPage(page);

    // 1. Routing: start on the instructor dashboard and follow the real link.
    //    The dashboard fires its own API calls, which are not this page's
    //    business, so the console is only measured from the target route on.
    await page.goto('/instructor');
    await page.getByRole('link', { name: /bản quyền|copyright/i }).click();
    await expect(page).toHaveURL(/\/instructor\/copyright$/);
    await copyright.expectPage();

    // 2. Console cleanliness of the page under test, on a fresh load of that
    //    route only: the placeholder makes no request of its own.
    const errors = await catchConsoleErrors(page, async () => {
      await page.reload();
      await copyright.expectPage();
      await copyright.expectComingSoonCopy();
      // Both documented prerequisites are listed, and the page admits it
      // shows no sample data.
      await copyright.expectMissingItems(2);
      await copyright.expectNoFakeDataNote();
    });
    expect(errors).toHaveLength(0);

    // 2. Guard: a logged-in student is sent to their own dashboard and never
    // sees the instructor-only page.
    await seedStudentSession(page);
    await page.goto('/instructor/copyright');
    await expect(page).toHaveURL(/\/student$/);
    await expect(copyright.root).toHaveCount(0);
  });
});
