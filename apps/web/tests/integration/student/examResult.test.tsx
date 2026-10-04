/** Wave 2B — Integration: ExamResultsPage (inline ExamResult view) */
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
import ExamResultsPage from '@/pages/student/ExamResultsPage';
import I18nProvider from '@/app/providers/I18nProvider';
import { apiClient } from '@/config/api.config';
import type { Exam, ExamAttempt } from '@/services/api/exam.api';

/** Route-aware mock: maps URLs to fixtures. */
function makeGetImpl(opts: { attempts?: ExamAttempt[]; exam?: Exam }) {
  return (url: string) => {
    const u = String(url ?? '');
    if (u === '/api/attempts') {
      return Promise.resolve({
        data: opts.attempts
          ? { success: true, message: 'ok', timestamp: 't', data: opts.attempts }
          : { success: true, message: 'ok', timestamp: 't', data: [] },
      });
    }
    if (u.match(/\/api\/exams\/[^/]+$/)) {
      return Promise.resolve({
        data: opts.exam
          ? { success: true, message: 'ok', timestamp: 't', data: opts.exam }
          : { success: true, message: 'ok', timestamp: 't', data: null },
      });
    }
    return Promise.resolve({ data: null });
  };
}

const exam = (over: Partial<Exam>): Exam => ({
  id: 'e-1',
  courseId: null,
  instructorId: 'i-1',
  title: 'Bài thi cuối khoá',
  description: null,
  examType: 'graded',
  timeLimitMinutes: 45,
  passingScore: 50,
  maxAttempts: 3,
  isRandomized: false,
  showResults: true,
  isProctored: false,
  metadata: {},
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  deletedAt: null,
  version: 1,
  ...over,
});

const attempt = (over: Partial<ExamAttempt>): ExamAttempt => ({
  id: 'att-1',
  examId: 'e-1',
  userId: 'u-1',
  status: 'graded',
  startedAt: '2026-08-30T09:00:00.000Z',
  submittedAt: '2026-08-30T10:00:00.000Z',
  gradedAt: '2026-08-30T10:05:00.000Z',
  timeRemainingSeconds: null,
  score: 8,
  maxScore: 10,
  percentageScore: 80,
  passed: true,
  questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'],
  metadata: {},
  createdAt: '2026-08-30T09:00:00.000Z',
  updatedAt: '2026-08-30T10:05:00.000Z',
  version: 1,
  ...over,
});

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------
const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderResults = (initialRoute = '/student/exams/e-1/result') => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/student/exams/:examId/result" element={<ExamResultsPage />} />
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
// Happy path: result card for the exam in the URL
// ---------------------------------------------------------------------------
describe('ExamResultsPage — happy path', () => {
  it('IT-EXAMRESULT-001: should_renderPassedBadge_AndScoreCard_When_AttemptsForExamReturned', async () => {
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        exam: exam({ id: 'e-1', title: 'Bài thi cuối khoá' }),
        attempts: [
          attempt({
            id: 'att-1',
            examId: 'e-1',
            score: 8,
            maxScore: 10,
            percentageScore: 80,
            passed: true,
            submittedAt: '2026-08-30T10:00:00.000Z',
            questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'],
          }),
        ],
      })
    );

    renderResults('/student/exams/e-1/result');

    // The exam title is rendered in the result card.
    await waitFor(() => {
      expect(screen.getAllByText('Bài thi cuối khoá').length).toBeGreaterThanOrEqual(1);
    });
    // "ĐẬU" badge (passed=true) is rendered.
    expect(screen.getByText('ĐẬU')).toBeInTheDocument();
    // The "Quay lại danh sách bài thi" link is rendered.
    const back = screen.getByRole('link', { name: /Quay lại danh sách bài thi/i });
    expect(back).toHaveAttribute('href', '/student/exams');
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
describe('ExamResultsPage — empty state', () => {
  it('IT-EXAMRESULT-002: should_renderEmptyMessage_When_NoSubmittedAttempts', async () => {
    // No attempts and no exam payload. The page shows the empty state
    // ("Chưa có bài thi nào đã nộp.") from i18n.
    vi.mocked(apiClient.get).mockImplementation(makeGetImpl({ attempts: [] }));

    renderResults('/student/exams/e-1/result');

    await waitFor(() => {
      expect(screen.getByText(/Chưa có bài thi nào đã nộp\./i)).toBeInTheDocument();
    });
  });
});
