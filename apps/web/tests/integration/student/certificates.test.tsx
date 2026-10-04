/** Wave 2C (student) — Integration: CertificatesPage (2 tests) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { returnObjects?: boolean }) => {
      const map: Record<string, string | string[]> = {
        'comingSoon.badge': 'Coming soon',
        'comingSoon.missingHeading': 'What is missing',
        'comingSoon.noFakeData': 'This page shows no sample data.',
        'comingSoon.blockchain.title': 'Blockchain certificates',
        'comingSoon.blockchain.description': 'Issue and verify certificates on-chain.',
        'comingSoon.blockchain.missing': [
          'No wallet-service',
          'No issuer key',
          'No revocation list',
        ],
      };
      const result = map[key];
      if (opts?.returnObjects && Array.isArray(result)) return result;
      return (result as string) ?? key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

if (typeof globalThis.IntersectionObserver === 'undefined') {
  (
    globalThis as unknown as { IntersectionObserver: new () => IntersectionObserver }
  ).IntersectionObserver = class MockIntersectionObserver {
    observe = () => undefined;
    unobserve = () => undefined;
    disconnect = () => undefined;
    takeRecords = () => [];
    root = null;
    rootMargin = '';
    thresholds = [];
    scrollMargin = '';
  };
}

import { useAuthStore } from '@/app/store/authStore';
import CertificatesPage from '@/pages/student/CertificatesPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderPage(initialEntries: string[] = ['/student/certificates']) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <CertificatesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function seedStudent(): void {
  useAuthStore.setState({
    user: {
      id: 'u1',
      email: 's@ioes.com',
      full_name: 'Student One',
      role: 'student',
      avatar_url: null,
    },
    accessToken: 'student-token',
    refreshToken: null,
    isAuthenticated: true,
    isLoading: false,
  });
}

describe('IT-CERT-001: CertificatesPage renders the blockchain ComingSoon (title, description, missing array)', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
  });

  it('should render the title (h1), description, every missing item, and the badge', async () => {
    renderPage();
    await waitFor(() => {
      // Description text is unique to ComingSoon; use it as the wait signal.
      expect(screen.getByText('Issue and verify certificates on-chain.')).toBeInTheDocument();
    });
    // StudentLayout header h1 + ComingSoon h1 both render the title.
    expect(
      screen.getAllByRole('heading', { name: 'Blockchain certificates' }).length
    ).toBeGreaterThanOrEqual(1);
    // Every i18n missing item is rendered.
    expect(screen.getByText('No wallet-service')).toBeInTheDocument();
    expect(screen.getByText('No issuer key')).toBeInTheDocument();
    expect(screen.getByText('No revocation list')).toBeInTheDocument();
    // Badge text from the ComingSoon component.
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });
});

describe('IT-CERT-002: CertificatesPage renders inside StudentLayout (sidebar + IOES link visible)', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
  });

  it('should render the StudentLayout sidebar with the IOES link and a <nav>', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Issue and verify certificates on-chain.')).toBeInTheDocument();
    });
    const links = screen.getAllByRole('link', { name: /IOES/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    const navs = screen.getAllByRole('navigation');
    expect(navs.length).toBeGreaterThanOrEqual(1);
  });
});
