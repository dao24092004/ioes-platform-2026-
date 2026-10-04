/** Wave 3A (instructor) — Unit: ReportsPage (`/instructor/reports`). */
import { describe, it, expect } from 'vitest';

import viCommon from '@/locales/vi/common.json';
import enCommon from '@/locales/en/common.json';

type Bundle = Record<string, unknown>;

const MISSING_KEY = 'examApi.comingSoon.reports.missing';
const TITLE_KEY = 'examApi.comingSoon.reports.title';
const DESCRIPTION_KEY = 'examApi.comingSoon.reports.description';

/** Resolve a dotted i18next key the same way i18next does. */
const resolve = (bundle: Bundle, dottedKey: string): unknown =>
  dottedKey.split('.').reduce<unknown>((node, segment) => {
    if (node === null || typeof node !== 'object') return undefined;
    return (node as Bundle)[segment];
  }, bundle);

describe('ReportsPage i18n contract — the keys its ComingSoon wrapper casts to string[]', () => {
  it.each([
    { language: 'vi', bundle: viCommon as Bundle },
    { language: 'en', bundle: enCommon as Bundle },
  ])(
    'UT-IREPORTS-001: should resolve the missing-items key to a non-empty array of non-empty strings in $language',
    ({ bundle }) => {
      const missing = resolve(bundle, MISSING_KEY);

      expect(Array.isArray(missing)).toBe(true);
      expect(missing as unknown[]).not.toHaveLength(0);
      for (const item of missing as unknown[]) {
        expect(typeof item).toBe('string');
        expect((item as string).trim()).not.toBe('');
      }
    }
  );

  it('UT-IREPORTS-002: should resolve the title and description to non-empty strings in both vi and en', () => {
    for (const bundle of [viCommon as Bundle, enCommon as Bundle]) {
      const title = resolve(bundle, TITLE_KEY);
      const description = resolve(bundle, DESCRIPTION_KEY);

      expect(typeof title).toBe('string');
      expect((title as string).trim()).not.toBe('');
      expect(typeof description).toBe('string');
      expect((description as string).trim()).not.toBe('');
    }
  });

  it('UT-IREPORTS-003: should keep the vi and en missing-item lists the same length so both locales render the same block', () => {
    const viMissing = resolve(viCommon as Bundle, MISSING_KEY) as string[];
    const enMissing = resolve(enCommon as Bundle, MISSING_KEY) as string[];

    expect(viMissing).toHaveLength(enMissing.length);
  });
});
