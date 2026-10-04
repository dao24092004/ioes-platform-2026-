/** Wave 2C — E2E: student token-wallet page (/student/wallet) */
import { test, expect, type Page } from '@playwright/test';
import { TokenWalletPage } from '../pages/student/TokenWalletPage';

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

test.describe('TC-WALLET-001: /student/wallet renders the blockchain ComingSoon with no console errors', () => {
  test('should render ComingSoon h1 + badge + missing items list', async ({ page }) => {
    const errors = await catchConsoleErrors(page, async () => {
      const wallet = new TokenWalletPage(page);
      await wallet.goto();
      await wallet.expectComingSoon();
      await wallet.expectMissingItems();
    });
    expect(errors).toHaveLength(0);
  });
});
