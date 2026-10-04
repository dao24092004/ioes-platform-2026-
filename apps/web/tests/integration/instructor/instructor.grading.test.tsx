/** Wave 3C — Integration: GradingPage (instructor, /instructor/grading) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

import GradingPage from '@/pages/instructor/GradingPage';
import I18nProvider from '@/app/providers/I18nProvider';
import { ApiError, apiClient, type ApiEnvelope } from '@/config/api.config';
import type { Exam, GradeResult, GradingQueueItem } from '@/services/api/exam.api';

const envelope = <T,>(data: T): ApiEnvelope<T> => ({
  success: true,
  message: 'ok',
  data,
  timestamp: '2026-09-01T00:00:00.000Z',
});

const exam = (over: Partial<Exam>): Exam => ({
  id: 'e-1',
  courseId: null,
  instructorId: 'i-1',
  title: 'React giữa kỳ',
  description: null,
  examType: 'graded',
  timeLimitMinutes: 45,
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

const queueItem = (over: Partial<GradingQueueItem>): GradingQueueItem => ({
  attemptId: 'att-1',
  examId: 'e-1',
  userId: 'user-1234-5678',
  submittedAt: '2026-09-01T00:00:00.000Z',
  waitingSeconds: 120,
  score: 7,
  maxScore: 10,
  ...over,
});

const gradeResult = (over: Partial<GradeResult>): GradeResult => ({
  score: 8,
  maxScore: 10,
  percentageScore: 80,
  passed: true,
  autoGradedCount: 5,
  manualGradedCount: 0,
  finalGrading: false,
  ...over,
});

/** Route the three reads the page makes on mount to per-endpoint outcomes. */
const makeGetImpl = (opts: {
  stats?: () => { data: ApiEnvelope<unknown> } | Promise<{ data: ApiEnvelope<unknown> }>;
  queue?: () => { data: ApiEnvelope<unknown> } | Promise<{ data: ApiEnvelope<unknown> }>;
  exams?: () => { data: ApiEnvelope<unknown> } | Promise<{ data: ApiEnvelope<unknown> }>;
}) =>
  // `apiClient.get` is a generic axios method, so `mockImplementation` demands a
  // full `AxiosResponse`. These factories only ever need `.data` — the pages under
  // test read nothing else — so the cast is taken here, once, at the boundary.
  ((url: string) => {
    const u = String(url ?? '');
    if (u.includes('/api/exams/grading/stats')) return opts.stats!();
    if (u.includes('/api/exams/grading/queue')) return opts.queue!();
    if (u.includes('/api/exams')) return opts.exams!();
    return Promise.resolve({ data: envelope(null) });
  }) as unknown as typeof apiClient.get;

const renderGrading = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/instructor/grading']}>
          <GradingPage />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
};

const okStats = () => ({
  data: envelope({ pending: 7, graded: 3, oldestPendingSubmittedAt: '2020-01-01T00:00:00.000Z' }),
});
const okExams = () => ({ data: envelope([exam({ id: 'e-1', title: 'React giữa kỳ' })]) });

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
  vi.mocked(apiClient.post).mockReset();
});

describe('GradingPage — stats and queue rows', () => {
  it('IT-GRADING-001: should render the three stat tiles and one row per queue item with the truncated user id, exam title and score when the queue resolves', async () => {
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        stats: okStats,
        queue: () => ({
          data: envelope([
            queueItem({
              attemptId: 'att-1',
              examId: 'e-1',
              userId: 'user-1234-5678',
              score: 7,
              maxScore: 10,
            }),
            queueItem({
              attemptId: 'att-2',
              examId: 'e-2',
              userId: 'user-8765-4321',
              score: null,
              maxScore: null,
            }),
          ]),
        }),
        exams: () => ({
          data: envelope([
            exam({ id: 'e-1', title: 'React giữa kỳ' }),
            exam({ id: 'e-2', title: 'Python cuối kỳ' }),
          ]),
        }),
      })
    );

    renderGrading();

    expect(screen.getByRole('heading', { name: 'Chấm điểm' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Chấm tự động' })).toHaveLength(2)
    );

    // The three stat tiles are fed by GET /exams/grading/stats.
    const stats = screen.getByTestId('instructor-grading-stats');
    expect(within(stats).getByText('Bài chờ chấm')).toBeInTheDocument();
    expect(within(stats).getByText('7')).toBeInTheDocument();
    expect(within(stats).getByText('Đã chấm')).toBeInTheDocument();
    expect(within(stats).getByText('3')).toBeInTheDocument();
    expect(within(stats).getByText('Bài chờ lâu nhất nộp')).toBeInTheDocument();
    // A 2020 timestamp is always rendered in days, whatever "now" is.
    expect(within(stats).getByText(/^\d+ ngày trước$/)).toBeInTheDocument();

    // Queue rows: the backend only returns a user id, so it is truncated to
    // the first 8 characters, and the exam title is resolved per examId from
    // the instructor's own exam list.
    const queue = screen.getByTestId('instructor-grading-queue');
    expect(within(queue).getAllByRole('row')).toHaveLength(3);
    expect(within(queue).getByText('user-123')).toBeInTheDocument();
    expect(within(queue).getByText('React giữa kỳ')).toBeInTheDocument();
    expect(within(queue).getByText('7/10')).toBeInTheDocument();

    // A second attempt on a different exam resolves to that exam's own title,
    // and an ungraded attempt shows the shared placeholder, never 0/0.
    expect(within(queue).getByText('user-876')).toBeInTheDocument();
    expect(within(queue).getByText('Python cuối kỳ')).toBeInTheDocument();
    expect(within(queue).getAllByText('—')).toHaveLength(1);
  });
});

describe('GradingPage — empty state', () => {
  it('IT-GRADING-002: should show the empty-state row and no grade buttons when the grading queue is empty', async () => {
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({ stats: okStats, queue: () => ({ data: envelope([]) }), exams: okExams })
    );

    renderGrading();

    const empty = await screen.findByTestId('instructor-grading-empty');
    expect(empty).toHaveTextContent('Không có bài nào chờ chấm');
    expect(screen.queryByTestId('instructor-grading-grade-button')).not.toBeInTheDocument();
  });
});

describe('GradingPage — error banners', () => {
  it('IT-GRADING-003: should show the load-error banner and the grade-error banner with the backend message when the stats request and the grade request both fail', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        // Only the stats read fails, so the queue still renders a gradeable row.
        stats: () => Promise.reject(new ApiError('Thống kê tạm thời không tải được', 503)),
        queue: () => ({ data: envelope([queueItem({})]) }),
        exams: okExams,
      })
    );
    vi.mocked(apiClient.post).mockRejectedValue(new ApiError('Không chấm được bài này', 500));

    renderGrading();

    const loadError = await screen.findByTestId('instructor-grading-load-error');
    expect(loadError).toHaveTextContent('Không tải được dữ liệu. Thử lại sau.');

    await user.click(await screen.findByTestId('instructor-grading-grade-button'));

    const gradeError = await screen.findByTestId('instructor-grading-grade-error');
    expect(gradeError).toHaveTextContent('Chấm bài thất bại: Không chấm được bài này');
    expect(screen.queryByTestId('instructor-grading-grade-success')).not.toBeInTheDocument();
  });
});

describe('GradingPage — grade success', () => {
  it('IT-GRADING-004: should show the success banner with the score, max score and one-decimal percentage when the grade request resolves', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        stats: okStats,
        queue: () => ({ data: envelope([queueItem({})]) }),
        exams: okExams,
      })
    );
    vi.mocked(apiClient.post).mockResolvedValue({
      data: envelope(gradeResult({ score: 8, maxScore: 10, percentageScore: 82.5 })),
    });

    renderGrading();

    await user.click(await screen.findByTestId('instructor-grading-grade-button'));

    // percentageScore is rendered with toFixed(1) so 82.5 shows as "82.5"
    // and an integer such as 80 would show as "80.0" — no locale drift.
    const success = await screen.findByTestId('instructor-grading-grade-success');
    expect(success).toHaveTextContent('Đã chấm: 8/10 (82.5%)');
    expect(screen.queryByTestId('instructor-grading-grade-error')).not.toBeInTheDocument();
  });
});
