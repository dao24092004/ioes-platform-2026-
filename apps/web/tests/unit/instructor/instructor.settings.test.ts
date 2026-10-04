/** Wave 3D — Unit: settings copy contract for /instructor/settings. */
import { describe, it, expect } from 'vitest';
import vi from '@/locales/vi/common.json';
import en from '@/locales/en/common.json';

/** The five ids the page's `SECTIONS` constant iterates over. */
const SECTION_IDS = ['general', 'teaching', 'notifications', 'integrations', 'billing'];

const viSections = vi.instructor.settings.section as Record<string, string>;
const enSections = en.instructor.settings.section as Record<string, string>;

describe('instructor settings section labels', () => {
  it('UT-ISETTINGS-001: should carry a non-empty Vietnamese label for each of the five sections', () => {
    expect(Object.keys(viSections).sort()).toEqual([...SECTION_IDS].sort());
    for (const id of SECTION_IDS) {
      expect(viSections[id], id).toBeTypeOf('string');
      expect(viSections[id].trim(), id).not.toBe('');
    }
  });

  it('UT-ISETTINGS-002: should carry a non-empty English label for the same five sections', () => {
    expect(Object.keys(enSections).sort()).toEqual([...SECTION_IDS].sort());
    for (const id of SECTION_IDS) {
      expect(enSections[id], id).toBeTypeOf('string');
      expect(enSections[id].trim(), id).not.toBe('');
    }
    // Locale parity: an English visitor must never see a Vietnamese label.
    for (const id of SECTION_IDS) {
      expect(enSections[id], id).not.toBe(viSections[id]);
    }
  });
});

describe('instructor settings general-section copy', () => {
  it('UT-ISETTINGS-003: should carry the general title, the language label and the language note in both locales', () => {
    const viGeneral = vi.instructor.settings.general as Record<string, string>;
    const enGeneral = en.instructor.settings.general as Record<string, string>;
    const viNote = vi.examApi.settings.languageNote as string;
    const enNote = en.examApi.settings.languageNote as string;

    for (const [locale, general, note] of [
      ['vi', viGeneral, viNote],
      ['en', enGeneral, enNote],
    ] as const) {
      expect(general.title, `${locale}.title`).toBeTypeOf('string');
      expect(general.title.trim(), `${locale}.title`).not.toBe('');
      expect(general.language, `${locale}.language`).toBeTypeOf('string');
      expect(general.language.trim(), `${locale}.language`).not.toBe('');
      expect(note, `${locale}.languageNote`).toBeTypeOf('string');
      expect(note.trim(), `${locale}.languageNote`).not.toBe('');
    }
  });
});

describe('instructor settings ComingSoon payload', () => {
  it('UT-ISETTINGS-004: should provide a non-empty missing-items string array in both locales for the four non-general sections', () => {
    const viMissing = vi.examApi.comingSoon.settings.missing as string[];
    const enMissing = en.examApi.comingSoon.settings.missing as string[];

    for (const [locale, missing] of [
      ['vi', viMissing],
      ['en', enMissing],
    ] as const) {
      // `ComingSoon` renders the list only when `missing.length > 0` and maps
      // over it, so a non-array or an empty array would silently drop the box.
      expect(Array.isArray(missing), locale).toBe(true);
      expect(missing.length, locale).toBeGreaterThan(0);
      for (const item of missing) {
        expect(item, locale).toBeTypeOf('string');
        expect(item.trim(), locale).not.toBe('');
      }
    }
  });
});
