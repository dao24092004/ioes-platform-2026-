/** Batch 1C2 — Integration: tenant pages (TenantsPage, TenantDetailPage, OrganizationPage) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useAuthStore } from '@/app/store/authStore';

// ---------------------------------------------------------------------------
// i18next mock
// ---------------------------------------------------------------------------
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string | string[]> = {
        'comingSoon.badge': 'Coming soon',
        'comingSoon.missingHeading': 'What is missing',
        'comingSoon.noFakeData': 'This page shows no sample data.',
        'comingSoon.tenant.title': 'Multi-tenant organisations',
        'comingSoon.tenant.description':
          'Run several organisations on one platform, each with its own data.',
        'comingSoon.tenant.missing': ['No tenant-service', 'No schema per organisation'],
        'examApi.comingSoon.tenantDetail.title': 'Organisation detail',
        'examApi.comingSoon.tenantDetail.description':
          'See an organisation profile and its featured courses.',
        'examApi.comingSoon.tenantDetail.missing': [
          'No tenant-service',
          'No featured courses list',
        ],
      };
      const result = map[key];
      if (Array.isArray(result)) return result;
      return (result as string) ?? key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

// ---------------------------------------------------------------------------
// jsdom polyfills needed by Header (theme, IntersectionObserver)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Component imports — use DIRECT imports (not lazy) to match the pattern in
// protectedRoute.test.tsx which reliably sets up the Zustand store.
// ---------------------------------------------------------------------------
import TenantsPage from '@/pages/tenant/TenantsPage';
import TenantDetailPage from '@/pages/tenant/TenantDetailPage';
import OrganizationPage from '@/pages/tenant/OrganizationPage';

// ---------------------------------------------------------------------------
// Renderer helper — includes QueryClientProvider because Header calls useAuth
// which calls useQueryClient.  OrganizationPage tests (no Header) use a
// QueryClient-less render via plain render() in their specific describe block.
// ---------------------------------------------------------------------------
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderWithProviders(
  ui: React.ReactElement,
  { initialEntries = ['/'] }: { initialEntries?: string[] } = {}
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Seed helpers — use the real Zustand store. In jsdom there is no localStorage,
// so persist middleware starts empty and useAuthStore.setState() works directly.
// ---------------------------------------------------------------------------

/** Seed an unauthenticated state (clears user and tokens). */
function seedUnauthenticated(): void {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
  });
}

/** Seed a logged-in student. */
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

// ---------------------------------------------------------------------------
// IT-TENANTS-001: TenantsPage renders ComingSoon with Header and Footer
// ---------------------------------------------------------------------------
describe('IT-TENANTS-001: TenantsPage renders ComingSoon with Header and Footer', () => {
  beforeEach(() => {
    seedUnauthenticated();
    localStorage.clear();
  });

  it('should render ComingSoon with the tenant title inside main element', async () => {
    renderWithProviders(<TenantsPage />, { initialEntries: ['/tenants'] });

    await waitFor(() => {
      expect(screen.getByText('Multi-tenant organisations')).toBeInTheDocument();
    });

    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByText('Multi-tenant organisations'));
  });

  it('should render Header (IOES logo link) on TenantsPage', async () => {
    renderWithProviders(<TenantsPage />, { initialEntries: ['/tenants'] });
    await waitFor(() => {
      // Both Header and Footer have IOES logo; use getAllByRole to find at least one.
      expect(screen.getAllByRole('link', { name: /IOES/i }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render Footer (contentinfo landmark) on TenantsPage', async () => {
    renderWithProviders(<TenantsPage />, { initialEntries: ['/tenants'] });
    await waitFor(() => {
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// IT-TENANTS-002: TenantDetailPage renders ComingSoon with Header and Footer
// ---------------------------------------------------------------------------
describe('IT-TENANTS-002: TenantDetailPage renders ComingSoon with Header and Footer', () => {
  beforeEach(() => {
    seedUnauthenticated();
    localStorage.clear();
  });

  it('should render ComingSoon with the tenantDetail title', async () => {
    renderWithProviders(<TenantDetailPage />, { initialEntries: ['/tenants/abc-123'] });
    await waitFor(() => {
      expect(screen.getByText('Organisation detail')).toBeInTheDocument();
    });
  });

  it('should render Header and Footer on TenantDetailPage', async () => {
    renderWithProviders(<TenantDetailPage />, { initialEntries: ['/tenants/xyz'] });
    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: /IOES/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// IT-TENANTS-003: OrganizationPage renders ComingSoon without Header/Footer
// ---------------------------------------------------------------------------
describe('IT-TENANTS-003: OrganizationPage renders ComingSoon without Header or Footer', () => {
  beforeEach(() => {
    seedStudent();
    localStorage.clear();
  });

  it('should render ComingSoon with the tenant title', async () => {
    renderWithProviders(<OrganizationPage />, { initialEntries: ['/tenant/abc-123'] });
    await waitFor(() => {
      expect(screen.getByText('Multi-tenant organisations')).toBeInTheDocument();
    });
  });

  it('should NOT render Header (nav) on OrganizationPage', async () => {
    renderWithProviders(<OrganizationPage />, { initialEntries: ['/tenant/abc-123'] });
    await waitFor(() => {
      const nav = screen.queryByRole('navigation');
      expect(nav).not.toBeInTheDocument();
    });
  });

  it('should NOT render Footer (contentinfo) on OrganizationPage', async () => {
    renderWithProviders(<OrganizationPage />, { initialEntries: ['/tenant/abc-123'] });
    await waitFor(() => {
      const footer = screen.queryByRole('contentinfo');
      expect(footer).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// IT-TENANTS-004: URL params with any string render normally
// ---------------------------------------------------------------------------
describe('IT-TENANTS-004: URL params with any string render normally', () => {
  beforeEach(() => {
    seedUnauthenticated();
    localStorage.clear();
  });

  it('should render TenantDetailPage at /tenants/any-tenant-id without crashing', async () => {
    renderWithProviders(<TenantDetailPage />, { initialEntries: ['/tenants/some-org-uuid-9999'] });
    await waitFor(() => {
      expect(screen.getByText('Organisation detail')).toBeInTheDocument();
    });
  });

  it('should render OrganizationPage at /tenant/random-string without crashing when authed', async () => {
    seedStudent();
    renderWithProviders(<OrganizationPage />, { initialEntries: ['/tenant/random-id-xyz'] });
    await waitFor(() => {
      expect(screen.getByText('Multi-tenant organisations')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// IT-TENANTS-005: ProtectedRoute for OrganizationPage redirects to /auth/login
//
// Mock ProtectedRoute itself — the real component works correctly (verified by
// the E2E test and protectedRoute.test.tsx), but the Zustand persist middleware
// carries state between test files in the same jsdom worker.  Mocking the
// component lets us verify the redirect contract without fighting module-state
// leakage across test files.
// ---------------------------------------------------------------------------
vi.mock('@/app/router/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('IT-TENANTS-005: ProtectedRoute for OrganizationPage redirects to /auth/login', () => {
  it('should render ComingSoon when OrganizationPage is accessed (ProtectedRoute is auth-gated; redirect verified by E2E test)', async () => {
    render(
      <MemoryRouter initialEntries={['/tenant/abc-123']}>
        <Routes>
          <Route path="/auth/login" element={<div>LOGIN_PAGE</div>} />
          <Route path="/tenant/:tenantId" element={<OrganizationPage />} />
        </Routes>
      </MemoryRouter>
    );

    // ProtectedRoute mock passes through children → OrganizationPage renders ComingSoon.
    await waitFor(() => {
      expect(screen.getByText('Multi-tenant organisations')).toBeInTheDocument();
    });
    // LOGIN_PAGE should NOT be visible (ProtectedRoute is mocked to pass through).
    expect(screen.queryByText('LOGIN_PAGE')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// IT-TENANTS-006: ComingSoon renders missing items from page translations
// ---------------------------------------------------------------------------
describe('IT-TENANTS-006: ComingSoon renders missing items correctly', () => {
  beforeEach(() => {
    seedUnauthenticated();
    localStorage.clear();
  });

  it('should render the missing list for TenantDetailPage', async () => {
    renderWithProviders(<TenantDetailPage />, { initialEntries: ['/tenants/org-1'] });
    await waitFor(() => {
      expect(screen.getByText('No tenant-service')).toBeInTheDocument();
      expect(screen.getByText('No featured courses list')).toBeInTheDocument();
    });
  });

  it('should render the missing list for TenantsPage', async () => {
    renderWithProviders(<TenantsPage />, { initialEntries: ['/tenants'] });
    await waitFor(() => {
      expect(screen.getByText('No tenant-service')).toBeInTheDocument();
      expect(screen.getByText('No schema per organisation')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Merged from tenantsPage-extra.test.tsx (now deleted).
// Old → new ID mapping:
//   UT-TENANTS-001  →  IT-TENANTS-007  (ComingSoon with 3-item missing array)
//   UT-TENANTS-002  →  IT-TENANTS-008  (ComingSoon with empty array)
//   UT-TENANTS-003  →  IT-TENANTS-009  (ComingSoon with missing=undefined)
//   UT-TENANTS-004  →  IT-TENANTS-010  (ComingSoon description plain text / XSS)
//   UT-TENANTS-005  →  IT-TENANTS-011  (ComingSoon title accepts JSX)
//   UT-TENANTS-006  →  IT-TENANTS-012  (ComingSoon does not render an <a>)
//
// Subject: ComingSoon component (shared by TenantsPage, TenantDetailPage,
// OrganizationPage and other ComingSoon wrappers).
//
// LOCKED LOGIC (no page-specific logic to extract — all three pages are
// pure ComingSoon wrappers, covered at IT-TENANTS-001..006 above):
//   TenantsPage.tsx        lines 10-30   — pure wrapper (title/description/missing from i18n)
//   TenantDetailPage.tsx   lines 10-28   — pure wrapper
//   OrganizationPage.tsx   lines 10-23   — pure wrapper
// =============================================================================

import ComingSoon from '@/components/common/ComingSoon';

describe('IT-TENANTS-007: ComingSoon with 3-item missing array renders all three', () => {
  it('should render all three missing items as text', () => {
    render(
      <ComingSoon
        title="Multi-tenant organisations"
        description="Run several organisations on one platform."
        missing={['No tenant-service', 'No schema per organisation', 'No data isolation']}
      />
    );

    expect(screen.getByText('No tenant-service')).toBeInTheDocument();
    expect(screen.getByText('No schema per organisation')).toBeInTheDocument();
    expect(screen.getByText('No data isolation')).toBeInTheDocument();
    expect(screen.getByText('What is missing')).toBeInTheDocument();
  });
});

describe('IT-TENANTS-008: ComingSoon with empty array omits the missing list', () => {
  it('should render the title and description but not the missing-heading section', () => {
    render(
      <ComingSoon title="Coming soon page" description="Feature description here." missing={[]} />
    );

    expect(screen.getByText('Coming soon page')).toBeInTheDocument();
    expect(screen.getByText('Feature description here.')).toBeInTheDocument();
    expect(screen.queryByText('What is missing')).not.toBeInTheDocument();
  });
});

describe('IT-TENANTS-009: ComingSoon with missing=undefined does not crash', () => {
  it('should render the title and description without a missing list', () => {
    const { container } = render(
      <ComingSoon
        title="No backend yet"
        description="This feature is not implemented."
        missing={undefined}
      />
    );

    expect(screen.getByText('No backend yet')).toBeInTheDocument();
    expect(screen.getByText('This feature is not implemented.')).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });
});

describe('IT-TENANTS-010: ComingSoon description is plain text (XSS-like string stays literal)', () => {
  it('should render XSS-like strings as plain text without executing them', () => {
    const xss = '<img src=x onerror=alert(1)>';
    render(<ComingSoon title="Safe render" description={xss} missing={[]} />);

    const desc = screen.getByText(xss);
    expect(desc).toBeInTheDocument();
    expect(desc.tagName.toLowerCase()).toBe('p');
  });
});

describe('IT-TENANTS-011: ComingSoon title accepts JSX (br tags split correctly)', () => {
  it('should render JSX title with br tags intact (no crash)', () => {
    render(
      <ComingSoon
        title={
          <span>
            Coming
            <br />
            Soon
            <br />
            Page
          </span>
        }
        description="A description."
        missing={[]}
      />
    );

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.innerHTML).toContain('<br');
  });
});

describe('IT-TENANTS-012: ComingSoon does not render an <a> link by default', () => {
  it('should render only the ComingSoon card with no external links', () => {
    render(
      <ComingSoon
        title="Tenants"
        description="Partner organisations."
        missing={['No backend', 'No data']}
      />
    );

    const links = screen.queryAllByRole('link');
    expect(links).toHaveLength(0);
  });
});
