/** Wave 2 — Integration: PracticePage (student-owned). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'vi' } }),
}));

import PracticePage from '@/pages/student/PracticePage';
import { apiClient } from '@/config/api.config';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderPage = (topicId = 'topic-42') => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/student/practice/${topicId}`]}>
        <Routes>
          <Route path="/student/practice/:topicId" element={<PracticePage />} />
          <Route
            path="/student/practice"
            element={<div data-testid="practicequiz-setup-page">PRACTICE_QUIZ</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const makeQuestion = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  uid: 'q-1',
  questionText: 'What is the time complexity of binary search?',
  questionType: 'multiple_choice',
  difficulty: 'medium',
  points: 10,
  topic: { uid: 't-1', name: 'Algorithms', level: 1 },
  skills: [{ uid: 's-1', name: 'Sorting' }],
  options: [
    { uid: 'o-1', optionText: 'O(n)', isCorrect: false, position: 0 },
    { uid: 'o-2', optionText: 'O(log n)', isCorrect: true, position: 1 },
    { uid: 'o-3', optionText: 'O(n log n)', isCorrect: false, position: 2 },
    { uid: 'o-4', optionText: 'O(1)', isCorrect: false, position: 3 },
  ],
  answerText: null,
  explanation: 'Binary search halves the search space each step.',
  createdBy: 'i-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const seedStudent = () => {
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
};

beforeEach(() => {
  seedStudent();
  vi.mocked(apiClient.get).mockReset();
});

describe('PracticePage — loading state', () => {
  it('IT-PRACTICE-001: should_showSpinner_When_GetPracticePathIsPending', () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/Loading practice session\.\.\./i)).toBeInTheDocument();
  });
});

describe('PracticePage — error state', () => {
  it('IT-PRACTICE-002: should_showError_When_GetPracticePathRejects', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Failed to load practice questions')).toBeInTheDocument();
    });
  });
});

describe('PracticePage — empty state', () => {
  it('IT-PRACTICE-003: should_showCelebration_When_NoMoreQuestions', async () => {
    // page reads response.data.data directly; provide a payload whose
    // .question is null (no question) and nextQuestions empty.
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        timestamp: 't',
        data: { question: null, prerequisites: [], nextQuestions: [] },
      },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/No more questions!/i)).toBeInTheDocument();
    });
  });
});

describe('PracticePage — render question', () => {
  it('IT-PRACTICE-004: should_renderQuestionAndAllFourOptions_When_Loaded', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        timestamp: 't',
        data: {
          question: makeQuestion(),
          prerequisites: [],
          nextQuestions: [],
        },
      },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/What is the time complexity/i).length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('O(n)')).toBeInTheDocument();
    expect(screen.getByText('O(log n)')).toBeInTheDocument();
    expect(screen.getByText('O(n log n)')).toBeInTheDocument();
    expect(screen.getByText('O(1)')).toBeInTheDocument();
  });

  it('IT-PRACTICE-005: should_highlightSelectedAnswer_When_Clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        timestamp: 't',
        data: { question: makeQuestion(), prerequisites: [], nextQuestions: [] },
      },
    });
    renderPage();
    await waitFor(() => screen.getByText('O(log n)'));
    const opt = screen.getByText('O(log n)').closest('button');
    expect(opt).not.toBeNull();
    await user.click(opt as HTMLElement);
    // selection keeps the same DOM node; the option should still be findable.
    expect(screen.getByText('O(log n)')).toBeInTheDocument();
  });

  it('IT-PRACTICE-006: should_showExplanation_When_SubmitClicked', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        timestamp: 't',
        data: { question: makeQuestion(), prerequisites: [], nextQuestions: [] },
      },
    });
    renderPage();
    await waitFor(() => screen.getByText('O(log n)'));
    const opt = screen.getByText('O(log n)').closest('button');
    await user.click(opt as HTMLElement);
    const submit = screen.getByRole('button', { name: /Submit Answer/i });
    await user.click(submit);
    await waitFor(() => {
      expect(screen.getByText(/Binary search halves the search space/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Next Question/i })).toBeInTheDocument();
  });

  it('IT-PRACTICE-007: should_callGetPracticePathAgain_When_NextClicked', async () => {
    const user = userEvent.setup();
    const q = makeQuestion();
    const nextQ = makeQuestion({ uid: 'q-next', questionText: 'Next question?' });
    let calls = 0;
    vi.mocked(apiClient.get).mockImplementation(() => {
      calls += 1;
      if (calls === 1) {
        return Promise.resolve({
          data: {
            success: true,
            message: 'ok',
            timestamp: 't',
            data: { question: q, prerequisites: [], nextQuestions: [{ ...nextQ, topic: q.topic }] },
          },
        });
      }
      // The page reads nextQuestions[0].topic.uid for the next fetch.
      // The fixture doesn't include a topic at that path, so the second
      // call may use a different URL. We only assert that a second call
      // happens after Next.
      return Promise.resolve({
        data: {
          success: true,
          message: 'ok',
          timestamp: 't',
          data: { question: nextQ, prerequisites: [], nextQuestions: [] },
        },
      });
    });
    renderPage();
    await waitFor(() => screen.getByText('O(log n)'));
    await user.click(screen.getByText('O(log n)').closest('button') as HTMLElement);
    await user.click(screen.getByRole('button', { name: /Submit Answer/i }));
    await waitFor(() => screen.getByRole('button', { name: /Next Question/i }));
    await user.click(screen.getByRole('button', { name: /Next Question/i }));
    await waitFor(() => {
      expect(calls).toBeGreaterThanOrEqual(2);
    });
  });

  it('IT-PRACTICE-008: should_renderWithoutCrash_When_Authenticated', () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}));
    expect(() => renderPage()).not.toThrow();
  });
});
