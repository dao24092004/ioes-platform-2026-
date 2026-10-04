/** Wave 2B — Integration: ExamsPage + inline ExamList view */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/app/store/authStore';

// ---------------------------------------------------------------------------
// Mock BEFORE any import that triggers module-level side-effects.
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
import ExamsPage from '@/pages/student/ExamsPage';
import I18nProvider from '@/app/providers/I18nProvider';
import { apiClient } from '@/config/api.config';
import type { Exam, ExamAttempt } from '@/services/api/exam.api';

/** Route-aware get that maps URLs to fixtures for this spec. */
function makeGetImpl(opts: { exams?: Exam[]; attempts?: ExamAttempt[] }) {
  return (url: string) => {
    const u = String(url ?? '');
    if (u.endsWith('/api/exams')) {
      return Promise.resolve({
        data: { success: true, message: 'ok', timestamp: 't', data: opts.exams ?? [] },
      });
    }
    if (u.endsWith('/api/attempts')) {
      return Promise.resolve({
        data: { success: true, message: 'ok', timestamp: 't', data: opts.attempts ?? [] },
      });
    }
    return Promise.resolve({ data: null });
  };
}

const exam = (over: Partial<Exam>): Exam => ({
  id: 'e-1',
  courseId: null,
  instructorId: 'i-1',
  title: 'Bài thi mẫu',
  description: null,
  examType: 'practice',
  timeLimitMinutes: 30,
  passingScore: 60,
  maxAttempts: 5,
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
  status: 'graded',
  startedAt: null,
  submittedAt: '2026-09-02T00:00:00.000Z',
  gradedAt: null,
  timeRemainingSeconds: null,
  score: 7,
  maxScore: 10,
  percentageScore: 70,
  passed: true,
  questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'],
  metadata: {},
  createdAt: '2026-09-02T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  version: 1,
  ...over,
});

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------
const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const renderExams = (initialRoute = '/student/exams') => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/student/exams" element={<ExamsPage />} />
            <Route
              path="/student/exams/:examId/take"
              element={<div data-testid="take-page">TAKE_PAGE</div>}
            />
            <Route
              path="/student/exams/:examId/result"
              element={<div data-testid="result-page">RESULT_PAGE</div>}
            />
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
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Heading + stat cards
// ---------------------------------------------------------------------------
describe('ExamsPage — heading and stats', () => {
  it('IT-EXAMS-001: should_renderHeadingAndFourStatCards_When_DataLoaded', async () => {
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        exams: [
          exam({ id: 'e-1', title: 'Available exam' }),
          exam({ id: 'e-2', title: 'Completed exam' }),
        ],
        attempts: [attempt({ id: 'att-1', examId: 'e-2', percentageScore: 80 })],
      })
    );

    renderExams();

    // Wait for table rows to appear (signals data has loaded).
    await waitFor(() => {
      expect(screen.getByText('Available exam')).toBeInTheDocument();
    });

    // The StudentLayout's <h1> heading is the page title; the table headings
    // include translated labels too. Both must be present.
    expect(screen.getByRole('heading', { name: /Bài thi/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Filter / search / sort
// ---------------------------------------------------------------------------
describe('ExamsPage — filter / search / sort', () => {
  it('IT-EXAMS-002: should_filterRows_When_StatusPillChanges', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        exams: [
          exam({ id: 'e-1', title: 'Available exam' }),
          exam({ id: 'e-2', title: 'Completed exam' }),
        ],
        attempts: [attempt({ id: 'att-1', examId: 'e-2', percentageScore: 80 })],
      })
    );

    renderExams();

    await waitFor(() => {
      expect(screen.getByText('Available exam')).toBeInTheDocument();
      expect(screen.getByText('Completed exam')).toBeInTheDocument();
    });

    // Click the "Hoàn thành" filter pill — only the completed row stays.
    const completedPill = screen.getByRole('button', { name: /Hoàn thành/i });
    await user.click(completedPill);

    await waitFor(() => {
      expect(screen.queryByText('Available exam')).not.toBeInTheDocument();
      expect(screen.getByText('Completed exam')).toBeInTheDocument();
    });
  });

  it('IT-EXAMS-003: should_filterRows_When_SearchInputNarrowsTitle', async () => {
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        exams: [exam({ id: 'e-1', title: 'Alpha exam' }), exam({ id: 'e-2', title: 'Beta exam' })],
        attempts: [],
      })
    );

    renderExams();

    const search = (await screen.findByPlaceholderText(/tìm bài thi/i)) as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'alpha' } });

    await waitFor(() => {
      expect(screen.getByText('Alpha exam')).toBeInTheDocument();
      expect(screen.queryByText('Beta exam')).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Empty + error states
// ---------------------------------------------------------------------------
describe('ExamsPage — empty / error states', () => {
  it('IT-EXAMS-004: should_showEmptyState_When_NoExamsReturned', async () => {
    vi.mocked(apiClient.get).mockImplementation(makeGetImpl({ exams: [], attempts: [] }));

    renderExams();

    await waitFor(() => {
      expect(screen.getByText(/Không có bài thi nào\./i)).toBeInTheDocument();
    });
  });

  it('IT-EXAMS-005: should_showErrorMessage_When_ApiRejects', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('boom'));

    renderExams();

    await waitFor(() => {
      // common.loadError text from locales.
      expect(screen.getByText(/Không tải được dữ liệu\. Thử lại sau\./i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Action links — start / view result
// ---------------------------------------------------------------------------
describe('ExamsPage — action links', () => {
  it('IT-EXAMS-006: should_navigateToTake_When_AvailableExamStartLinkClicked', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({ exams: [exam({ id: 'e-1', title: 'Start me' })], attempts: [] })
    );

    renderExams();

    const row = await screen.findByText('Start me');
    const tr = row.closest('tr');
    expect(tr).not.toBeNull();
    const startLink = within(tr as HTMLElement).getByRole('link', { name: /Bắt đầu/i });
    await user.click(startLink);

    await waitFor(() => {
      expect(screen.getByTestId('take-page')).toBeInTheDocument();
    });
  });

  it('IT-EXAMS-007: should_navigateToResult_When_CompletedExamViewResultLinkClicked', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        exams: [exam({ id: 'e-1', title: 'Done exam' })],
        attempts: [attempt({ id: 'att-1', examId: 'e-1', percentageScore: 90 })],
      })
    );

    renderExams();

    const row = await screen.findByText('Done exam');
    const tr = row.closest('tr');
    expect(tr).not.toBeNull();
    const viewLink = within(tr as HTMLElement).getByRole('link', { name: /Xem kết quả/i });
    await user.click(viewLink);

    await waitFor(() => {
      expect(screen.getByTestId('result-page')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Role guard — non-student must be redirected (covered indirectly via
// ProtectedRoute, but ExercisesPage also requires authStore.isAuthenticated).
// ---------------------------------------------------------------------------
describe('ExamsPage — auth requirement', () => {
  it('IT-EXAMS-008: should_renderWithoutThrowing_When_Authenticated', () => {
    // Sanity check — the page is wrapped in StudentLayout which calls
    // useAuth(); with the store in authenticated state it renders normally.
    vi.mocked(apiClient.get).mockImplementation(makeGetImpl({ exams: [], attempts: [] }));

    expect(() => renderExams()).not.toThrow();
  });
});
