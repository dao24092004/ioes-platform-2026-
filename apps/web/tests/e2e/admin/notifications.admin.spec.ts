/** Wave 4 / subagent 2C — E2E: admin notifications page (/admin/notifications) */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AdminNotificationsPage } from '../pages/admin/AdminNotificationsPage';

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

const envelope = <T>(data: T) => ({
  success: true,
  message: 'ok',
  data,
  timestamp: '2026-09-01T00:00:00Z',
});

const STATS = {
  total: 12,
  pending: 1,
  sent: 9,
  failed: 1,
  retrying: 1,
  email: 8,
  push: 2,
  sms: 1,
  inApp: 1,
};

const INBOX = [
  {
    id: 'n-1',
    userId: '00000000-0000-0000-0000-000000000002',
    type: 'email',
    recipient: 'hocvien1@ioes.test',
    subject: 'Kết quả thi giữa kỳ',
    status: 'sent',
    sentAt: '2026-09-01T00:00:00Z',
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'n-2',
    userId: '00000000-0000-0000-0000-000000000002',
    type: 'in_app',
    recipient: 'device-token-abc',
    subject: 'Nhắc nộp bài tập',
    status: 'pending',
    sentAt: null,
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'n-3',
    userId: '00000000-0000-0000-0000-000000000002',
    type: 'email',
    recipient: 'hocvien3@ioes.test',
    subject: 'Thông báo hủy lớp',
    status: 'failed',
    sentAt: null,
    createdAt: '2026-09-01T00:00:00Z',
  },
];

const TEMPLATES = [{ name: 'welcome' }, { name: 'exam-result' }];

/**
 * Stub the three notification reads in one handler.
 *
 * Matching on `pathname` (never a "star-star slash api star-star slash" glob)
 * is mandatory: a glob also matches Vite's module URLs and kills the bundle.
 * `POST /api/notifications/send` is deliberately NOT routed — it must never be
 * reached from here.
 */
async function stubNotificationReads(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname.startsWith('/api/notifications'),
    (route) => {
      const { pathname } = new URL(route.request().url());
      const data = pathname.endsWith('/stats')
        ? STATS
        : pathname.endsWith('/templates')
          ? TEMPLATES
          : INBOX;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope(data)),
      });
    }
  );
}

test.describe('TC-ADMNOTIF-001: /admin/notifications shows the stat cards, the inbox with its status pills, the template table and a correctly gated broadcast form, and logs no console errors', () => {
  test('should render four stat cards, three inbox items, five counted status pills, two templates, and keep the send button disabled until recipient, title and message are all set', async ({
    page,
  }) => {
    test.skip(
      !adminEmail || !adminPassword,
      'missing env: TEST_ADMIN_EMAIL or TEST_ADMIN_PASSWORD'
    );

    await stubNotificationReads(page);

    const errors = await catchConsoleErrors(page, async () => {
      const page_ = new AdminNotificationsPage(page);
      await page_.goto();
      await page_.expectLoaded();

      // Four stat cards off /api/notifications/stats.
      await page_.expectKpiCount(4);
      expect(await page_.kpiValue(0)).toBe('12');
      expect(await page_.kpiValue(1)).toBe('1');
      expect(await page_.kpiValue(2)).toBe('9');
      expect(await page_.kpiValue(3)).toBe('1');

      // Three inbox items, each with a subject, a status badge and a meta line
      // built from formatRelative + the recipient. The status badge carries
      // Tailwind's `uppercase`, so innerText comes back upper-cased.
      await page_.expectItemCount(3);
      expect(await page_.itemSubject(0)).toBe('Kết quả thi giữa kỳ');
      expect(await page_.itemStatus(0)).toMatch(/đã gửi|sent/i);
      expect(await page_.itemMeta(0)).toContain('hocvien1@ioes.test');
      // A pending record has no sentAt, so the meta falls back to createdAt.
      expect(await page_.itemStatus(1)).toMatch(/đang chờ|pending/i);
      expect(await page_.itemMeta(1)).toContain('device-token-abc');
      expect(await page_.itemStatus(2)).toMatch(/thất bại|failed/i);

      // Five pills, each counting the whole inbox, and narrowing works.
      expect(await page_.pillCount(0)).toBe('3');
      expect(await page_.pillCount(1)).toBe('1');
      expect(await page_.pillCount(2)).toBe('1');
      expect(await page_.pillCount(3)).toBe('1');
      expect(await page_.pillCount(4)).toBe('0');
      await page_.expectActivePill(0);

      await page_.clickFilterPill(3);
      await page_.expectItemCount(1);
      await page_.expectActivePill(3);
      expect(await page_.itemSubject(0)).toBe('Thông báo hủy lớp');
      await page_.clickFilterPill(0);
      await page_.expectItemCount(3);

      // Templates: only the name exists, so one column and a row count.
      await page_.expectTemplatesCount(2);
      await page_.expectTemplateNames(['welcome', 'exam-result']);

      // Broadcast form. Nothing is sent — the send button is only inspected.
      await page_.expectChannelState(0, { enabled: false, checked: false });
      await page_.expectChannelState(1, { enabled: true, checked: true });
      await page_.expectChannelState(2, { enabled: false, checked: false });

      await page_.expectSendEnabled(false);
      await page_.fillBroadcastForm({ recipient: 'hocvien1@ioes.test' });
      await page_.expectSendEnabled(false);
      await page_.fillBroadcastForm({ title: 'Thông báo kỳ thi' });
      await page_.expectSendEnabled(false);
      await page_.fillBroadcastForm({ message: 'Kỳ thi mở cửa lúc 8h ngày 10/10.' });
      await page_.expectSendEnabled(true);

      // Whitespace is not content — every field is trimmed before sending.
      await page_.fillBroadcastForm({ message: '   ' });
      await page_.expectSendEnabled(false);

      // Still no send error: nothing was posted.
      await expect(page_.sendError).toHaveCount(0);
    });

    expect(errors).toHaveLength(0);
  });
});
