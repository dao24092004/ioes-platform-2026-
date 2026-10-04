/** Wave 2B — Integration: ExamTakingPage */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/app/store/authStore';

// ---------------------------------------------------------------------------
// Mock BEFORE any import that triggers module-level side-effects.
// We pull in the real module first so `unwrap` is preserved — the
// exam.api wrappers call `unwrap` to extract `envelope.data`, and
// returning a bare `{ data: [] }` from the mock makes every call reject.
// ---------------------------------------------------------------------------
vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

// ---------------------------------------------------------------------------
// Import AFTER mocks.
// ---------------------------------------------------------------------------
import ExamTakingPage from '@/pages/student/ExamTakingPage';
import I18nProvider from '@/app/providers/I18nProvider';
import { apiClient } from '@/config/api.config';
import type { Exam, ExamAttempt, Question } from '@/services/api/exam.api';

/** Route-aware mock: maps URLs to fixtures for this spec. */
function makeGetImpl(opts: { exam?: Exam; attempt?: ExamAttempt; questions?: Question[] }) {
  return (url: string) => {
    const u = String(url ?? '');
    if (u.includes('/api/exams/') && u.endsWith('/start')) {
      // startExam is a POST but the route-aware helper is the GET closure
      // for the page's other reads. Keep the URL pattern here for any
      // accidental mis-routing through .get.
      return Promise.reject(new Error('start should be POST'));
    }
    if (u.match(/\/api\/exams\/[^/]+$/)) {
      return Promise.resolve({
        data: opts.exam
          ? { success: true, message: 'ok', timestamp: 't', data: opts.exam }
          : { success: true, message: 'ok', timestamp: 't', data: null },
      });
    }
    if (u.match(/\/api\/attempts\/[^/]+$/)) {
      return Promise.resolve({
        data: {
          success: true,
          message: 'ok',
          timestamp: 't',
          data: {
            attempt: opts.attempt,
            questions: opts.questions ?? [],
            includeCorrectAnswers: false,
          },
        },
      });
    }
    return Promise.resolve({ data: null });
  };
}

const exam = (over: Partial<Exam>): Exam => ({
  id: 'e-1',
  courseId: null,
  instructorId: 'i-1',
  title: 'Bài thi tổng hợp',
  description: null,
  examType: 'practice',
  timeLimitMinutes: 30,
  passingScore: 60,
  maxAttempts: 3,
  isRandomized: false,
  showResults: true,
  isProctored: false,
  metadata: {},
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
  version: 1,
  ...over,
});

const attempt = (over: Partial<ExamAttempt>): ExamAttempt => ({
  id: 'att-1',
  examId: 'e-1',
  userId: 'u-1',
  status: 'in_progress',
  startedAt: '2026-09-01T10:00:00.000Z',
  submittedAt: null,
  gradedAt: null,
  timeRemainingSeconds: 1500,
  score: null,
  maxScore: null,
  percentageScore: null,
  passed: null,
  questionIds: ['q1'],
  metadata: {},
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  version: 1,
  ...over,
});

const question = (over: Partial<Question>): Question => ({
  id: 'q1',
  questionText: 'Câu hỏi mẫu?',
  questionType: 'multiple_choice',
  difficulty: 'easy',
  points: 1,
  hint: null,
  explanation: null,
  estimatedTimeSeconds: 30,
  topicId: 't1',
  options: [
    { id: 'o1', optionText: 'Lựa chọn A', sortOrder: 0 },
    { id: 'o2', optionText: 'Lựa chọn B', sortOrder: 1 },
  ],
  ...over,
});

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------
const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderTaking = (initialRoute = '/student/exams/e-1/take') => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/student/exams/:examId/take" element={<ExamTakingPage />} />
            <Route path="/student/exams" element={<div data-testid="exams-page-stub">EXAMS</div>} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
};

const setAuth = () => {
  useAuthStore.setState({
    user: {
      id: 'u-1',
      email: 'student@ioes.com',
      full_name: 'Student One',
      role: 'student' as const,
      avatar_url: null,
    },
    accessToken: 'fake-access-token',
    refreshToken: 'fake-refresh-token',
    isAuthenticated: true,
    isLoading: false,
  });
};

beforeEach(() => {
  setAuth();
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Happy path: exam loads
// ---------------------------------------------------------------------------
describe('ExamTakingPage — happy path', () => {
  it('IT-EXAMTAKING-001: should_renderExamTitle_AndQuestionCount_When_ExamAndAttemptLoaded', async () => {
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        exam: exam({ id: 'e-1', title: 'Bài thi tổng hợp' }),
        attempt: attempt({ id: 'att-1' }),
        questions: [question({ id: 'q1', questionText: 'Câu hỏi mẫu?' })],
      })
    );
    vi.mocked(apiClient.post).mockImplementation((url: unknown) => {
      const u = String(url ?? '');
      if (u.endsWith('/start')) {
        return Promise.resolve({
          data: {
            success: true,
            message: 'ok',
            timestamp: 't',
            data: { attempt: attempt({ id: 'att-1' }), totalQuestions: 1 },
          },
        });
      }
      return Promise.resolve({ data: null });
    });

    renderTaking('/student/exams/e-1/take');

    // The exam title is rendered in the header card.
    await waitFor(() => {
      expect(screen.getByText('Bài thi tổng hợp')).toBeInTheDocument();
    });
    // First question text is rendered.
    expect(screen.getByText('Câu hỏi mẫu?')).toBeInTheDocument();
    // Navigator summary text is rendered.
    expect(screen.getByText(/Đã trả lời/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------
describe('ExamTakingPage — error state', () => {
  it('IT-EXAMTAKING-002: should_renderStartError_AndBackLink_When_StartRequestFails', async () => {
    // Exam detail rejects, so examQuery.error is set; page renders the
    // FullScreenMessage with startError text + back link.
    vi.mocked(apiClient.get).mockImplementation((url: unknown) => {
      const u = String(url ?? '');
      if (u.match(/\/api\/exams\/[^/]+$/)) {
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve({ data: null });
    });
    vi.mocked(apiClient.post).mockImplementation((url: unknown) => {
      const u = String(url ?? '');
      if (u.endsWith('/start')) {
        return Promise.resolve({
          data: {
            success: true,
            message: 'ok',
            timestamp: 't',
            data: { attempt: null, totalQuestions: 0 },
          },
        });
      }
      return Promise.resolve({ data: null });
    });

    renderTaking('/student/exams/e-1/take');

    await waitFor(() => {
      // Page renders the "Không bắt đầu được bài thi" message from i18n.
      expect(screen.getByText(/Không bắt đầu được bài thi/i)).toBeInTheDocument();
    });
    // The back-to-exams link is present and points to /student/exams.
    const back = screen.getByRole('link', { name: /Về danh sách bài thi/i });
    expect(back).toHaveAttribute('href', '/student/exams');
  });
});

// ---------------------------------------------------------------------------
// Empty state: no questions
// ---------------------------------------------------------------------------
describe('ExamTakingPage — empty state', () => {
  it('IT-EXAMTAKING-003: should_renderNoQuestionsMessage_When_AttemptHasNoQuestions', async () => {
    // Start and exam detail succeed, but the detail returns an empty
    // questions list. The page renders the "Bài thi này chưa có câu hỏi
    // nào" message + back link.
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        exam: exam({ id: 'e-1', title: 'Bài thi trống' }),
        attempt: attempt({ id: 'att-1' }),
        questions: [],
      })
    );
    vi.mocked(apiClient.post).mockImplementation((url: unknown) => {
      const u = String(url ?? '');
      if (u.endsWith('/start')) {
        return Promise.resolve({
          data: {
            success: true,
            message: 'ok',
            timestamp: 't',
            data: { attempt: attempt({ id: 'att-1' }), totalQuestions: 0 },
          },
        });
      }
      return Promise.resolve({ data: null });
    });

    renderTaking('/student/exams/e-1/take');

    await waitFor(() => {
      expect(screen.getByText(/Bài thi này chưa có câu hỏi nào/i)).toBeInTheDocument();
    });
    // The back-to-exams link is present.
    const back = screen.getByRole('link', { name: /Về danh sách bài thi/i });
    expect(back).toHaveAttribute('href', '/student/exams');
  });
});
