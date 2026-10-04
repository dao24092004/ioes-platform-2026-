/** Wave 3D — Unit: copyright page copy contract for /instructor/copyright. */
import { describe, it, expect } from 'vitest';
import vi from '@/locales/vi/common.json';
import en from '@/locales/en/common.json';

const viGroup = vi.comingSoon.copyright;
const enGroup = en.comingSoon.copyright;

describe('comingSoon.copyright resources', () => {
  it('UT-ICOPYRIGHT-001: should provide a non-empty title and description in both locales', () => {
    for (const [locale, group] of [
      ['vi', viGroup],
      ['en', enGroup],
    ] as const) {
      expect(group.title, `${locale}.title`).toBeTypeOf('string');
      expect(group.title.trim(), `${locale}.title`).not.toBe('');
      expect(group.description, `${locale}.description`).toBeTypeOf('string');
      expect(group.description.trim(), `${locale}.description`).not.toBe('');
    }
  });

  it('UT-ICOPYRIGHT-002: should provide a non-empty missing-items string array in both locales', () => {
    for (const [locale, group] of [
      ['vi', viGroup],
      ['en', enGroup],
    ] as const) {
      expect(Array.isArray(group.missing), locale).toBe(true);
      expect(group.missing.length, locale).toBeGreaterThan(0);
      for (const item of group.missing) {
        expect(item, locale).toBeTypeOf('string');
        expect(item.trim(), locale).not.toBe('');
      }
    }
  });

  it('UT-ICOPYRIGHT-003: should be translated, not copied, between the vi and en bundles', () => {
    expect(Object.keys(enGroup).sort()).toEqual(Object.keys(viGroup).sort());
    expect(enGroup.title).not.toBe(viGroup.title);
    expect(enGroup.description).not.toBe(viGroup.description);
    expect(enGroup.missing).not.toEqual(viGroup.missing);
  });
});
