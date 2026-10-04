/** Wave 2 — Integration: BecomeInstructorPage (student-owned). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/app/store/authStore';

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'student.becomeInstructor.title': 'Become an Instructor',
        'student.becomeInstructor.subtitle': 'Share your knowledge',
        'student.becomeInstructor.sectionProfile': 'Profile',
        'student.becomeInstructor.sectionExpertise': 'Expertise',
        'student.becomeInstructor.sectionDocuments': 'Documents',
        'student.becomeInstructor.field.fullName': 'Full name',
        'student.becomeInstructor.field.email': 'Email',
        'student.becomeInstructor.field.department': 'Department',
        'student.becomeInstructor.field.yearsExp': 'Years of experience',
        'student.becomeInstructor.field.specializations': 'Specialisations',
        'student.becomeInstructor.field.specializationsHint': 'Up to 8 tags',
        'student.becomeInstructor.field.addTagPlaceholder': 'Add tag',
        'student.becomeInstructor.suggestions': 'Suggestions',
        'student.becomeInstructor.field.bio': 'Bio',
        'student.becomeInstructor.field.bioHint': 'Tell us about yourself',
        'student.becomeInstructor.field.bioPlaceholder': 'I am a...',
        'student.becomeInstructor.field.cv': 'CV',
        'student.becomeInstructor.field.cvHint': 'PDF, DOC, DOCX',
        'student.becomeInstructor.cvDragDrop': 'Drag your CV here',
        'student.becomeInstructor.cvFormats': 'PDF, DOC, DOCX up to 10MB',
        'student.becomeInstructor.field.portfolio': 'Portfolio URL',
        'student.becomeInstructor.field.portfolioPlaceholder': 'https://',
        'student.becomeInstructor.field.motivation': 'Motivation',
        'student.becomeInstructor.field.motivationHint': 'Why do you want to teach?',
        'student.becomeInstructor.field.motivationPlaceholder': 'I want to teach because...',
        'student.becomeInstructor.saveDraft': 'Save draft',
        'student.becomeInstructor.submit': 'Submit',
        'student.becomeInstructor.submitting': 'Submitting...',
        'student.becomeInstructor.benefitsTitle': 'Why teach with us?',
        'student.becomeInstructor.benefitsSubtitle': 'Benefits',
        'student.becomeInstructor.benefit1Title': 'Earn income',
        'student.becomeInstructor.benefit1Desc': 'Monetize your knowledge',
        'student.becomeInstructor.benefit2Title': 'Build community',
        'student.becomeInstructor.benefit2Desc': 'Reach learners worldwide',
        'student.becomeInstructor.benefit3Title': 'Trusted platform',
        'student.becomeInstructor.benefit3Desc': 'Verified credentials',
        'student.becomeInstructor.benefit4Title': 'Grow your career',
        'student.becomeInstructor.benefit4Desc': 'Author reputation',
        'student.becomeInstructor.faqTitle': 'FAQ',
        'student.becomeInstructor.faqSubtitle': 'Common questions',
        'student.becomeInstructor.faq1Q': 'How long does it take?',
        'student.becomeInstructor.faq1A': 'About 2 weeks.',
        'student.becomeInstructor.faq2Q': 'Is there a fee?',
        'student.becomeInstructor.faq2A': 'No.',
        'student.becomeInstructor.faq3Q': 'When can I start?',
        'student.becomeInstructor.faq3A': 'After approval.',
        'student.becomeInstructor.statusPending': 'Application pending',
        'student.becomeInstructor.statusPendingDesc': 'We will review your application shortly.',
        'student.becomeInstructor.statusRejected': 'Application rejected',
        'student.becomeInstructor.statusRejectedDesc': 'Please contact support.',
        'student.becomeInstructor.modalTitle': 'Submitted!',
        'student.becomeInstructor.modalDesc': 'Your application was received.',
        'student.becomeInstructor.modalTimeline': 'Expect a response within 7 days.',
        'student.becomeInstructor.modalClose': 'Close',
        'student.nav.account': 'Account',
        'student.nav.settings': 'Settings',
        'shared.menu': 'Menu',
        'header.toggleTheme': 'Toggle theme',
        'header.notifications': 'Notifications',
        'header.logout': 'Logout',
        'sidebar.role.student': 'Student',
      };
      let v = map[key] ?? key;
      if (opts) {
        for (const [k, val] of Object.entries(opts)) {
          v = v.replace(`{${k}}`, String(val));
        }
      }
      return v;
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

import BecomeInstructorPage from '@/pages/student/BecomeInstructorPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/become-instructor']}>
        <BecomeInstructorPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const seedStudent = (over: Record<string, unknown> = {}) => {
  useAuthStore.setState({
    user: {
      id: 'u-1',
      email: 'nam.nh@example.com',
      full_name: 'Nguyen Hoang Nam',
      role: 'student',
      avatar_url: null,
      ...over,
    },
    accessToken: 't',
    refreshToken: 'r',
    isAuthenticated: true,
    isLoading: false,
  });
};

beforeEach(() => {
  seedStudent();
  queryClient.clear();
});

describe('BecomeInstructorPage — form rendering', () => {
  it('IT-BECOMEINSTR-001: should_renderAllSections_When_Mounted', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
    expect(screen.getByText('Expertise')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save draft/i })).toBeInTheDocument();
  });

  it('IT-BECOMEINSTR-002: should_prefillFullNameAndEmail_When_Mounted', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Nguyen Hoang Nam')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('nam.nh@example.com')).toBeInTheDocument();
  });

  it('IT-BECOMEINSTR-003: should_addTag_When_SuggestionClicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Expertise'));
    // The page only shows suggestions not yet selected. Find a chip that is
    // not in default tags (default = Programming + Web Development).
    const mathChip = screen.getAllByText('Mathematics').find((el) => el.closest('button')) as
      HTMLElement | undefined;
    expect(mathChip).toBeDefined();
    await user.click(mathChip as HTMLElement);
    await waitFor(() => {
      // Now "Mathematics" appears as a tag pill — span containing the text
      // and a remove button.
      const pills = Array.from(document.querySelectorAll('span')).filter(
        (s) => s.textContent?.includes('Mathematics') && s.querySelector('button')
      );
      expect(pills.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('IT-BECOMEINSTR-004: should_removeTag_When_RemoveClicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Expertise'));
    // Find the tag pill containing "Programming" — must be a span with a
    // remove button (not the suggestion button further down).
    const pills = Array.from(document.querySelectorAll('span')).filter(
      (s) => s.textContent?.trim().startsWith('Programming') && s.querySelector('button')
    );
    expect(pills.length).toBeGreaterThanOrEqual(1);
    const removeBtn = pills[0]!.querySelector('button') as HTMLButtonElement;
    await user.click(removeBtn);
    await waitFor(() => {
      // After removal, the tag pill must be gone — but the suggestion chip
      // for "Mathematics" still exists, so we look for the pill specifically.
      const remaining = Array.from(document.querySelectorAll('span')).filter(
        (s) => s.textContent?.trim().startsWith('Programming') && s.querySelector('button')
      );
      expect(remaining.length).toBe(0);
    });
  });

  it('IT-BECOMEINSTR-005: should_showPendingBanner_When_FormSubmitted', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /Submit/i }));
    await user.click(screen.getByRole('button', { name: /Submit/i }));
    // Submit is local-setTimeout(900ms); wait > 1s for the modal + banner.
    await waitFor(
      () => {
        expect(screen.getByText(/Application pending/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});
