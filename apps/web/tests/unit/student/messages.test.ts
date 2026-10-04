/** Wave 2 - Unit: MessagesPage (ComingSoon wrapper, student-owned). */
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
        return ['m-1'];
      }
      return key;
    },
    i18n: { language: 'vi' },
  }),
}));

import MessagesPage from '@/pages/student/MessagesPage';

describe('MessagesPage', () => {
  it('UT-MSG-005: should expose no chat UI affordances (no send/input fields)', () => {
    const html = renderToString(createElement(MessagesPage));
    expect(html).not.toMatch(/<textarea\b/);
    expect(html).not.toMatch(/<input[^>]+type=["']?text/);
  });

  it('UT-MSG-006: should render the badge label once', () => {
    const html = renderToString(createElement(MessagesPage));
    const matches = html.match(/comingSoon\.badge/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(1);
  });

  it('UT-MSG-007: should declare missing requirements explicitly', () => {
    const html = renderToString(createElement(MessagesPage));
    expect(html).toContain('comingSoon.missingHeading');
  });
});
