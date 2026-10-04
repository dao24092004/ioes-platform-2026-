/** Wave 3C — Integration: AIQuestionPage (instructor, /instructor/ai-question) */
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
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import AIQuestionPage from '@/pages/instructor/AIQuestionPage';
import I18nProvider from '@/app/providers/I18nProvider';
import { ApiError, apiClient, type ApiEnvelope } from '@/config/api.config';
import type { GeneratedQuestionSet } from '@/services/api/questions.api';

const envelope = <T,>(data: T): ApiEnvelope<T> => ({
  success: true,
  message: 'ok',
  data,
  timestamp: '2026-09-01T00:00:00.000Z',
});

const generatedSet = (over: Partial<GeneratedQuestionSet>): GeneratedQuestionSet => ({
  questions: [
    {
      questionText: '<script>alert(1)</script> React hook nào chỉ chạy một lần?',
      questionType: 'multiple_choice',
      difficulty: 'medium',
      options: [
        { optionText: 'useEffect', isCorrect: true },
        { optionText: 'useMemo', isCorrect: false },
      ],
      answerText: null,
      explanation: 'useEffect chỉ chạy lại khi phụ thuộc đổi.',
      source: {
        docId: 'doc-1',
        chunkId: 'chunk-1',
        title: 'React Hooks',
        score: 0.91,
        excerpt: 'useEffect(callback, deps)',
      },
    },
  ],
  requested: 5,
  returned: 1,
  droppedUnverified: 4,
  grounded: true,
  model: 'ioes-llm',
  latencyMs: 1200,
  ...over,
});

const renderAIQuestion = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/instructor/ai-question']}>
          <AIQuestionPage />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: 'i-1',
      email: 'instructor@ioes.test',
      full_name: 'Giang Vien Mot',
      role: 'instructor' as const,
      avatar_url: null,
    },
    accessToken: 'fake-access-token',
    refreshToken: 'fake-refresh-token',
    isAuthenticated: true,
    isLoading: false,
  });
  vi.mocked(apiClient.post).mockReset();
});

describe('AIQuestionPage — topic gate and generated cards', () => {
  it('IT-AIQUESTION-001: should keep the generate button disabled until the topic has non-whitespace content and then render one card per generated question when generation succeeds', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValue({ data: envelope(generatedSet({})) });

    renderAIQuestion();

    const generateButton = screen.getByTestId('instructor-ai-question-generate');
    const topicInput = screen.getByTestId('instructor-ai-question-topic');

    // Empty topic: the button is disabled and the output panel shows the
    // "nothing generated yet" placeholder rather than stale content.
    expect(generateButton).toBeDisabled();
    expect(screen.getByTestId('instructor-ai-question-empty')).toBeInTheDocument();

    // Whitespace only is still blank — the guard is `!topic.trim()`.
    await user.type(topicInput, '   ');
    expect(generateButton).toBeDisabled();

    await user.clear(topicInput);
    await user.type(topicInput, 'React hooks');
    expect(generateButton).toBeEnabled();

    await user.click(generateButton);

    const card = await screen.findByTestId('instructor-ai-question-card');
    // The question text is rendered as literal text, never parsed as markup.
    expect(card).toHaveTextContent('<script>alert(1)</script> React hook nào chỉ chạy một lần?');
    expect(card.querySelector('script')).toBeNull();
    // Options are listed and the source chunk is quoted back for review.
    expect(card).toHaveTextContent('useEffect');
    expect(card).toHaveTextContent('useMemo');
    expect(card).toHaveTextContent('React Hooks');

    await waitFor(() =>
      expect(screen.getByTestId('instructor-ai-question-summary')).toHaveTextContent(
        '1 câu hỏi đã sẵn sàng'
      )
    );
    expect(screen.queryByTestId('instructor-ai-question-empty')).not.toBeInTheDocument();
  });
});

describe('AIQuestionPage — error state', () => {
  it('IT-AIQUESTION-002: should show the backend message in the alert and withdraw the empty placeholder when generation is rate-limited', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockRejectedValue(new ApiError('Quá số lượt cho phép', 429));

    renderAIQuestion();

    await user.type(screen.getByTestId('instructor-ai-question-topic'), 'React hooks');
    await user.click(screen.getByTestId('instructor-ai-question-generate'));

    const alert = await screen.findByTestId('instructor-ai-question-error');
    expect(alert).toHaveTextContent('Quá số lượt cho phép');
    // A failure is not an empty result: the placeholder must not reappear.
    expect(screen.queryByTestId('instructor-ai-question-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('instructor-ai-question-card')).not.toBeInTheDocument();
  });
});
