/** Wave 2 — Integration: SpeechToTextPage (student-owned). */
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
        'comingSoon.noFakeData': 'No sample data.',
        'examApi.comingSoon.speechToText.title': 'Speech to text',
        'examApi.comingSoon.speechToText.description':
          'Record speech, transcribe it and score pronunciation.',
        'examApi.comingSoon.speechToText.missing': [
          'speech-service has only Dockerfile + pyproject',
          'No audio endpoint',
        ],
        'student.nav.overview': 'Overview',
        'student.nav.tools': 'Tools',
        'student.nav.speechToText': 'Speech',
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
        return ['m-1', 'm-2'];
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

import SpeechToTextPage from '@/pages/student/SpeechToTextPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/speech-to-text']}>
        <SpeechToTextPage />
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

describe('SpeechToTextPage — ComingSoon wrapper', () => {
  it('IT-STT-001: should_renderTitleAndDescription_When_Mounted', async () => {
    renderPage();
    await waitFor(() => {
      // page title appears twice: StudentLayout header + ComingSoon h1
      expect(screen.getAllByText(/Speech to text/i).length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText(/Record speech, transcribe/i)).toBeInTheDocument();
  });

  it('IT-STT-002: should_renderMissingItems_When_BackendNotReady', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/What is missing/i)).toBeInTheDocument();
    });
    // items come from i18n mock above
    expect(screen.getByText(/speech-service has only Dockerfile/i)).toBeInTheDocument();
    expect(screen.getByText(/No audio endpoint/i)).toBeInTheDocument();
  });

  it('IT-STT-003: should_notInvokeMediaDevicesOrMediaRecorderAtRenderTime', () => {
    const origDevices = navigator.mediaDevices;
    const origMediaRecorder = window.MediaRecorder;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      get: () => {
        throw new Error('mediaDevices must not be read at render time');
      },
    });
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      get: () => {
        throw new Error('MediaRecorder must not be read at render time');
      },
    });
    try {
      expect(() => renderPage()).not.toThrow();
    } finally {
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: origDevices });
      Object.defineProperty(window, 'MediaRecorder', {
        configurable: true,
        value: origMediaRecorder,
      });
    }
  });
});
