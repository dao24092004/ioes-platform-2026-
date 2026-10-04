/** Wave 3D — E2E: /instructor/messages */
import { test, expect, type Page } from '@playwright/test';
import { InstructorMessagesPage } from '../pages/instructor/InstructorMessagesPage';

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

test.describe('TC-IMSG-001: /instructor/messages placeholder, guard and console', () => {
  test('should show the inbox placeholder from the sidebar with no console errors and refuse a student session', async ({
    page,
  }) => {
    const messages = new InstructorMessagesPage(page);

    // 1. Routing. The dashboard fires its own API calls, so the console is
    //    measured from the target route on.
    await page.goto('/instructor');
    await page.getByRole('link', { name: /tin nhắn|messages/i }).click();
    await expect(page).toHaveURL(/\/instructor\/messages$/);
    await messages.expectPage();

    const errors = await catchConsoleErrors(page, async () => {
      await page.reload();
      await messages.expectPage();
      await messages.expectComingSoonCopy();
      await messages.expectMissingItems(2);
      await messages.expectNoFakeDataNote();
    });
    expect(errors).toHaveLength(0);

    // 2. Guard.
    await seedStudentSession(page);
    await page.goto('/instructor/messages');
    await expect(page).toHaveURL(/\/student$/);
    await expect(messages.root).toHaveCount(0);
  });
});
