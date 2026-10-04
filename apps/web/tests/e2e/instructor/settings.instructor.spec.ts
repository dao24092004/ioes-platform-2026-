/** Wave 3D — E2E: /instructor/settings */
import { test, expect, type Page } from '@playwright/test';
import { InstructorSettingsPage } from '../pages/instructor/InstructorSettingsPage';

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

test.describe('TC-ISETTINGS-001: /instructor/settings sections and language switch', () => {
  test('should switch sections, apply the language choice and send no save request', async ({
    page,
  }) => {
    const mutatingRequests: string[] = [];
    // Record any non-GET call so the "this page saves nothing" claim is real.
    // A pathname predicate, NOT a `**\/api\/**` glob: in dev the module URL of
    // `src/services/api/auth.api.ts` also contains `/api/`, and such a glob
    // answers the app's own source request with JSON and leaves a blank page.
    await page.route(
      (url) => url.pathname.startsWith('/api/'),
      async (route) => {
        if (route.request().method() !== 'GET') {
          mutatingRequests.push(`${route.request().method()} ${route.request().url()}`);
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'ok',
            timestamp: '2026-10-04T00:00:00Z',
            data: null,
          }),
        });
      }
    );

    const settings = new InstructorSettingsPage(page);
    const errors = await catchConsoleErrors(page, async () => {
      await settings.goto();
      await expect(page).toHaveURL(/\/instructor\/settings$/);
      await settings.expectPage();
      // The app boots in Vietnamese.
      await settings.expectGeneralPanel();
      await expect(
        settings.panel.getByText('Ngôn ngữ áp dụng ngay trên trình duyệt này.')
      ).toBeVisible();

      // The language choice applies immediately and is written to storage.
      await settings.chooseLanguage('en');
      await settings.expectLanguage('en');
      await expect(settings.panel.getByRole('heading', { name: 'General settings' })).toBeVisible();
      const stored = await page.evaluate(() => window.localStorage.getItem('ioes-lang'));
      expect(stored).toBe('en');

      // The other four sections have no backend and say so. `ComingSoon` is
      // given the SECTION label as its title (`instructor.settings.section.*`),
      // not the longer heading of the section itself.
      await settings.sectionBilling.click();
      await settings.expectComingSoonPanel(/billing/i);
      await settings.sectionTeaching.click();
      await settings.expectComingSoonPanel(/teaching/i);
      await settings.sectionNotifications.click();
      await settings.expectComingSoonPanel(/notifications/i);
      await settings.sectionIntegrations.click();
      await settings.expectComingSoonPanel(/integrations/i);

      // Back to the only panel with a real control; the language chosen above
      // is still in effect.
      await settings.sectionGeneral.click();
      await settings.expectLanguage('en');
    });

    expect(errors).toHaveLength(0);
    // No section switch and no language change sends a save request.
    expect(mutatingRequests).toEqual([]);
  });
});
