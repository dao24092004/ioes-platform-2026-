/** Wave 3C — Integration: QuestionBankPage (instructor, /instructor/question-bank) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
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

import QuestionBankPage from '@/pages/instructor/QuestionBankPage';
import I18nProvider from '@/app/providers/I18nProvider';
import { ApiError, apiClient, type ApiEnvelope } from '@/config/api.config';
import type { Question, SearchResult } from '@/types/question-bank';

const envelope = <T,>(data: T): ApiEnvelope<T> => ({
  success: true,
  message: 'ok',
  data,
  timestamp: '2026-09-01T00:00:00.000Z',
});

const question = (over: Partial<Question>): Question => ({
  uid: 'q-1',
  questionText: 'React hook nào chỉ chạy một lần?',
  questionType: 'multiple_choice',
  difficulty: 'medium',
  points: 2,
  topic: { uid: 't-1', name: 'React cơ bản', level: 1 },
  skills: [],
  createdBy: 'i-1',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

const searchResult = (over: Partial<SearchResult>): SearchResult => ({
  questions: [question({})],
  total: 1,
  hasMore: false,
  ...over,
});

/** Topics resolve on mount; the search endpoint can be made to fail per test. */
const makeGetImpl = (onSearch: () => { data: ApiEnvelope<SearchResult> }) => (url: string) => {
  const u = String(url ?? '');
  if (u.includes('/questions/search')) return Promise.resolve(onSearch());
  if (u.includes('/topics')) {
    return Promise.resolve({ data: envelope([{ uid: 't-1', name: 'React cơ bản', level: 1 }]) });
  }
  return Promise.resolve({ data: envelope(null) });
};

const renderQuestionBank = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/instructor/question-bank']}>
          <QuestionBankPage />
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
  vi.mocked(apiClient.get).mockReset();
});

describe('QuestionBankPage — search results', () => {
  it('IT-QBANK-001: should replace the idle prompt with the result count and one card per question when a search returns matches', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl(() => ({
        data: envelope(
          searchResult({
            questions: [
              question({ uid: 'q-1', questionText: 'React hook nào chỉ chạy một lần?' }),
              question({ uid: 'q-2', questionText: 'useEffect phụ thuộc mảng rỗng chạy mấy lần?' }),
            ],
            total: 2,
            hasMore: false,
          })
        ),
      }))
    );

    renderQuestionBank();

    // Before any search the page prompts instead of showing a fake result set.
    expect(await screen.findByTestId('instructor-qbank-idle')).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText('Search questions by text, topic, or skill...'),
      'React hook'
    );
    await user.click(screen.getByRole('button', { name: 'Search' }));

    const results = await screen.findByTestId('instructor-qbank-results');
    expect(within(results).getByText('2')).toBeInTheDocument();
    expect(within(results).getByText('React hook nào chỉ chạy một lần?')).toBeInTheDocument();
    expect(
      within(results).getByText('useEffect phụ thuộc mảng rỗng chạy mấy lần?')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('instructor-qbank-idle')).not.toBeInTheDocument();
  });
});

describe('QuestionBankPage — error state', () => {
  it('IT-QBANK-002: should show the search-failed alert and keep the idle prompt hidden when the search request fails', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl(() => {
        throw new ApiError('Cổng câu hỏi không sẵn sàng', 503);
      })
    );

    renderQuestionBank();

    await user.type(
      await screen.findByPlaceholderText('Search questions by text, topic, or skill...'),
      'React'
    );
    await user.click(screen.getByRole('button', { name: 'Search' }));

    const alert = await screen.findByTestId('instructor-qbank-error');
    expect(alert).toHaveTextContent('Search failed. Please try again.');
    // A failed search must not be mistaken for "no questions found".
    expect(screen.queryByTestId('instructor-qbank-results')).not.toBeInTheDocument();
    expect(screen.queryByTestId('instructor-qbank-no-results')).not.toBeInTheDocument();
  });
});

describe('QuestionBankPage — create-form toggle', () => {
  it('IT-QBANK-003: should swap the search panel for the create form and back when the create button and its cancel control are clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl(() => ({ data: envelope(searchResult({})) }))
    );

    renderQuestionBank();

    const createToggle = screen.getByTestId('instructor-qbank-create-toggle');
    expect(createToggle).toHaveTextContent('+ Create Question');

    // Opening the form replaces the search panel entirely — they share the
    // same slot, so an instructor never sees a stale result set next to the
    // form they are filling in.
    await user.click(createToggle);
    expect(screen.getByTestId('instructor-qbank-create-form')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create New Question' })).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Search questions by text, topic, or skill...')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('instructor-qbank-idle')).not.toBeInTheDocument();

    // The toggle doubles as the cancel control and flips its own label.
    expect(createToggle).toHaveTextContent('Cancel');
    await user.click(createToggle);
    expect(screen.queryByTestId('instructor-qbank-create-form')).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Search questions by text, topic, or skill...')
    ).toBeInTheDocument();
  });
});

describe('QuestionBankPage — loading and zero-result states', () => {
  it('IT-QBANK-004: should show the loading block while the search is in flight and then the no-questions block when the search returns an empty page', async () => {
    const user = userEvent.setup();
    let release: ((value: { data: ApiEnvelope<SearchResult> }) => void) | undefined;
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      const u = String(url ?? '');
      if (u.includes('/questions/search')) {
        return new Promise((resolve) => {
          release = resolve;
        });
      }
      return Promise.resolve({
        data: envelope([{ uid: 't-1', name: 'React cơ bản', level: 1 }]),
      });
    });

    renderQuestionBank();

    await user.type(
      await screen.findByPlaceholderText('Search questions by text, topic, or skill...'),
      'khong-co-cau-hoi'
    );
    await user.click(screen.getByRole('button', { name: 'Search' }));

    // The request is still open: the spinner replaces the idle prompt.
    expect(await screen.findByTestId('instructor-qbank-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('instructor-qbank-idle')).not.toBeInTheDocument();

    await act(async () => {
      release?.({ data: envelope(searchResult({ questions: [], total: 0, hasMore: false })) });
    });

    // A successful search that matched nothing is its own state, distinct
    // from both the idle prompt and a failure.
    const noResults = await screen.findByTestId('instructor-qbank-no-results');
    expect(noResults).toHaveTextContent('No questions found');
    expect(screen.queryByTestId('instructor-qbank-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('instructor-qbank-results')).toHaveTextContent('0');
  });
});
