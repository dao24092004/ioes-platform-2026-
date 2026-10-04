/** Wave 2 - Unit: DiscussionsPage (ComingSoon wrapper, student-owned). */
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { createElement } from 'react';

vi.mock('@/components/layout/StudentLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'mock-layout' }, children),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && 'returnObjects' in opts && opts.returnObjects === true) {
        return ['d-1'];
      }
      return key;
    },
    i18n: { language: 'vi' },
  }),
}));

import DiscussionsPage from '@/pages/student/DiscussionsPage';

describe('DiscussionsPage', () => {
  it('UT-DISCUSS-005: should not render any thread-list affordances', () => {
    const html = renderToString(createElement(DiscussionsPage));
    expect(html).not.toMatch(/<form\b/);
    expect(html).not.toMatch(/<textarea\b/);
  });

  it('UT-DISCUSS-006: should render the badge label', () => {
    const html = renderToString(createElement(DiscussionsPage));
    expect(html).toContain('comingSoon.badge');
  });

  it('UT-DISCUSS-007: should declare the page is "noFakeData"', () => {
    const html = renderToString(createElement(DiscussionsPage));
    expect(html).toContain('comingSoon.noFakeData');
  });

  it('UT-DISCUSS-008: should declare missing backend requirements', () => {
    const html = renderToString(createElement(DiscussionsPage));
    expect(html).toContain('comingSoon.missingHeading');
  });
});
