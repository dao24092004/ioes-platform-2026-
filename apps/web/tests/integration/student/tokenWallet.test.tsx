/** Wave 2C (student) — Integration: TokenWalletPage */
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
        'comingSoon.blockchain.title': 'Token wallet',
        'comingSoon.blockchain.description': 'Manage your IOES tokens.',
        'comingSoon.blockchain.missing': [
          'No wallet-service',
          'No token issuance',
          'No chain bridge',
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
import TokenWalletPage from '@/pages/student/TokenWalletPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderPage(initialEntries: string[] = ['/student/wallet']) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <TokenWalletPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function seedStudent() {
  useAuthStore.setState({
    user: {
      id: 'u-1',
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

describe('IT-WALLET-001: TokenWalletPage renders the blockchain ComingSoon inside StudentLayout', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
  });

  it('should render the Token wallet title and every missing item', async () => {
    renderPage();
    // StudentLayout header h1 + ComingSoon h1 both contain the title.
    // Assert via the description text which is unique to ComingSoon.
    await waitFor(() => {
      expect(screen.getByText('Manage your IOES tokens.')).toBeInTheDocument();
    });
    expect(screen.getAllByRole('heading', { name: 'Token wallet' }).length).toBeGreaterThanOrEqual(
      1
    );
    expect(screen.getByText('No wallet-service')).toBeInTheDocument();
    expect(screen.getByText('No token issuance')).toBeInTheDocument();
    expect(screen.getByText('No chain bridge')).toBeInTheDocument();
  });

  it('should render the StudentLayout sidebar with the IOES link', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Manage your IOES tokens.')).toBeInTheDocument();
    });
    const links = screen.getAllByRole('link', { name: /IOES/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
  });
});
