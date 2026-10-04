/** Wave 4 (admin) — Unit: copy contract of the ten placeholder admin pages. */
import { describe, it, expect } from 'vitest';
import viJson from '@/locales/vi/common.json';
import enJson from '@/locales/en/common.json';

/** One `ComingSoon` payload as a page hands it over. */
interface FeatureCopy {
  /** i18n key of the page title, e.g. `admin.auditLog.title`. */
  titleKey: string;
  /** i18n key of the `admin.noBackend.<feature>` group. */
  group: string;
}

/**
 * The five admin placeholders whose description + missing list live under
 * `admin.noBackend.*` instead of `comingSoon.*` — each page's own JSDoc
 * points at the same key.
 */
const NO_BACKEND_FEATURES: FeatureCopy[] = [
  { titleKey: 'admin.auditLog.title', group: 'admin.noBackend.auditLog' },
  { titleKey: 'security.title', group: 'admin.noBackend.security' },
  { titleKey: 'admin.funnels.title', group: 'admin.noBackend.funnels' },
  { titleKey: 'admin.heatmaps.title', group: 'admin.noBackend.heatmaps' },
  { titleKey: 'admin.instructorApproval.title', group: 'admin.noBackend.instructorApproval' },
];

/** Both shipped bundles, tagged with the locale name for assertion messages. */
const LOCALES = [
  ['vi', viJson],
  ['en', enJson],
] as const;

/**
 * Resolve a dotted i18n key against a bundle, exactly as i18next would. A miss
 * here means the admin would see the key itself on screen.
 */
function lookup(bundle: unknown, dottedKey: string): unknown {
  return dottedKey.split('.').reduce<unknown>((node, part) => {
    if (node === null || typeof node !== 'object') return undefined;
    return (node as Record<string, unknown>)[part];
  }, bundle);
}

describe('admin.noBackend feature copy — the ComingSoon payload of five admin pages', () => {
  it('UT-ADMCAV-001: should give all five admin.noBackend groups a non-empty description in both locales', () => {
    for (const { group } of NO_BACKEND_FEATURES) {
      for (const [locale, bundle] of LOCALES) {
        const description = lookup(bundle, `${group}.description`);
        expect(description, `${locale} ${group}.description`).toBeTypeOf('string');
        expect((description as string).trim(), `${locale} ${group}.description`).not.toBe('');
      }
    }
  });

  it('UT-ADMCAV-002: should give all five admin.noBackend groups a non-empty missing string array in both locales', () => {
    for (const { group } of NO_BACKEND_FEATURES) {
      for (const [locale, bundle] of LOCALES) {
        const missing = lookup(bundle, `${group}.missing`);
        // `ComingSoon` calls `missing.map(...)`, so anything but an array here
        // is a runtime crash, not a cosmetic gap.
        expect(Array.isArray(missing), `${locale} ${group}.missing`).toBe(true);
        for (const item of missing as string[]) {
          expect(item, `${locale} ${group}.missing`).toBeTypeOf('string');
          expect(item.trim(), `${locale} ${group}.missing`).not.toBe('');
        }
      }
    }
  });

  it('UT-ADMCAV-003: should resolve all five page title keys to a non-empty string in both locales', () => {
    for (const { titleKey } of NO_BACKEND_FEATURES) {
      for (const [locale, bundle] of LOCALES) {
        const title = lookup(bundle, titleKey);
        expect(title, `${locale} ${titleKey}`).toBeTypeOf('string');
        expect((title as string).trim(), `${locale} ${titleKey}`).not.toBe('');
      }
    }
  });

  it('UT-ADMCAV-004: should hold exactly the five admin.noBackend groups the placeholder pages read', () => {
    // A sixth orphan group means a page was removed without its copy; a missing
    // group means one of the five pages renders the raw key.
    for (const [locale, bundle] of LOCALES) {
      const groups = Object.keys(
        (lookup(bundle, 'admin.noBackend') as Record<string, unknown>) ?? {}
      ).sort();
      expect(groups, locale).toEqual([
        'auditLog',
        'funnels',
        'heatmaps',
        'instructorApproval',
        'security',
      ]);
    }
  });

  it('UT-ADMCAV-005: should give the five groups the same key shape in vi and en', () => {
    // Key-shape parity is what stops a language switch from falling back to
    // the raw key for one of the three ComingSoon props.
    for (const { group } of NO_BACKEND_FEATURES) {
      const viGroup = lookup(viJson, group) as Record<string, unknown>;
      const enGroup = lookup(enJson, group) as Record<string, unknown>;
      expect(Object.keys(enGroup).sort(), group).toEqual(Object.keys(viGroup).sort());
    }
  });

  it('UT-ADMCAV-006: should translate the five groups rather than copy the Vietnamese strings', () => {
    for (const { group } of NO_BACKEND_FEATURES) {
      const viGroup = lookup(viJson, group) as { description: string; missing: string[] };
      const enGroup = lookup(enJson, group) as { description: string; missing: string[] };
      expect(enGroup.description, group).not.toBe(viGroup.description);
      expect(enGroup.missing, group).not.toEqual(viGroup.missing);
    }
  });

  it('UT-ADMCAV-007: should keep the five descriptions pairwise distinct in both locales', () => {
    for (const [locale, bundle] of LOCALES) {
      const descriptions = NO_BACKEND_FEATURES.map(
        ({ group }) => lookup(bundle, `${group}.description`) as string
      );
      expect(new Set(descriptions).size, `${locale} descriptions`).toBe(NO_BACKEND_FEATURES.length);
    }
  });

  it('UT-ADMCAV-008: should keep every missing bullet unique inside its own group', () => {
    // `ComingSoon` keys each <li> by the item text, so a duplicated bullet
    // makes React warn about duplicate keys and drop a row.
    for (const { group } of NO_BACKEND_FEATURES) {
      for (const [locale, bundle] of LOCALES) {
        const missing = lookup(bundle, `${group}.missing`) as string[];
        expect(new Set(missing).size, `${locale} ${group}.missing`).toBe(missing.length);
      }
    }
  });

  it('UT-ADMCAV-009: should list at least two things that are still missing in every group', () => {
    // One bullet cannot say what is absent; every page's JSDoc promises a list
    // explaining the gap.
    for (const { group } of NO_BACKEND_FEATURES) {
      for (const [locale, bundle] of LOCALES) {
        expect(
          (lookup(bundle, `${group}.missing`) as string[]).length,
          `${locale} ${group}`
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('UT-ADMCAV-010: should keep the five page titles pairwise distinct in both locales', () => {
    for (const [locale, bundle] of LOCALES) {
      const titles = NO_BACKEND_FEATURES.map(({ titleKey }) => lookup(bundle, titleKey) as string);
      expect(new Set(titles).size, `${locale} titles`).toBe(NO_BACKEND_FEATURES.length);
    }
  });

  it('UT-ADMCAV-011: should read the top-level security.title and have no admin.security.title', () => {
    // Pinned because a namespace slip is invisible here and only shows up as a
    // raw key on the /admin/security page.
    expect(lookup(viJson, 'security.title')).toBeTypeOf('string');
    expect(lookup(enJson, 'security.title')).toBeTypeOf('string');
    expect(lookup(viJson, 'admin.security.title'), 'admin.security.title').toBeUndefined();
  });

  it('UT-ADMCAV-012: should translate the ComingSoon chrome the admin pages rely on in both locales', () => {
    for (const key of ['comingSoon.badge', 'comingSoon.missingHeading', 'comingSoon.noFakeData']) {
      for (const [locale, bundle] of LOCALES) {
        const value = lookup(bundle, key);
        expect(value, `${locale} ${key}`).toBeTypeOf('string');
        expect((value as string).trim(), `${locale} ${key}`).not.toBe('');
      }
    }
  });
});
