/** Wave 3D — E2E: /instructor/discussions and /instructor/discussions/:courseId */
import { test, expect, type Page } from '@playwright/test';
import { InstructorDiscussionsPage } from '../pages/instructor/InstructorDiscussionsPage';

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

test.describe('TC-IDISCUSS-001: /instructor/discussions placeholder at both routes', () => {
  test('should show the discussion placeholder at the index and course routes with no console errors and refuse a student session', async ({
    page,
  }) => {
    const discussions = new InstructorDiscussionsPage(page);

    // 1. Routing: the sidebar link opens the index route. The dashboard fires
    //    its own API calls, so the console is measured from the target route on.
    await page.goto('/instructor');
    await page.getByRole('link', { name: /thảo luận|discussions/i }).click();
    await expect(page).toHaveURL(/\/instructor\/discussions$/);
    await discussions.expectPage();

    const errors = await catchConsoleErrors(page, async () => {
      await page.reload();
      await discussions.expectPage();
      await discussions.expectComingSoonCopy();
      await discussions.expectMissingItems(2);
    });
    expect(errors).toHaveLength(0);

    // 2. The course-scoped route renders the same placeholder and still does
    //    not ask the backend for that course's threads.
    await discussions.gotoCourse('c-1');
    await expect(page).toHaveURL(/\/instructor\/discussions\/c-1$/);
    await discussions.expectPage();
    await discussions.expectComingSoonCopy();
    // The course id is not echoed anywhere in the body.
    await expect(discussions.root.getByText('c-1')).toHaveCount(0);

    // 3. Guard.
    await seedStudentSession(page);
    await page.goto('/instructor/discussions/c-1');
    await expect(page).toHaveURL(/\/student$/);
    await expect(discussions.root).toHaveCount(0);
  });
});
