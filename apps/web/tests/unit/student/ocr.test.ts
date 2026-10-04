/** Wave 2 - Unit: ComingSoon rendering contract for student pages */
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { createElement } from 'react';

vi.mock('@/components/layout/StudentLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'mock-layout' }, children),
}));

// Mock useTranslation so each page pulls the documented i18n keys verbatim.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      // Render arrays for `missing` keys (ComingSoon treats them as string[])
      if (opts && 'returnObjects' in opts && opts.returnObjects === true) {
        return ['item-1', 'item-2'];
      }
      return key;
    },
    i18n: { language: 'vi' },
  }),
}));

import OCRPage from '@/pages/student/OCRPage';
import SpeechToTextPage from '@/pages/student/SpeechToTextPage';
import MessagesPage from '@/pages/student/MessagesPage';
import DiscussionsPage from '@/pages/student/DiscussionsPage';

describe('OCRPage (ComingSoon wrapper)', () => {
  it('UT-OCR-001: should render with the documented comingSoon.ocr i18n keys', () => {
    const html = renderToString(createElement(OCRPage));
    expect(html).toContain('comingSoon.ocr.title');
    expect(html).toContain('comingSoon.ocr.description');
    expect(html).toContain('comingSoon.badge');
  });

  it('UT-OCR-002: should request the missing list with returnObjects=true', () => {
    renderToString(createElement(OCRPage));
    // ComingSoon reads missing via t('comingSoon.ocr.missing', { returnObjects: true }).
    // We can only inspect via the rendered markup that the array got through.
    // (Mock returns the array as-is; component renders a list with two items.)
    const html = renderToString(createElement(OCRPage));
    expect(html).toContain('item-1');
    expect(html).toContain('item-2');
  });

  it('UT-OCR-003: should declare the page is "noFakeData" (no mock data shown)', () => {
    const html = renderToString(createElement(OCRPage));
    expect(html).toContain('comingSoon.noFakeData');
  });

  it('UT-OCR-004: should not throw when rendered without a router context', () => {
    // StudentLayout is mocked, but no router is required for SSR.
    expect(() => renderToString(createElement(OCRPage))).not.toThrow();
  });
});

describe('SpeechToTextPage (ComingSoon wrapper)', () => {
  it('UT-STT-001: should render with the documented examApi.comingSoon.speechToText i18n keys', () => {
    const html = renderToString(createElement(SpeechToTextPage));
    expect(html).toContain('examApi.comingSoon.speechToText.title');
    expect(html).toContain('examApi.comingSoon.speechToText.description');
    expect(html).toContain('comingSoon.badge');
  });

  it('UT-STT-002: should request the missing list with returnObjects=true', () => {
    const html = renderToString(createElement(SpeechToTextPage));
    expect(html).toContain('item-1');
  });

  it('UT-STT-003: should not throw when rendered without a router context', () => {
    expect(() => renderToString(createElement(SpeechToTextPage))).not.toThrow();
  });
});

describe('MessagesPage (ComingSoon wrapper)', () => {
  it('UT-MSG-001: should render with the documented comingSoon.messages i18n keys', () => {
    const html = renderToString(createElement(MessagesPage));
    expect(html).toContain('comingSoon.messages.title');
    expect(html).toContain('comingSoon.messages.description');
    expect(html).toContain('comingSoon.badge');
  });

  it('UT-MSG-002: should request the missing list with returnObjects=true', () => {
    const html = renderToString(createElement(MessagesPage));
    expect(html).toContain('item-1');
  });

  it('UT-MSG-003: should not throw when rendered without a router context', () => {
    expect(() => renderToString(createElement(MessagesPage))).not.toThrow();
  });

  it('UT-MSG-004: should declare the page is "noFakeData" (no mock data shown)', () => {
    const html = renderToString(createElement(MessagesPage));
    expect(html).toContain('comingSoon.noFakeData');
  });
});

describe('DiscussionsPage (ComingSoon wrapper)', () => {
  it('UT-DISCUSS-001: should render with the documented comingSoon.discussion i18n keys', () => {
    const html = renderToString(createElement(DiscussionsPage));
    expect(html).toContain('comingSoon.discussion.title');
    expect(html).toContain('comingSoon.discussion.description');
    expect(html).toContain('comingSoon.badge');
  });

  it('UT-DISCUSS-002: should request the missing list with returnObjects=true', () => {
    const html = renderToString(createElement(DiscussionsPage));
    expect(html).toContain('item-1');
  });

  it('UT-DISCUSS-003: should declare the page is "noFakeData" (no mock data shown)', () => {
    const html = renderToString(createElement(DiscussionsPage));
    expect(html).toContain('comingSoon.noFakeData');
  });

  it('UT-DISCUSS-004: should not throw when rendered without a router context', () => {
    expect(() => renderToString(createElement(DiscussionsPage))).not.toThrow();
  });
});
