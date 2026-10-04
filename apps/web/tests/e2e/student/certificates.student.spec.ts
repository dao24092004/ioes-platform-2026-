/** Wave 2C — E2E: student certificates page (/student/certificates) */
import { test, expect, type Page } from '@playwright/test';
import { CertificatesPage } from '../pages/student/CertificatesPage';

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

test.describe('TC-CERT-001: /student/certificates renders the blockchain ComingSoon with no console errors', () => {
  test('should render ComingSoon h1 + badge + missing items list', async ({ page }) => {
    const errors = await catchConsoleErrors(page, async () => {
      const certificates = new CertificatesPage(page);
      await certificates.goto();
      await certificates.expectComingSoon();
      await certificates.expectMissingItems();
    });
    expect(errors).toHaveLength(0);
  });
});
