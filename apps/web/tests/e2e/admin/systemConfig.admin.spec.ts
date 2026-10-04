/** Wave 4B (admin) — E2E: /admin/settings (SystemConfigPage) */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AdminSystemConfigPage } from '../pages/admin/AdminSystemConfigPage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDotenvOnce(file: string): void {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    const value = m[2].replace(/^['"]|['"]$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}
loadDotenvOnce(path.resolve(__dirname, '..', '..', '..', '.env'));
loadDotenvOnce(path.resolve(__dirname, '..', '..', '..', '..', '..', '.env'));

// The web-admin project depends on the setup project, which needs these. Read
// them WITHOUT ever printing them; the session itself comes from storageState.
const adminEmail = process.env.TEST_ADMIN_EMAIL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;

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

const SAVED_AT = /đã lưu lúc|saved at/i;

test.describe('TC-ADMCONFIG-001: /admin/settings edits every field in React state, stamps savedAt on save and run-backup, and issues no network request at all', () => {
  test('should keep an edited value across a section round trip, disable then re-enable Save and Run backup while stamping savedAt, and never call an /api endpoint', async ({
    page,
  }) => {
    test.skip(
      !adminEmail || !adminPassword,
      'missing env: TEST_ADMIN_EMAIL or TEST_ADMIN_PASSWORD'
    );

    // Record every request for the whole session, so "nothing is persisted" is
    // an observation rather than a claim.
    const apiCalls: string[] = [];
    page.on('request', (req) => {
      const { pathname } = new URL(req.url());
      if (pathname.startsWith('/api/')) apiCalls.push(`${req.method()} ${pathname}`);
    });

    const errors = await catchConsoleErrors(page, async () => {
      const config = new AdminSystemConfigPage(page);
      await config.goto();
      await config.expectLoaded();

      // --- General: the shipped defaults, then a text / select / toggle edit ---
      await expect(config.platformName).toHaveValue('IOES Platform');
      await expect(config.supportEmail).toHaveValue('support@ioes.vn');
      await expect(config.defaultLang).toHaveValue('vi');
      await expect(config.timezone).toHaveValue('Asia/Ho_Chi_Minh');
      expect(await config.switchState(config.maintenance)).toBe('false');

      await config.platformName.fill('IOES Exam Cloud');
      await config.defaultLang.selectOption('en');
      await config.timezone.selectOption('UTC');
      await config.maintenance.click();
      expect(await config.switchState(config.maintenance)).toBe('true');

      // --- Security: numbers, the blank-to-zero collapse and a switch ---
      await config.openSection('security');
      await expect(config.minLength).toHaveValue('8');
      expect(await config.switchState(config.mfaRequired)).toBe('true');
      await config.minLength.fill('');
      await expect(config.minLength).toHaveValue('0');
      await config.minLength.fill('12');
      await expect(config.minLength).toHaveValue('12');

      // --- Round trip: the General edits survived the section change ---
      await config.openSection('general');
      await expect(config.platformName).toHaveValue('IOES Exam Cloud');
      await expect(config.defaultLang).toHaveValue('en');
      await expect(config.timezone).toHaveValue('UTC');
      expect(await config.switchState(config.maintenance)).toBe('true');
      await expect(config.minLength).toHaveCount(0);

      // --- Save: disabled for the page's own 800ms, then a savedAt stamp ---
      await expect(config.savedAt).toHaveCount(0);
      const firstStamp = await config.save();
      expect(firstStamp).toMatch(SAVED_AT);
      expect(firstStamp).toMatch(/\d{1,2}:\d{2}/);

      // --- Run backup: its own 1200ms, and it re-stamps savedAt ---
      const secondStamp = await config.runBackup();
      expect(secondStamp).toMatch(SAVED_AT);
      expect(secondStamp).not.toBe(firstStamp);
    });

    expect(errors).toHaveLength(0);
    // THE contract: a whole session of editing, saving and running a backup
    // produced zero API traffic. Nothing was persisted anywhere.
    expect(apiCalls).toEqual([]);
  });
});
