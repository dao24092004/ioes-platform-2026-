/** Wave 4 (admin) — Unit: i18n contract of the AdminLayout sidebar shell. */
import { describe, it, expect } from 'vitest';
import viJson from '@/locales/vi/common.json';
import enJson from '@/locales/en/common.json';

/**
 * The 16 `admin.nav.*` keys AdminLayout reads, in the order the nav lists them,
 * with the `to` each one links to. The paths are duplicated here on purpose:
 * if a nav item is ever re-pointed, this table is the place that has to change
 * with it, and the integration test asserts the hrefs actually rendered.
 */
const NAV_ITEMS: Array<{ key: string; path: string }> = [
  { key: 'admin.nav.dashboard', path: '/admin' },
  { key: 'admin.nav.analytics', path: '/admin/analytics' },
  { key: 'admin.nav.users', path: '/admin/users' },
  { key: 'admin.nav.courses', path: '/admin/courses/approval' },
  { key: 'admin.nav.instructorApproval', path: '/admin/instructors/approval' },
  { key: 'admin.nav.exams', path: '/admin/exams' },
  { key: 'admin.nav.discussions', path: '/admin/discussions' },
  { key: 'admin.nav.blockchain', path: '/admin/blockchain' },
  { key: 'admin.nav.tenants', path: '/admin/tenants' },
  { key: 'admin.nav.heatmaps', path: '/admin/heatmaps' },
  { key: 'admin.nav.funnels', path: '/admin/funnels' },
  { key: 'admin.nav.wallet', path: '/admin/wallet' },
  { key: 'admin.nav.security', path: '/admin/security' },
  { key: 'admin.nav.auditLog', path: '/admin/audit-log' },
  { key: 'admin.nav.notifications', path: '/admin/notifications' },
  { key: 'admin.nav.settings', path: '/admin/settings' },
];

/** The 5 section headings the nav groups the items under. */
const NAV_SECTIONS = [
  'admin.nav.overview',
  'admin.nav.management',
  'admin.nav.tenantsSection',
  'admin.nav.analytics',
  'admin.nav.system',
];

/** Keys the header controls read: the theme toggle and the logout control. */
const HEADER_KEYS = ['header.toggleTheme', 'header.logout'];

/** Both shipped bundles, tagged with the locale name for assertion messages. */
const LOCALES = [
  ['vi', viJson],
  ['en', enJson],
] as const;

/** Resolve a dotted i18n key against a bundle, exactly as i18next would. */
function lookup(bundle: unknown, dottedKey: string): unknown {
  return dottedKey.split('.').reduce<unknown>((node, part) => {
    if (node === null || typeof node !== 'object') return undefined;
    return (node as Record<string, unknown>)[part];
  }, bundle);
}

/** The labels the sidebar actually shows, in render order. */
const labelsIn = (bundle: unknown): string[] =>
  NAV_ITEMS.map(({ key }) => lookup(bundle, key) as string);

describe('AdminLayout nav copy — Vietnamese default bundle', () => {
  it('UT-ADMSHELL-001: should resolve all 20 admin.nav keys to a non-empty string in vi', () => {
    // 16 item labels + 5 section headings, minus `admin.nav.analytics` which
    // AdminLayout uses for both a section heading and an item label.
    const keys = [...new Set([...NAV_ITEMS.map((i) => i.key), ...NAV_SECTIONS])];
    expect(keys).toHaveLength(20);
    for (const key of keys) {
      const value = lookup(viJson, key);
      expect(value, `vi ${key}`).toBeTypeOf('string');
      expect((value as string).trim(), `vi ${key}`).not.toBe('');
    }
  });

  it('UT-ADMSHELL-002: should resolve all 20 admin.nav keys to a non-empty string in en', () => {
    const keys = [...new Set([...NAV_ITEMS.map((i) => i.key), ...NAV_SECTIONS])];
    for (const key of keys) {
      const value = lookup(enJson, key);
      expect(value, `en ${key}`).toBeTypeOf('string');
      expect((value as string).trim(), `en ${key}`).not.toBe('');
    }
  });

  it('UT-ADMSHELL-003: should keep the vi and en admin.nav key sets identical', () => {
    // Asymmetry means one language prints a raw key in the sidebar.
    const viKeys = Object.keys(lookup(viJson, 'admin.nav') as object).sort();
    const enKeys = Object.keys(lookup(enJson, 'admin.nav') as object).sort();
    expect(enKeys).toEqual(viKeys);
  });

  it('UT-ADMSHELL-004: should keep the 16 nav item labels pairwise distinct in vi', () => {
    expect(new Set(labelsIn(viJson)).size).toBe(NAV_ITEMS.length);
  });

  it('UT-ADMSHELL-005: should keep the 16 nav item labels pairwise distinct in en', () => {
    expect(new Set(labelsIn(enJson)).size).toBe(NAV_ITEMS.length);
  });
});

describe('AdminLayout nav copy — section headings', () => {
  it('UT-ADMSHELL-006: should keep the 5 section headings non-empty and pairwise distinct in both locales', () => {
    for (const [locale, bundle] of LOCALES) {
      const headings = NAV_SECTIONS.map((key) => lookup(bundle, key) as string);
      expect(headings, locale).toHaveLength(5);
      expect(new Set(headings).size, locale).toBe(NAV_SECTIONS.length);
    }
  });

  it('UT-ADMSHELL-007: should keep every nav label and section heading free of unresolved {{placeholders}}', () => {
    // AdminLayout passes no interpolation values, so a leftover `{{token}}`
    // would be printed literally in the sidebar.
    const keys = [...new Set([...NAV_ITEMS.map((i) => i.key), ...NAV_SECTIONS])];
    for (const [locale, bundle] of LOCALES) {
      for (const key of keys) {
        expect(lookup(bundle, key) as string, `${locale} ${key}`).not.toMatch(/\{\{/);
      }
    }
  });
});

describe('AdminLayout role label — the admin.role.superAdmin / admin.role.admin ternary', () => {
  it('UT-ADMSHELL-008: should give both role labels a non-empty string that differs from each other', () => {
    for (const [locale, bundle] of LOCALES) {
      const admin = lookup(bundle, 'admin.role.admin') as string;
      const superAdmin = lookup(bundle, 'admin.role.superAdmin') as string;
      expect(admin.trim(), `${locale} admin.role.admin`).not.toBe('');
      expect(superAdmin.trim(), `${locale} admin.role.superAdmin`).not.toBe('');
      expect(superAdmin, `${locale} superAdmin vs admin`).not.toBe(admin);
    }
  });

  it('UT-ADMSHELL-009: should spell both role labels so a bilingual assertion can recognise them', () => {
    // The shared admin test account may be `admin` or `super_admin`, and the
    // app ships Vietnamese by default, so both labels have to be readable
    // without knowing the locale in advance.
    for (const [locale, bundle] of LOCALES) {
      expect(lookup(bundle, 'admin.role.admin') as string, `${locale} admin`).toMatch(
        /quản trị|admin/i
      );
      expect(lookup(bundle, 'admin.role.superAdmin') as string, `${locale} superAdmin`).toMatch(
        /super\s*admin/i
      );
    }
  });

  it('UT-ADMSHELL-010: should give the theme toggle and the logout control a translated title in both locales', () => {
    for (const key of HEADER_KEYS) {
      for (const [locale, bundle] of LOCALES) {
        const value = lookup(bundle, key);
        expect(value, `${locale} ${key}`).toBeTypeOf('string');
        expect((value as string).trim(), `${locale} ${key}`).not.toBe('');
      }
    }
  });
});
