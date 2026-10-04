// Batch 1B — Integration: CheckoutPage + VerifyCertificatePage
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import CheckoutPage from '@/pages/public/CheckoutPage';
import VerifyCertificatePage from '@/pages/public/VerifyCertificatePage';
import { useAuthStore } from '@/app/store/authStore';

// ----------------------------------------------------------------
// vi.mock blocks — hoisted above all module code.
// All resources are defined INSIDE the factory to avoid hoisting issues.
// ----------------------------------------------------------------

// react-i18next mock — shares the same mockT via globalThis
vi.mock('react-i18next', () => {
  const VI = {
    comingSoon: {
      badge: 'Sắp phát triển',
      missingHeading: 'Còn thiếu',
      noFakeData: 'Trang này không hiển thị dữ liệu mẫu, để không ai nhầm là số liệu thật.',
      checkout: {
        title: 'Thanh toán',
        description: 'Mua khoá học và quản lý hoá đơn.',
        missing: ['Chưa có payment service', 'Chưa tích hợp cổng thanh toán nào'],
      },
      blockchain: {
        title: 'Chứng chỉ blockchain',
        description:
          'Phát hành chứng chỉ dạng NFT, xem nguồn cung token, hợp đồng và lịch sử giao dịch.',
        missing: [
          'certificate.service.ts mới là bản nháp, phần ký lên chuỗi vẫn là TODO',
          'Chưa có migration nào cho dữ liệu chứng chỉ',
          'blockchain-suite chỉ có mint và verify, chưa có endpoint token',
        ],
      },
    },
  };

  function makeT(resources: typeof VI) {
    return function t(
      key: string,
      opts?: { returnObjects?: boolean; ns?: string; defaultValue?: string }
    ): string | string[] {
      const ns = opts?.ns ?? 'common';
      if (ns !== 'common') return opts?.defaultValue ?? key;
      const parts = key.split('.');
      let val: unknown = resources;
      for (const part of parts) {
        if (val && typeof val === 'object' && part in val) {
          val = (val as Record<string, unknown>)[part];
        } else {
          return opts?.defaultValue ?? key;
        }
      }
      if (opts?.returnObjects && Array.isArray(val)) return val as string[];
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return val as string[];
      return opts?.defaultValue ?? key;
    };
  }

  const sharedT = makeT(VI);
  (globalThis as unknown as Record<string, unknown>).__sharedT = sharedT;

  return {
    useTranslation: () => ({
      t: sharedT,
      i18n: { language: 'vi', changeLanguage: vi.fn(), t: sharedT },
      ready: true,
    }),
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// ComingSoon mock — self-contained with inline resources
vi.mock('@/components/common/ComingSoon', () => {
  const VI = {
    comingSoon: {
      badge: 'Sắp phát triển',
      missingHeading: 'Còn thiếu',
      noFakeData: 'Trang này không hiển thị dữ liệu mẫu, để không ai nhầm là số liệu thật.',
      checkout: {
        title: 'Thanh toán',
        description: 'Mua khoá học và quản lý hoá đơn.',
        missing: ['Chưa có payment service', 'Chưa tích hợp cổng thanh toán nào'],
      },
      blockchain: {
        title: 'Chứng chỉ blockchain',
        description:
          'Phát hành chứng chỉ dạng NFT, xem nguồn cung token, hợp đồng và lịch sử giao dịch.',
        missing: [
          'certificate.service.ts mới là bản nháp, phần ký lên chuỗi vẫn là TODO',
          'Chưa có migration nào cho dữ liệu chứng chỉ',
          'blockchain-suite chỉ có mint và verify, chưa có endpoint token',
        ],
      },
    },
  };

  function makeT(resources: typeof VI) {
    return function t(
      key: string,
      opts?: { returnObjects?: boolean; ns?: string; defaultValue?: string }
    ): string | string[] {
      const ns = opts?.ns ?? 'common';
      if (ns !== 'common') return opts?.defaultValue ?? key;
      const parts = key.split('.');
      let val: unknown = resources;
      for (const part of parts) {
        if (val && typeof val === 'object' && part in val) {
          val = (val as Record<string, unknown>)[part];
        } else {
          return opts?.defaultValue ?? key;
        }
      }
      if (opts?.returnObjects && Array.isArray(val)) return val as string[];
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return val as string[];
      return opts?.defaultValue ?? key;
    };
  }

  // Use shared t from react-i18next mock if available, else create own
  const globalAny = globalThis as { __sharedT?: ReturnType<typeof makeT> };
  const t = globalAny.__sharedT ?? makeT(VI);

  return {
    default: function MockComingSoon({
      title,
      description,
      missing,
    }: {
      title: string;
      description: string;
      missing?: string[];
    }) {
      return (
        <div data-testid="coming-soon">
          <span>{t('comingSoon.badge')}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          {missing && missing.length > 0 && (
            <div>
              <p>{t('comingSoon.missingHeading')}</p>
              <ul>
                {missing.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <p>{t('comingSoon.noFakeData')}</p>
        </div>
      );
    },
  };
});

// Header mock
vi.mock('@/components/public/Header', () => ({
  default: function MockHeader() {
    return (
      <nav role="navigation" data-testid="mock-header-nav">
        <a href="/auth/login">Đăng nhập</a>
        <a href="/auth/register">Đăng ký</a>
      </nav>
    );
  },
}));

// ----------------------------------------------------------------
// Shared providers and helpers
// ----------------------------------------------------------------
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderWithProviders(ui: React.ReactElement, initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={0}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

const renderCheckoutPage = (slug = 'test-course') =>
  renderWithProviders(<CheckoutPage />, [`/checkout/${slug}`]);

const renderVerifyPage = (certId = 'cert-123') =>
  renderWithProviders(<VerifyCertificatePage />, [`/verify/${certId}`]);

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
  });
});

// =============================================================================
// IT-CHECKOUTVERIFY-001: CheckoutPage renders ComingSoon with checkout translation
// =============================================================================
describe('IT-CHECKOUTVERIFY-001: CheckoutPage renders ComingSoon with checkout translation', () => {
  it('should render the checkout ComingSoon title from translation', () => {
    renderCheckoutPage();
    expect(screen.getByRole('heading', { name: 'Thanh toán' })).toBeInTheDocument();
  });

  it('should render the checkout ComingSoon description from translation', () => {
    renderCheckoutPage();
    expect(screen.getByText('Mua khoá học và quản lý hoá đơn.')).toBeInTheDocument();
  });

  it('should render the checkout ComingSoon badge', () => {
    renderCheckoutPage();
    expect(screen.getByText('Sắp phát triển')).toBeInTheDocument();
  });

  it('should render the missing list section with at least one item', () => {
    renderCheckoutPage();
    expect(screen.getByText('Còn thiếu')).toBeInTheDocument();
    expect(screen.getByText('Chưa có payment service')).toBeInTheDocument();
  });

  it('should render the no-fake-data notice', () => {
    renderCheckoutPage();
    expect(
      screen.getByText('Trang này không hiển thị dữ liệu mẫu, để không ai nhầm là số liệu thật.')
    ).toBeInTheDocument();
  });
});

// =============================================================================
// IT-CHECKOUTVERIFY-002: VerifyCertificatePage renders ComingSoon with blockchain
// translation and Header
// =============================================================================
describe('IT-CHECKOUTVERIFY-002: VerifyCertificatePage renders ComingSoon with blockchain translation', () => {
  it('should render the blockchain ComingSoon title from translation', () => {
    renderVerifyPage();
    expect(screen.getByRole('heading', { name: 'Chứng chỉ blockchain' })).toBeInTheDocument();
  });

  it('should render the blockchain ComingSoon description from translation', () => {
    renderVerifyPage();
    expect(
      screen.getByText(
        'Phát hành chứng chỉ dạng NFT, xem nguồn cung token, hợp đồng và lịch sử giao dịch.'
      )
    ).toBeInTheDocument();
  });

  it('should render the blockchain ComingSoon badge', () => {
    renderVerifyPage();
    expect(screen.getByText('Sắp phát triển')).toBeInTheDocument();
  });

  it('should render the missing list section with at least one item', () => {
    renderVerifyPage();
    expect(screen.getByText('Còn thiếu')).toBeInTheDocument();
    expect(
      screen.getByText('certificate.service.ts mới là bản nháp, phần ký lên chuỗi vẫn là TODO')
    ).toBeInTheDocument();
  });

  it('should render the no-fake-data notice', () => {
    renderVerifyPage();
    expect(
      screen.getByText('Trang này không hiển thị dữ liệu mẫu, để không ai nhầm là số liệu thật.')
    ).toBeInTheDocument();
  });
});

// =============================================================================
// IT-CHECKOUTVERIFY-003: CheckoutPage renders at any slug URL without crashing
// =============================================================================
describe('IT-CHECKOUTVERIFY-003: CheckoutPage renders at any slug URL without crashing', () => {
  it('should render the page with slug "any-slug-value" without crashing', () => {
    const { container } = renderCheckoutPage('any-slug-value');
    expect(container.innerHTML).not.toBe('');
  });

  it('should render the page with slug containing hyphens and numbers', () => {
    renderCheckoutPage('course-2024-01');
    expect(screen.getByRole('heading', { name: 'Thanh toán' })).toBeInTheDocument();
  });
});

// =============================================================================
// IT-CHECKOUTVERIFY-004: VerifyCertificatePage renders at any certId URL
// =============================================================================
describe('IT-CHECKOUTVERIFY-004: VerifyCertificatePage renders at any certId URL', () => {
  it('should render the page with certId "cert-any-id" without crashing', () => {
    const { container } = renderVerifyPage('cert-any-id');
    expect(container.innerHTML).not.toBe('');
  });

  it('should render the page with UUID-like certId', () => {
    renderVerifyPage('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(screen.getByRole('heading', { name: 'Chứng chỉ blockchain' })).toBeInTheDocument();
  });
});

// =============================================================================
// IT-CHECKOUTVERIFY-005: VerifyCertificatePage renders Header; CheckoutPage does not
// =============================================================================
describe('IT-CHECKOUTVERIFY-005: VerifyCertificatePage renders Header; CheckoutPage does not', () => {
  it('should render the mock Header navigation on VerifyCertificatePage', () => {
    renderVerifyPage();
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng ký' })).toBeInTheDocument();
  });

  it('should NOT render a navigation element on CheckoutPage', () => {
    renderCheckoutPage();
    // CheckoutPage does not include <Header />, so no nav should be present.
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});

// =============================================================================
// IT-CHECKOUTVERIFY-006: Both pages have the dark/light-compatible wrapper class
// =============================================================================
describe('IT-CHECKOUTVERIFY-006: Both pages use the dark/light-compatible wrapper', () => {
  it('should wrap CheckoutPage in min-h-screen bg-slate-50 dark:bg-slate-950', () => {
    renderCheckoutPage();
    const roots = document.querySelectorAll('div.min-h-screen');
    expect(roots.length).toBeGreaterThan(0);
  });

  it('should wrap VerifyCertificatePage in min-h-screen bg-slate-50 dark:bg-slate-950', () => {
    renderVerifyPage();
    const roots = document.querySelectorAll('div.min-h-screen');
    expect(roots.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Merged from checkoutVerifyPage-extra.test.tsx (now deleted).
// Old → new ID mapping:
//   UT-CHECKOUTVERIFY-001  →  IT-CHECKOUTVERIFY-007  (ComingSoon default export exists)
//   UT-CHECKOUTVERIFY-002  →  IT-CHECKOUTVERIFY-008  (renders title, description, badge)
//   UT-CHECKOUTVERIFY-003  →  IT-CHECKOUTVERIFY-009  (renders missing list conditionally)
//   UT-CHECKOUTVERIFY-004  →  IT-CHECKOUTVERIFY-010  (renders no-fake-data notice)
//
// Subject: ComingSoon component (src/components/common/ComingSoon.tsx).
// The CheckoutPage and VerifyCertificatePage wrappers are locked logic — they
// are tested end-to-end via IT-CHECKOUTVERIFY-001..006 above and at
// TC-CHECKOUTVERIFY-001..003 (Playwright E2E).
//
// The merged tests use vi.importActual to bypass this file's vi.mock for
// ComingSoon (the mock is needed for the page-level tests in
// IT-CHECKOUTVERIFY-001..006). The text assertions use the Vietnamese strings
// the file-level react-i18next mock returns — the same mocked t() that the
// page-level tests rely on. The real ComingSoon is rendered (proved by the
// fact that title/description/missing items from props appear in the DOM); the
// i18n label assertions confirm those labels render after useTranslation().
// =============================================================================

// Real ComingSoon — bypass the vi.mock defined at the top of this file.
const RealComingSoon = (
  await vi.importActual<{
    default: React.ComponentType<{
      title: string;
      description: string;
      missing?: string[];
    }>;
  }>('@/components/common/ComingSoon')
).default;

const renderRealCS = (props: { title: string; description: string; missing?: string[] }) =>
  render(React.createElement(RealComingSoon, props));

const csProps = {
  title: 'Test Checkout Title',
  description: 'Test checkout description text.',
  missing: ['Missing item one', 'Missing item two'],
};

// IT-CHECKOUTVERIFY-007 (was UT-CHECKOUTVERIFY-001)
describe('IT-CHECKOUTVERIFY-007: ComingSoon is exported from its module path', () => {
  it('should be importable as a React component function', () => {
    expect(typeof RealComingSoon).toBe('function');
  });

  it('should have a default export', () => {
    expect(RealComingSoon).not.toBeNull();
  });
});

// IT-CHECKOUTVERIFY-008 (was UT-CHECKOUTVERIFY-002)
// Asserts against the Vietnamese strings the file-level react-i18next mock
// returns (sharedT). The real ComingSoon renders its badge via t('comingSoon.badge').
describe('IT-CHECKOUTVERIFY-008: ComingSoon renders title, description, and badge', () => {
  it('should render the title heading', () => {
    renderRealCS(csProps);
    expect(screen.getByRole('heading', { name: 'Test Checkout Title' })).toBeInTheDocument();
  });

  it('should render the description paragraph', () => {
    renderRealCS(csProps);
    expect(screen.getByText('Test checkout description text.')).toBeInTheDocument();
  });

  it('should render the Coming soon badge (i18n key comingSoon.badge)', () => {
    renderRealCS(csProps);
    expect(screen.getByText('Sắp phát triển')).toBeInTheDocument();
  });
});

// IT-CHECKOUTVERIFY-009 (was UT-CHECKOUTVERIFY-003)
describe('IT-CHECKOUTVERIFY-009: ComingSoon renders missing list conditionally', () => {
  it('should render the missing heading and all items when missing is a non-empty array', () => {
    renderRealCS(csProps);
    expect(screen.getByText('Còn thiếu')).toBeInTheDocument();
    expect(screen.getByText('Missing item one')).toBeInTheDocument();
    expect(screen.getByText('Missing item two')).toBeInTheDocument();
  });

  it('should hide the missing list section when missing is undefined', () => {
    renderRealCS({ title: 'Only Title', description: 'Only description' });
    expect(screen.queryByText('Còn thiếu')).not.toBeInTheDocument();
    expect(screen.queryByText('Missing item one')).not.toBeInTheDocument();
  });

  it('should hide the missing list section when missing is an empty array', () => {
    renderRealCS({ title: 'Only Title', description: 'Only description', missing: [] });
    expect(screen.queryByText('Còn thiếu')).not.toBeInTheDocument();
  });
});

// IT-CHECKOUTVERIFY-010 (was UT-CHECKOUTVERIFY-004)
describe('IT-CHECKOUTVERIFY-010: ComingSoon renders the no-fake-data notice', () => {
  it('should render the noFakeData notice paragraph (i18n key comingSoon.noFakeData)', () => {
    renderRealCS(csProps);
    expect(
      screen.getByText('Trang này không hiển thị dữ liệu mẫu, để không ai nhầm là số liệu thật.')
    ).toBeInTheDocument();
  });
});
