/** Wave 2 — Integration: LearningPathPage (student-owned, LearningPath gaps). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/app/store/authStore';

// vi.mock kéo lên đầu file nên biến dùng trong factory phải khai qua
// vi.hoisted, giống cấu trúc trong LearningPathPage.test.tsx.
const { getMine, getHistory, getById, generate } = vi.hoisted(() => ({
  getMine: vi.fn(),
  getHistory: vi.fn(),
  getById: vi.fn(),
  generate: vi.fn(),
}));

vi.mock('@/services/api/learning-path.api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api/learning-path.api')>(
    '@/services/api/learning-path.api'
  );
  return {
    ...actual,
    learningPathApi: { ...actual.learningPathApi, getMine, getHistory, getById, generate },
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      // Map uses namespaced keys because i18next prefixes the key with the
      // active namespace when `useTranslation(ns)` is used.
      const k = ns ? `${ns}:${key}` : key;
      const map: Record<string, string> = {
        'learningPath:title': 'Learning path',
        'learningPath:subtitle': 'AI-generated path',
        'learningPath:loading': 'Loading...',
        'learningPath:form.heading': 'Create learning path',
        'learningPath:form.intro': 'Tell us your goal.',
        'learningPath:form.goalLabel': 'Goal',
        'learningPath:form.goalPlaceholder': 'Become a backend engineer',
        'learningPath:form.goalHint': 'Aim for one short sentence.',
        'learningPath:form.hoursLabel': 'Hours per week',
        'learningPath:form.hoursHint': '1 to 80',
        'learningPath:form.hoursInvalid': 'Hours must be 1-80',
        'learningPath:form.goalRequired': 'Goal is required',
        'learningPath:form.skillsLabel': 'Current skills',
        'learningPath:form.skillsPlaceholder': 'Type a skill, press Enter',
        'learningPath:form.skillsHint': 'Press Enter to add',
        'learningPath:form.skillsEmpty': 'No skills yet',
        'learningPath:form.removeSkill': 'Remove skill',
        'learningPath:form.submit': 'Generate',
        'learningPath:form.submitBusy': 'Generating...',
        'learningPath:form.cancel': 'Cancel',
        'learningPath:generating.heading': 'Generating your path...',
        'learningPath:generating.note': 'This takes 1-3 minutes.',
        'learningPath:generating.elapsed': 'Elapsed: {{seconds}}s',
        'learningPath:generating.stagesTitle': 'Stages',
        'learningPath:generating.stagesNote': 'All 5 agents run sequentially.',
        'learningPath:generating.agents.profiler': 'Profiler',
        'learningPath:generating.agents.gap_analyzer': 'Gap analyzer',
        'learningPath:generating.agents.curriculum_planner': 'Curriculum planner',
        'learningPath:generating.agents.resource_retriever': 'Resource retriever',
        'learningPath:generating.agents.validator': 'Validator',
        'learningPath:error.title': 'Error',
        'learningPath:error.generateTitle': 'Generation failed',
        'learningPath:error.serverSaid': 'Server said: {{message}}',
        'learningPath:error.noFakeData': 'No sample data.',
        'learningPath:error.retry': 'Retry',
        'learningPath:error.unavailable': 'AI gateway unavailable',
        'learningPath:error.rateLimited': 'Rate limited',
        'learningPath:error.timeout': 'Timeout',
        'learningPath:error.generic': 'Something went wrong',
        'learningPath:error.loadTitle': 'Could not load learning path',
        'learningPath:error.loadBody': 'Try again later.',
        'learningPath:error.reload': 'Reload',
        'learningPath:error.openTitle': 'Could not open this entry',
        'learningPath:error.openBody': 'Try another one.',
        'learningPath:path.regenerate': 'Regenerate',
        'learningPath:path.viewingOld': 'Viewing an older path',
        'learningPath:path.backToLatest': 'Back to latest',
        'learningPath:path.goalLabel': 'Goal',
        'learningPath:path.summaryLabel': 'Summary',
        'learningPath:path.totalHours': 'Total hours',
        'learningPath:path.hoursUnit': '{{value}} hours',
        'learningPath:path.weeks': 'Weeks',
        'learningPath:path.weeksUnit': '{{value}} weeks',
        'learningPath:path.stepCount': 'Steps',
        'learningPath:path.stepsUnit': '{{value}} steps',
        'learningPath:path.generatedBy': 'Model: {{model}}',
        'learningPath:path.generatedAt': 'Generated at {{datetime}}',
        'learningPath:path.modelUnknown': 'unknown',
        'learningPath:path.stepsHeading': 'Steps',
        'learningPath:path.noSteps': 'No steps',
        'learningPath:path.step': 'Step {{order}}',
        'learningPath:path.objective': 'Objective',
        'learningPath:path.estimatedHours': 'Estimated: {{value}} hours',
        'learningPath:path.skills': 'Skills',
        'learningPath:path.noSkills': 'No skills',
        'learningPath:path.resources': 'Resources',
        'learningPath:path.noResources': 'No resources',
        'learningPath:path.openCourse': 'Open course',
        'learningPath:path.noCourse': 'No course linked',
        'learningPath:path.agentTrace': 'Agent trace',
        'learningPath:path.agentTraceEmpty': 'No trace',
        'learningPath:path.agentElapsed': '{{ms}} ms',
        'learningPath:empty.heading': 'No path yet',
        'learningPath:empty.body': 'Generate your first learning path.',
        'learningPath:history.heading': 'History',
        'learningPath:history.empty': 'No history',
        'learningPath:history.loadError': 'History load error',
        'learningPath:history.current': 'Current',
        'learningPath:history.open': 'Open',
        'learningPath:history.opening': 'Opening...',
        'learningPath:history.itemSteps': '{{value}} steps',
      };
      let v = map[k] ?? '??';
      if (opts) {
        for (const [optK, optVal] of Object.entries(opts)) {
          v = v.replace(`{{${optK}}}`, String(optVal));
        }
      }
      return v;
    },
    i18n: { language: 'vi' },
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

import LearningPathPage from '@/pages/student/LearningPathPage';

/** Dựng client đúng như `App.tsx` (`retry: 1`) để kiểm tra trang tự ghi đè. */
function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false },
    },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LearningPathPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getMine.mockReset();
  getHistory.mockReset();
  getById.mockReset();
  generate.mockReset();
  getHistory.mockResolvedValue([]);
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

describe('LearningPathPage — form validation', () => {
  it('IT-LEARNPATH-001: should_renderForm_When_BackendReturnsNull', async () => {
    getMine.mockResolvedValue(null);
    renderPage();
    await waitFor(() => screen.getByText('Create learning path'));
    // Form heading and submit visible.
    expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
  });

  it('IT-LEARNPATH-002: should_showGoalRequired_When_SubmitEmpty', async () => {
    const user = userEvent.setup();
    getMine.mockResolvedValue(null);
    renderPage();
    await waitFor(() => screen.getByText('Create learning path'));
    const submitBtn = screen.getByRole('button', { name: /Generate/i });
    // Disabled button — but the form onSubmit still fires if dispatched directly.
    // Just verify the empty-goal path: type hours, then submit (goal still empty).
    await user.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText(/Goal is required/i)).toBeInTheDocument();
    });
  });

  it('IT-LEARNPATH-003: should_showGoalRequired_When_SubmitClickedEmpty', async () => {
    const user = userEvent.setup();
    getMine.mockResolvedValue(null);
    renderPage();
    await waitFor(() => screen.getByText('Create learning path'));
    // Submit without typing a goal: validator reports goalRequired.
    const submitBtn = screen.getByRole('button', { name: /Generate/i });
    await user.click(submitBtn);
    await waitFor(() => {
      const alerts = Array.from(document.querySelectorAll('[role="alert"]'));
      expect(alerts.some((a) => /Goal is required/i.test(a.textContent ?? ''))).toBe(true);
    });
  });
});

describe('LearningPathPage — generation flow', () => {
  it('IT-LEARNPATH-004: should_showGeneratingStages_When_GeneratePending', async () => {
    getMine.mockResolvedValue(null);
    // generate() never resolves to keep the pending state.
    generate.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Create learning path'));
    const goalInput = screen.getByPlaceholderText(/Become a backend engineer/i);
    await user.type(goalInput, 'Become a frontend engineer');
    await user.click(screen.getByRole('button', { name: /Generate/i }));
    await waitFor(() => {
      expect(screen.getByText(/Generating your path\.\.\./i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Profiler/i)).toBeInTheDocument();
    expect(screen.getByText(/Gap analyzer/i)).toBeInTheDocument();
  });

  it('IT-LEARNPATH-005: should_renderPathDetails_When_GenerateResolves', async () => {
    const generated = {
      id: 'p-1',
      userId: 'u-1',
      goal: 'Become a backend engineer',
      model: 'gemini',
      createdAt: '2026-10-04T00:00:00.000Z',
      payload: {
        goal: 'Become a backend engineer',
        summary: 'A short summary.',
        totalEstimatedHours: 40,
        weeks: 6,
        steps: [
          {
            order: 1,
            title: 'Learn the basics',
            objective: 'Read docs.',
            courseId: null,
            estimatedHours: 10,
            skills: ['HTTP'],
            resources: [],
          },
        ],
        agentTrace: [],
        model: 'gemini',
        generatedAt: '2026-10-04T00:00:00.000Z',
      },
    };
    // First call (initial load): no path yet.
    // Second call (after invalidation): the newly generated path is cached.
    getMine.mockResolvedValueOnce(null).mockResolvedValue(generated);
    generate.mockResolvedValue(generated);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Create learning path'));
    await user.type(
      screen.getByPlaceholderText(/Become a backend engineer/i),
      'Become a backend engineer'
    );
    await user.click(screen.getByRole('button', { name: /Generate/i }));
    // Path summary is unique, assert that.
    await waitFor(
      () => {
        expect(screen.getByText('A short summary.')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    expect(screen.getByText('Learn the basics')).toBeInTheDocument();
  });
});
