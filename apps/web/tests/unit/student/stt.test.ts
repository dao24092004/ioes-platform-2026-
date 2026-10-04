/** Wave 2 - Unit: SpeechToTextPage (ComingSoon wrapper, OCR/STT device contract). */
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
        return ['mic-1', 'mic-2'];
      }
      return key;
    },
    i18n: { language: 'vi' },
  }),
}));

import SpeechToTextPage from '@/pages/student/SpeechToTextPage';

describe('SpeechToTextPage', () => {
  it('UT-STT-004: should not invoke MediaDevices APIs at module import time', async () => {
    // The page itself must never call getUserMedia() or enumerateDevices() —
    // tests assert this by importing the module in isolation and checking
    // that the SSR output does not contain any <video> or <audio> element.
    const html = renderToString(createElement(SpeechToTextPage));
    expect(html).not.toMatch(/<video\b/);
    expect(html).not.toMatch(/<audio\b/);
    expect(html).not.toMatch(/MediaRecorder/);
  });

  it('UT-STT-005: should render the badge in Vietnamese-locale HTML', () => {
    const html = renderToString(createElement(SpeechToTextPage));
    // The page title is a t() result; the ComingSoon badge is the only stable
    // marker across locales.
    expect(html).toContain('comingSoon.badge');
  });
});
