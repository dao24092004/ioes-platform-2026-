/** Wave 4 (admin) — Integration: the ten placeholder admin pages. */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import viJson from '@/locales/vi/common.json';
import { useAuthStore } from '@/app/store/authStore';
import AdminDiscussionsPage from '@/pages/admin/AdminDiscussionsPage';
import AdminTenantDetailPage from '@/pages/admin/AdminTenantDetailPage';
import AdminTenantsPage from '@/pages/admin/AdminTenantsPage';
import AuditLogPage from '@/pages/admin/AuditLogPage';
import BlockchainPage from '@/pages/admin/BlockchainPage';
import FunnelsPage from '@/pages/admin/FunnelsPage';
import HeatmapsPage from '@/pages/admin/HeatmapsPage';
import InstructorApprovalPage from '@/pages/admin/InstructorApprovalPage';
import SecurityPage from '@/pages/admin/SecurityPage';
import WalletPage from '@/pages/admin/WalletPage';
import ComingSoon from '@/components/common/ComingSoon';

/**
 * The whole network boundary. `AdminLayout` -> `useAuth` -> `auth.api` ->
 * `api.config`, so a spy on `apiClient` catches any service call made by
 * anything in the render tree, including a future one added to a page.
 */
vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
  };
});

import { apiClient } from '@/config/api.config';

/**
 * Resolve a dotted i18n key against a shipped bundle, the way i18next does.
 * The mock below uses the same walk, so the strings asserted here are the
 * strings the components actually received.
 */
function lookup(bundle: unknown, dottedKey: string): unknown {
  return dottedKey.split('.').reduce<unknown>((node, part) => {
    if (node === null || typeof node !== 'object') return undefined;
    return (node as Record<string, unknown>)[part];
  }, bundle);
}

vi.mock('react-i18next', async () => {
  const { default: viBundle } = await import('@/locales/vi/common.json');
  return {
    useTranslation: () => ({
      t: (key: string, opts?: { returnObjects?: boolean }) => {
        const value = lookup(viBundle, key);
        if (opts?.returnObjects === true) {
          return Array.isArray(value) ? value : [];
        }
        return typeof value === 'string' ? value : key;
      },
      i18n: { language: 'vi', changeLanguage: vi.fn() },
    }),
  };
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const ADMIN_USER = {
  id: 'admin-1',
  email: 'admin@ioes.test',
  full_name: 'Admin One',
  role: 'admin' as const,
  avatar_url: null,
};

/** Render one placeholder page inside the router + query providers it needs. */
function renderPage(Page: React.ComponentType, path: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Page />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** The three `ComingSoon` props as the DOM actually shows them. */
interface RenderedComingSoon {
  title: string;
  description: string;
  missing: string[];
}

/**
 * Read a rendered wrapper. The description is the element right after the
 * `coming-soon-title` h1 inside `ComingSoon`, so it is read structurally
 * rather than by class name or by guessing the text.
 */
async function readComingSoon(wrapperTestId: string): Promise<RenderedComingSoon> {
  const wrapper = await screen.findByTestId(wrapperTestId);
  const heading = within(wrapper).getByTestId('coming-soon-title');
  const description = heading.nextElementSibling?.textContent ?? '';
  const missing = within(wrapper)
    .getAllByRole('listitem')
    // ComingSoon prefixes every bullet with an aria-hidden "•" span.
    .map((item) => (item.textContent ?? '').replace('•', '').trim());
  return { title: heading.textContent ?? '', description, missing };
}

beforeEach(() => {
  useAuthStore.setState({
    user: ADMIN_USER,
    accessToken: 'admin-token',
    refreshToken: null,
    isAuthenticated: true,
    isLoading: false,
  });
  localStorage.clear();
  vi.mocked(apiClient.get).mockClear();
  vi.mocked(apiClient.post).mockClear();
  vi.mocked(apiClient.patch).mockClear();
  vi.mocked(apiClient.delete).mockClear();
  vi.mocked(apiClient.put).mockClear();
});

afterEach(() => {
  cleanup();
});

describe('IT-ADMCAV: the placeholder admin pages', () => {
  it('IT-ADMCAV-001: /admin/discussions renders its own title and description inside AdminLayout', async () => {
    renderPage(AdminDiscussionsPage, '/admin/discussions');

    const wrapper = await screen.findByTestId('admin-coming-discussions');
    const { title, description } = await readComingSoon('admin-coming-discussions');

    expect(title).toBe(viJson.comingSoon.discussion.title);
    expect(description).toBe(viJson.comingSoon.discussion.description);

    // Inside AdminLayout: the page is the <main> content and its title is
    // repeated in the header, which is how an admin page is identified.
    expect(screen.getByTestId('admin-shell-root')).toBeInTheDocument();
    expect(screen.getByTestId('admin-shell-main')).toContainElement(wrapper);
    expect(screen.getByTestId('admin-shell-header-title')).toHaveTextContent(
      viJson.comingSoon.discussion.title
    );
  });

  it('IT-ADMCAV-002: renders the missing bullet list item for item, and drops it when a page passes none', async () => {
    renderPage(AdminDiscussionsPage, '/admin/discussions');
    await screen.findByTestId('admin-coming-discussions');

    const expected = viJson.comingSoon.discussion.missing;
    const { missing } = await readComingSoon('admin-coming-discussions');
    expect(missing).toEqual([...expected]);
    expect(screen.getByText(viJson.comingSoon.missingHeading)).toBeInTheDocument();
    // The "no sample data" footer is the promise that the empty state is
    // deliberate, not a failed load.
    expect(screen.getByText(viJson.comingSoon.noFakeData)).toBeInTheDocument();

    // The other half of the contract: ComingSoon hides the list entirely when
    // the prop is omitted...
    cleanup();
    render(<ComingSoon title="No list" description="Nothing missing is declared." />);
    expect(screen.getByTestId('coming-soon-title')).toHaveTextContent('No list');
    expect(screen.getByText('Nothing missing is declared.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(viJson.comingSoon.missingHeading)).not.toBeInTheDocument();
    // ...and also when the prop is present but empty.
    cleanup();
    render(<ComingSoon title="Empty list" description="Empty array." missing={[]} />);
    expect(screen.getByTestId('coming-soon-title')).toHaveTextContent('Empty list');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('IT-ADMCAV-003: /admin/tenants shares its copy with the tenant detail route and /admin/wallet with /admin/blockchain', async () => {
    renderPage(AdminTenantsPage, '/admin/tenants');
    const tenantsList = await readComingSoon('admin-coming-tenants');

    cleanup();
    renderPage(AdminTenantDetailPage, '/admin/tenants/t-42');
    const tenantDetail = await readComingSoon('admin-coming-tenant-detail');

    // Same feature group on purpose: the detail route has no backend either.
    expect(tenantDetail).toEqual(tenantsList);
    expect(tenantsList.missing).toEqual([...viJson.comingSoon.tenant.missing]);

    cleanup();
    renderPage(BlockchainPage, '/admin/blockchain');
    const blockchain = await readComingSoon('admin-coming-blockchain');

    cleanup();
    renderPage(WalletPage, '/admin/wallet');
    const wallet = await readComingSoon('admin-coming-wallet');

    expect(wallet).toEqual(blockchain);
    expect(blockchain.missing).toEqual([...viJson.comingSoon.blockchain.missing]);
    // The two pairs are different features, not a copy-paste of one another.
    expect(tenantsList.title).not.toBe(blockchain.title);
  });

  it('IT-ADMCAV-004: the five admin.noBackend pages each render their own title, description and bullets', async () => {
    const cases: Array<{
      Page: React.ComponentType;
      path: string;
      wrapper: string;
      title: string;
      description: string;
      missing: string[];
    }> = [
      {
        Page: AuditLogPage,
        path: '/admin/audit-log',
        wrapper: 'admin-coming-audit-log',
        title: viJson.admin.auditLog.title,
        description: viJson.admin.noBackend.auditLog.description,
        missing: viJson.admin.noBackend.auditLog.missing,
      },
      {
        Page: SecurityPage,
        path: '/admin/security',
        wrapper: 'admin-coming-security',
        title: viJson.security.title,
        description: viJson.admin.noBackend.security.description,
        missing: viJson.admin.noBackend.security.missing,
      },
      {
        Page: FunnelsPage,
        path: '/admin/funnels',
        wrapper: 'admin-coming-funnels',
        title: viJson.admin.funnels.title,
        description: viJson.admin.noBackend.funnels.description,
        missing: viJson.admin.noBackend.funnels.missing,
      },
      {
        Page: HeatmapsPage,
        path: '/admin/heatmaps',
        wrapper: 'admin-coming-heatmaps',
        title: viJson.admin.heatmaps.title,
        description: viJson.admin.noBackend.heatmaps.description,
        missing: viJson.admin.noBackend.heatmaps.missing,
      },
      {
        Page: InstructorApprovalPage,
        path: '/admin/instructors/approval',
        wrapper: 'admin-coming-instructor-approval',
        title: viJson.admin.instructorApproval.title,
        description: viJson.admin.noBackend.instructorApproval.description,
        missing: viJson.admin.noBackend.instructorApproval.missing,
      },
    ];

    for (const testCase of cases) {
      renderPage(testCase.Page, testCase.path);
      const rendered = await readComingSoon(testCase.wrapper);
      expect(rendered.title, testCase.path).toBe(testCase.title);
      expect(rendered.description, testCase.path).toBe(testCase.description);
      expect(rendered.missing, testCase.path).toEqual([...testCase.missing]);
      cleanup();
    }
  });

  it('IT-ADMCAV-005: none of the ten placeholder pages issues a request', async () => {
    const pages: Array<{ Page: React.ComponentType; path: string; wrapper: string }> = [
      {
        Page: AdminDiscussionsPage,
        path: '/admin/discussions',
        wrapper: 'admin-coming-discussions',
      },
      {
        Page: AdminTenantDetailPage,
        path: '/admin/tenants/t-42',
        wrapper: 'admin-coming-tenant-detail',
      },
      { Page: AdminTenantsPage, path: '/admin/tenants', wrapper: 'admin-coming-tenants' },
      { Page: AuditLogPage, path: '/admin/audit-log', wrapper: 'admin-coming-audit-log' },
      { Page: BlockchainPage, path: '/admin/blockchain', wrapper: 'admin-coming-blockchain' },
      { Page: FunnelsPage, path: '/admin/funnels', wrapper: 'admin-coming-funnels' },
      { Page: HeatmapsPage, path: '/admin/heatmaps', wrapper: 'admin-coming-heatmaps' },
      {
        Page: InstructorApprovalPage,
        path: '/admin/instructors/approval',
        wrapper: 'admin-coming-instructor-approval',
      },
      { Page: SecurityPage, path: '/admin/security', wrapper: 'admin-coming-security' },
      { Page: WalletPage, path: '/admin/wallet', wrapper: 'admin-coming-wallet' },
    ];

    for (const { Page, path, wrapper } of pages) {
      renderPage(Page, path);
      await screen.findByTestId(wrapper);
      cleanup();
    }

    for (const verb of ['get', 'post', 'patch', 'delete', 'put'] as const) {
      expect(apiClient[verb], `apiClient.${verb}`).not.toHaveBeenCalled();
    }
  });
});
