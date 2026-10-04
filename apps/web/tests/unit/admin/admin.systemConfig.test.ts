/** Wave 4B (admin) — Unit: SystemConfigPage (`/admin/settings`). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import viCommon from '@/locales/vi/common.json';
import enCommon from '@/locales/en/common.json';

type Json = Record<string, unknown>;

const vi = viCommon as Json;
const en = enCommon as Json;

const resolve = (root: Json, key: string): unknown =>
  key.split('.').reduce<unknown>((acc, part) => (acc as Json | undefined)?.[part], root);

/** Every `t('…')` key the page's Security panel heading falls back from. */
const SYSTEM_CONFIG_KEYS = [
  'systemConfig.sections.general',
  'systemConfig.sections.security',
  'systemConfig.sections.exam',
  'systemConfig.sections.notification',
  'systemConfig.sections.blockchain',
  'systemConfig.sections.backup',
  'systemConfig.general.platformName',
  'systemConfig.general.tagline',
  'systemConfig.general.supportEmail',
  'systemConfig.general.defaultLang',
  'systemConfig.general.timezone',
  'systemConfig.general.maintenance',
  'systemConfig.security.passwordPolicy',
  'systemConfig.security.minLength',
  'systemConfig.security.requireUppercase',
  'systemConfig.security.requireNumber',
  'systemConfig.security.requireSpecial',
  'systemConfig.security.sessionTimeout',
  'systemConfig.security.mfaRequired',
  'systemConfig.security.loginThrottle',
  'systemConfig.exam.defaultDuration',
  'systemConfig.exam.maxQuestions',
  'systemConfig.exam.gradingScale',
  'systemConfig.exam.enableProctoring',
  'systemConfig.exam.shuffleQuestions',
  'systemConfig.exam.antiCheat',
  'systemConfig.notification.emailChannel',
  'systemConfig.notification.pushChannel',
  'systemConfig.notification.smsChannel',
  'systemConfig.notification.newUserAlert',
  'systemConfig.notification.courseSubmittedAlert',
  'systemConfig.notification.examGradedAlert',
  'systemConfig.blockchain.network',
  'systemConfig.blockchain.contracts',
  'systemConfig.blockchain.tokenSymbol',
  'systemConfig.blockchain.mintPerExam',
  'systemConfig.backup.autoBackup',
  'systemConfig.backup.retentionDays',
  'systemConfig.backup.targetStorage',
  'systemConfig.backup.runBackupNow',
  'systemConfig.savedAt',
] as const;

const ARIA_KEYS = [
  'aria.saveConfig',
  'aria.runBackup',
  'aria.selectLanguage',
  'aria.selectTimezone',
  'aria.selectStorage',
] as const;

const SHARED_KEYS = [
  'shared.language.vi',
  'shared.language.en',
  'shared.timezone.hn',
  'shared.timezone.bkk',
  'shared.timezone.sg',
  'shared.timezone.utc',
  'shared.storage.s3',
  'shared.storage.gcs',
  'shared.storage.azure',
  'shared.storage.nas',
  'common.save',
  'common.loading',
] as const;

const PAGE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'src',
  'pages',
  'admin',
  'SystemConfigPage.tsx'
);
const PAGE_SOURCE = readFileSync(PAGE_PATH, 'utf8');

describe('SystemConfigPage — translation-key contract', () => {
  it('UT-ADMCONFIG-001: should resolve every systemConfig.* key the page renders in the Vietnamese locale', () => {
    const missing = SYSTEM_CONFIG_KEYS.filter((key) => {
      const value = resolve(vi, key);
      return typeof value !== 'string' || value.length === 0;
    });

    expect(missing).toEqual([]);
  });

  it('UT-ADMCONFIG-002: should resolve every systemConfig.* key the page renders in the English locale', () => {
    const missing = SYSTEM_CONFIG_KEYS.filter((key) => {
      const value = resolve(en, key);
      return typeof value !== 'string' || value.length === 0;
    });

    expect(missing).toEqual([]);
  });

  it('UT-ADMCONFIG-003: should resolve every aria.* key the page puts on a control in both locales', () => {
    const missing = ARIA_KEYS.filter(
      (key) => typeof resolve(vi, key) !== 'string' || typeof resolve(en, key) !== 'string'
    );

    expect(missing).toEqual([]);
  });

  it('UT-ADMCONFIG-004: should resolve every shared.*/common.* option label the page renders in both locales', () => {
    const missing = SHARED_KEYS.filter(
      (key) => typeof resolve(vi, key) !== 'string' || typeof resolve(en, key) !== 'string'
    );

    expect(missing).toEqual([]);
  });

  it('UT-ADMCONFIG-005: should interpolate {{time}} in systemConfig.savedAt, the only parameterised string on the page', () => {
    for (const locale of [vi, en]) {
      const template = resolve(locale, 'systemConfig.savedAt');
      expect(typeof template).toBe('string');
      expect(template as string).toContain('{{time}}');
    }
  });

  it('UT-ADMCONFIG-006: should leave systemConfig.sections.system untranslated, which makes the "|| \'Phiên & MFA\'" fallback in the Security panel dead code', () => {
    // i18next returns the key itself for a missing key, which is a truthy
    // string, so the `||` branch never runs and the heading shows
    // "systemConfig.sections.system" to the admin. Recorded as an app bug
    // (SystemConfigPage.tsx:322) rather than worked around.
    expect(resolve(vi, 'systemConfig.sections.system')).toBeUndefined();
    expect(resolve(en, 'systemConfig.sections.system')).toBeUndefined();
    expect(PAGE_SOURCE).toContain("t('systemConfig.sections.system') || 'Phiên & MFA'");
  });
});

describe('SystemConfigPage — nothing is persisted', () => {
  it('UT-ADMCONFIG-007: should reach no storage API and no api module, so every field is React-local state', () => {
    expect(PAGE_SOURCE).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    expect(PAGE_SOURCE).not.toMatch(/apiClient|@\/services\/api|@\/config\/api\.config/);
    // Values live in `useState` only; the two timers just stamp `savedAt`.
    expect(PAGE_SOURCE).toContain('const [savedAt, setSavedAt] = useState<string | null>(null)');
  });
});
