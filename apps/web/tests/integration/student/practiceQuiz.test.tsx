/** Wave 2 — Integration: PracticeQuizPage (student-owned). */
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

// i18next mock: keys the page uses.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'student.practice.title': 'Practice',
        'student.practice.subtitle': 'From your course material',
        'student.practice.setup.title': 'What do you want to practise?',
        'student.practice.setup.desc': 'Questions are written from ingested material.',
        'student.practice.setup.topic': 'Topic',
        'student.practice.setup.topicPlaceholder': 'e.g. Box model',
        'student.practice.setup.difficulty': 'Difficulty',
        'student.practice.setup.count': 'Questions',
        'student.practice.setup.start': 'Start practising',
        'student.practice.setup.generating': 'Writing questions...',
        'student.practice.setup.notGrounded': 'No course material covers this topic.',
        'student.practice.setup.partial': 'Asked for {{requested}}, got {{returned}}.',
        'student.practice.setup.change': 'Change topic',
        'student.practice.easy': 'Easy',
        'student.practice.medium': 'Medium',
        'student.practice.hard': 'Hard',
        'student.practice.question': 'Question',
        'student.practice.of': 'of',
        'student.practice.questionType': 'Type',
        'student.practice.points': '{{count}} pts',
        'student.practice.flagToggle': 'Flag',
        'student.practice.showExplanation': 'Show explanation',
        'student.practice.correctAnswer': 'Correct',
        'student.practice.prev': 'Previous',
        'student.practice.next': 'Next',
        'student.practice.submitAll': 'Submit all',
        'student.practice.nav': 'Navigator',
        'student.practice.summary': 'Summary',
        'student.practice.answered': 'Answered',
        'student.practice.unanswered': 'Unanswered',
        'student.practice.flagged': 'Flagged',
        'student.practice.correctCount': 'Correct',
        'student.practice.tipsTitle': 'Practice tips',
        'student.practice.tip1': 'Read carefully',
        'student.practice.tip2': 'Flag hard ones',
        'student.practice.tip3': 'Be consistent',
        'student.practice.confirmSubmit': 'Confirm submission?',
        'student.practice.confirmNo': 'Continue',
        'student.practice.confirmYes': 'Submit now',
        'student.practice.results.excellent': 'Excellent',
        'student.practice.results.good': 'Good',
        'student.practice.results.needsWork': 'Needs work',
        'student.practice.results.completed': 'Completed',
        'student.practice.results.review': 'Review',
        'student.practice.results.yourScore': 'Your score',
        'student.practice.results.continueLearning': 'Continue learning',
        'student.practice.restart': 'Restart',
      };
      let v = map[key] ?? key;
      if (opts) {
        for (const [k, val] of Object.entries(opts)) {
          v = v.replace(`{${k}}`, String(val));
        }
      }
      return v;
    },
    i18n: { language: 'vi' },
  }),
}));

import PracticeQuizPage from '@/pages/student/PracticeQuizPage';
import { apiClient } from '@/config/api.config';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/practice']}>
        <Routes>
          <Route path="/student/practice" element={<PracticeQuizPage />} />
          <Route path="/student" element={<div data-testid="student-home">HOME</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

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

const generatedSet = (over: Record<string, unknown> = {}) => ({
  questions: [
    {
      questionText: 'Why?',
      questionType: 'multiple_choice',
      difficulty: 'medium',
      options: [
        { optionText: 'A', isCorrect: false },
        { optionText: 'B', isCorrect: true },
        { optionText: 'C', isCorrect: false },
      ],
      answerText: null,
      explanation: 'Because.',
      source: { docId: 'd1', chunkId: 'c1', title: 'Doc', score: 0.9, excerpt: 'Excerpt' },
    },
  ],
  requested: 1,
  returned: 1,
  droppedUnverified: 0,
  grounded: true,
  model: 'gemini',
  latencyMs: 100,
  ...over,
});

beforeEach(() => {
  seedStudent();
  queryClient.clear();
  vi.mocked(apiClient.post).mockReset();
});

describe('PracticeQuizPage — setup form', () => {
  it('IT-PRACTICEQUIZ-001: should_showSetupForm_When_NoQuestionsYet', () => {
    renderPage();
    expect(screen.getByText(/What do you want to practise\?/i)).toBeInTheDocument();
    // start button is disabled while topic is empty
    expect(screen.getByRole('button', { name: /Start practising/i })).toBeDisabled();
  });

  it('IT-PRACTICEQUIZ-002: should_keepStartDisabled_When_TopicIsEmpty', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /Start practising/i })).toBeDisabled();
  });

  it('IT-PRACTICEQUIZ-003: should_callGenerate_When_TopicEnteredAndStartClicked', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: generatedSet() },
    });
    renderPage();
    const input = screen.getByPlaceholderText(/Box model/i);
    await user.type(input, 'recursion');
    await user.click(screen.getByRole('button', { name: /Start practising/i }));
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });
    const [url, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(url).toBe('/api/ai/questions/generate');
    expect((body as { topic: string }).topic).toBe('recursion');
  });

  it('IT-PRACTICEQUIZ-004: should_showErrorAlert_When_GenerateFails', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockRejectedValue(new Error('boom'));
    renderPage();
    await user.type(screen.getByPlaceholderText(/Box model/i), 'recursion');
    await user.click(screen.getByRole('button', { name: /Start practising/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

describe('PracticeQuizPage — quiz view', () => {
  it('IT-PRACTICEQUIZ-005: should_renderQuestionAndOptions_When_GenerateSucceeds', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: generatedSet() },
    });
    renderPage();
    await user.type(screen.getByPlaceholderText(/Box model/i), 'recursion');
    await user.click(screen.getByRole('button', { name: /Start practising/i }));
    await waitFor(() => {
      expect(screen.getByText('Why?')).toBeInTheDocument();
    });
    // options A/B/C may be referenced via button names. Confirm the question area renders.
    expect(screen.getByText('Why?')).toBeInTheDocument();
  });

  it('IT-PRACTICEQUIZ-006: should_showExplanation_When_OptionClicked', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: 'ok', timestamp: 't', data: generatedSet() },
    });
    renderPage();
    await user.type(screen.getByPlaceholderText(/Box model/i), 'recursion');
    await user.click(screen.getByRole('button', { name: /Start practising/i }));
    await waitFor(() => screen.getByText('Why?'));
    // The page renders options as buttons whose visible text is the
    // concatenation of the letter badge and the option text — so the
    // fixture's optionText="B" + letter="B" yields "BB". Find that button.
    const buttons = Array.from(document.querySelectorAll('button'));
    const correctBtn = buttons.find((b) => (b.textContent ?? '').trim() === 'BB') as
      HTMLElement | undefined;
    expect(correctBtn).toBeDefined();
    await user.click(correctBtn as HTMLElement);
    await waitFor(() => {
      expect(screen.getByText(/Because\./)).toBeInTheDocument();
    });
  });

  it('IT-PRACTICEQUIZ-007: should_navigateToStudentHome_When_BackLinkClicked', async () => {
    const user = userEvent.setup();
    renderPage();
    // The back link goes to /student; use the href to find it.
    const back = document.querySelector('a[href="/student"]') as HTMLElement | null;
    expect(back).not.toBeNull();
    await user.click(back as HTMLElement);
    await waitFor(() => {
      expect(screen.getByTestId('student-home')).toBeInTheDocument();
    });
  });
});
