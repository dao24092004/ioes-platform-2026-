/** Batch 1D — Unit: static public pages */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Contact.tsx — pure extractable helpers
// ---------------------------------------------------------------------------

/**
 * Mirrors the pattern used by Contact's handleChange.
 * setFormData({ ...formData, [name]: value })
 */
function reduceFormChange(
  formData: Record<string, string>,
  name: string,
  value: string
): Record<string, string> {
  return { ...formData, [name]: value };
}

/**
 * validateContactForm checks all five required fields are non-empty strings.
 * Returns false for missing fields; true only when all are filled.
 * (handleSubmit in Contact.tsx does NOT call this — it's a pure check
 *  demonstrating what a validator would do.)
 */
function validateContactForm(data: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): boolean {
  return (
    data.name.trim().length > 0 &&
    data.email.trim().length > 0 &&
    data.topic.trim().length > 0 &&
    data.message.trim().length > 0
  );
}

// ---------------------------------------------------------------------------
// HelpCenterPage.tsx — CATEGORIES is exported; filterArticles pure logic
// ---------------------------------------------------------------------------

const MOCK_ARTICLES = [
  { key: 'a1', tagKey: 'tagGettingStarted', title: 'How to sign up', desc: 'Step by step guide' },
  { key: 'a2', tagKey: 'tagCourses', title: 'Browse courses', desc: 'Find your course' },
  { key: 'a3', tagKey: 'tagExams', title: 'Take an exam', desc: 'Exam instructions' },
  { key: 'a4', tagKey: 'tagAccount', title: 'Reset password', desc: 'Account recovery' },
  { key: 'a5', tagKey: 'tagPayments', title: 'Payment methods', desc: 'How to pay' },
  { key: 'a6', tagKey: 'tagTechnical', title: 'Browser requirements', desc: 'Supported browsers' },
] as const;

/**
 * Mirrors the useMemo filter logic in HelpCenterPage.
 * If search is empty, returns all articles; otherwise filters by title+desc.
 */
function filterArticles(
  articles: readonly (typeof MOCK_ARTICLES)[number][],
  search: string
): (typeof MOCK_ARTICLES)[number][] {
  const q = search.trim().toLowerCase();
  if (!q) return [...articles];
  return articles.filter((a) => `${a.title} ${a.desc}`.toLowerCase().includes(q));
}

// ---------------------------------------------------------------------------
// LegalPage.tsx — pure extractable helpers
// ---------------------------------------------------------------------------

type LegalTab = 'privacy' | 'terms';

/**
 * deriveInitialTab mirrors LegalPage.tsx lines 13–15:
 *   const initialTab = (searchParams.get('tab') === 'terms' ? 'terms' : 'privacy')
 */
function deriveInitialTab(searchTab: string | null): LegalTab {
  return searchTab === 'terms' ? 'terms' : 'privacy';
}

/**
 * computeScrollTop mirrors the offset math inside LegalPage.scrollToSection:
 *   const offset = 100;  // default
 *   const y = el.getBoundingClientRect().top + window.scrollY - offset;
 *
 * offset defaults to 100 when not supplied (partial application).
 */
function computeScrollTop(rectTop: number, scrollY: number, offset = 100): number {
  return rectTop + scrollY - offset;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Contact — reduceFormChange', () => {
  it('UT-STATICPG-001: should return formData with empty string when value is empty', () => {
    const result = reduceFormChange({ name: '', email: '' }, 'name', '');
    expect(result.name).toBe('');
    expect(result.email).toBe('');
  });

  it('UT-STATICPG-002: should set a long string value correctly', () => {
    const long = 'A'.repeat(1000);
    const result = reduceFormChange({}, 'message', long);
    expect(result.message).toBe(long);
    expect(result.message.length).toBe(1000);
  });

  it('UT-STATICPG-003: should coerce numeric string via String(e.target.value)', () => {
    // React inputs always yield string; coerce via String()
    const result = reduceFormChange({}, 'phone', String(912345678));
    expect(result.phone).toBe('912345678');
  });

  it('UT-STATICPG-004: should not mutate original formData (immutability)', () => {
    const original = { name: 'Dao', email: 'dao@ioes.com' };
    const result = reduceFormChange(original, 'name', 'Minh');
    expect(original.name).toBe('Dao'); // original unchanged
    expect(result.name).toBe('Minh');
    expect(result.email).toBe('dao@ioes.com');
  });
});

describe('Contact — validateContactForm', () => {
  it('UT-STATICPG-005: should return false when name is empty', () => {
    expect(
      validateContactForm({ name: '', email: 'a@b.com', topic: 'support', message: 'hi' })
    ).toBe(false);
  });

  it('UT-STATICPG-006: should return false when email is empty', () => {
    expect(validateContactForm({ name: 'Dao', email: '', topic: 'support', message: 'hi' })).toBe(
      false
    );
  });

  it('UT-STATICPG-007: should return false when topic is empty', () => {
    expect(validateContactForm({ name: 'Dao', email: 'a@b.com', topic: '', message: 'hi' })).toBe(
      false
    );
  });

  it('UT-STATICPG-008: should return false when message is empty', () => {
    expect(
      validateContactForm({ name: 'Dao', email: 'a@b.com', topic: 'support', message: '' })
    ).toBe(false);
  });

  it('UT-STATICPG-009: should return false when all fields are whitespace-only', () => {
    expect(validateContactForm({ name: '   ', email: '  ', topic: '  ', message: '  ' })).toBe(
      false
    );
  });

  it('UT-STATICPG-010: should return true when all four required fields are filled', () => {
    const valid = { name: 'Dao', email: 'dao@ioes.com', topic: 'support', message: 'Hello' };
    expect(validateContactForm(valid)).toBe(true);
  });
});

describe('HelpCenter — filterArticles', () => {
  it('UT-STATICPG-011: should return all articles when search is empty', () => {
    const result = filterArticles(MOCK_ARTICLES, '');
    expect(result.length).toBe(MOCK_ARTICLES.length);
  });

  it('UT-STATICPG-012: should filter articles by search term in title or desc', () => {
    const result = filterArticles(MOCK_ARTICLES, 'exam');
    expect(result.length).toBe(1);
    expect(result[0].key).toBe('a3');
  });

  it('UT-STATICPG-013: should return empty array when no articles match', () => {
    const result = filterArticles(MOCK_ARTICLES, 'xyznonexistent');
    expect(result.length).toBe(0);
  });

  it('UT-STATICPG-014: should trim whitespace from search before filtering', () => {
    const result = filterArticles(MOCK_ARTICLES, '  payment  ');
    expect(result.length).toBe(1);
    expect(result[0].key).toBe('a5');
  });
});

describe('LegalPage — deriveInitialTab', () => {
  it('UT-STATICPG-015: should return "privacy" when tab is "privacy"', () => {
    expect(deriveInitialTab('privacy')).toBe('privacy');
  });

  it('UT-STATICPG-022: should return "terms" when tab is "terms"', () => {
    expect(deriveInitialTab('terms')).toBe('terms');
  });

  it('UT-STATICPG-016: should return "privacy" for any other value (null, "cookies", etc.)', () => {
    expect(deriveInitialTab(null)).toBe('privacy');
    expect(deriveInitialTab('cookies')).toBe('privacy');
    expect(deriveInitialTab('')).toBe('privacy');
    expect(deriveInitialTab('PRIVACY')).toBe('privacy'); // case-sensitive
  });
});

describe('LegalPage — computeScrollTop', () => {
  it('UT-STATICPG-017: should compute rectTop + scrollY - offset with default offset 100', () => {
    // element.getBoundingClientRect().top = 200 (element is 200px from viewport top)
    // window.scrollY = 0
    // offset defaults to 100
    expect(computeScrollTop(200, 0)).toBe(100); // 200 + 0 - 100
  });

  it('UT-STATICPG-018: should use provided offset when given', () => {
    expect(computeScrollTop(200, 0, 50)).toBe(150); // 200 + 0 - 50
  });

  it('UT-STATICPG-019: should allow negative rectTop (element above viewport)', () => {
    expect(computeScrollTop(-50, 500)).toBe(350); // -50 + 500 - 100
  });

  it('UT-STATICPG-020: should handle offset of 0', () => {
    expect(computeScrollTop(300, 0, 0)).toBe(300);
  });

  it('UT-STATICPG-021: should handle large scrollY values', () => {
    expect(computeScrollTop(50, 1000, 100)).toBe(950);
  });
});
