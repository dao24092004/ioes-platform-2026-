/** Wave 2 — Integration: OCRPage (student-owned). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/app/store/authStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string | string[]> = {
        'comingSoon.badge': 'Coming soon',
        'comingSoon.missingHeading': 'What is missing',
        'comingSoon.noFakeData': 'No sample data here.',
        'comingSoon.ocr.title': 'Text recognition (OCR)',
        'comingSoon.ocr.description': 'Upload a photo of written work.',
        'comingSoon.ocr.missing': ['No OCR endpoint', 'No file upload API'],
        'student.nav.overview': 'Overview',
        'student.nav.tools': 'Tools',
        'student.nav.ocr': 'OCR',
        'shared.menu': 'Menu',
        'header.toggleTheme': 'Toggle theme',
        'header.notifications': 'Notifications',
        'header.logout': 'Logout',
        'sidebar.role.student': 'Student',
      };
      const result = map[key];
      if (Array.isArray(result)) return result;
      if (typeof result === 'string') return result;
      if (opts && 'returnObjects' in opts && opts.returnObjects === true) {
        return ['item-1', 'item-2'];
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

if (typeof globalThis.IntersectionObserver === 'undefined') {
  (
    globalThis as unknown as { IntersectionObserver: new () => IntersectionObserver }
  ).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds: number[] = [];
    scrollMargin = '';
  };
}

import OCRPage from '@/pages/student/OCRPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/ocr']}>
        <OCRPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: 'u-1',
      email: 's@ioes.com',
      full_name: 'Student',
      role: 'student',
      avatar_url: null,
    },
    accessToken: 't',
    refreshToken: 'r',
    isAuthenticated: true,
    isLoading: false,
  });
});

describe('OCRPage — ComingSoon wrapper', () => {
  it('IT-OCR-001: should_renderTitleAndDescription_When_Mounted', async () => {
    renderPage();
    await waitFor(() => {
      // page title appears twice: in StudentLayout header and in ComingSoon h1
      expect(screen.getAllByText(/Text recognition \(OCR\)/i).length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText(/Upload a photo of written work/i)).toBeInTheDocument();
  });

  it('IT-OCR-002: should_renderMissingList_When_BackendNotReady', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/What is missing/i)).toBeInTheDocument();
    });
    // items come from i18n mock above
    expect(screen.getByText('No OCR endpoint')).toBeInTheDocument();
    expect(screen.getByText('No file upload API')).toBeInTheDocument();
  });

  it('IT-OCR-003: should_notInvokeMediaDevicesAtRenderTime', () => {
    const original = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      get: () => {
        throw new Error('mediaDevices should not be accessed by OCRPage');
      },
    });
    try {
      expect(() => renderPage()).not.toThrow();
    } finally {
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: original });
    }
  });
});
