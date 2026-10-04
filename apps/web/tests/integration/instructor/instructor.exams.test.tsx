/** Wave 3C — Integration: ExamsPage (instructor, /instructor/exams) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
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

import ExamsPage from '@/pages/instructor/ExamsPage';
import I18nProvider from '@/app/providers/I18nProvider';
import { ApiError, apiClient, type ApiEnvelope } from '@/config/api.config';
import type { Exam } from '@/services/api/exam.api';

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
  title: 'Bài thi mẫu',
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

const renderExams = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/instructor/exams']}>
          <ExamsPage />
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

describe('ExamsPage — loading, heading, stats and rows', () => {
  it('IT-IEXAMS-001: should show the loading spinner, then the heading, the total stat and one row per exam, when the exam list request is in flight and then resolves', async () => {
    let release: ((value: { data: ApiEnvelope<Exam[]> }) => void) | undefined;
    vi.mocked(apiClient.get).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );

    renderExams();

    // Query still pending: the spinner branch is on screen and no table exists.
    expect(screen.getByTestId('instructor-exams-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('instructor-exams-table')).not.toBeInTheDocument();

    await act(async () => {
      release?.({
        data: envelope([
          exam({ id: 'e-1', title: 'React giữa kỳ' }),
          exam({ id: 'e-2', title: 'Python cuối kỳ' }),
        ]),
      });
    });

    await waitFor(() => expect(screen.getByTestId('instructor-exams-table')).toBeInTheDocument());
    expect(screen.queryByTestId('instructor-exams-loading')).not.toBeInTheDocument();

    // The layout heading is "Bài thi"; the <th> of the same name is a
    // columnheader, so the heading role is unambiguous.
    expect(screen.getByRole('heading', { name: 'Bài thi' })).toBeInTheDocument();

    // The only stat with a real source is the count of exams.
    const stats = screen.getByTestId('instructor-exams-stats');
    expect(within(stats).getByText('Tổng bài thi')).toBeInTheDocument();
    expect(within(stats).getByText('2')).toBeInTheDocument();

    // Header row plus one row per exam, each showing the title and the id.
    const table = screen.getByTestId('instructor-exams-table');
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByText('React giữa kỳ')).toBeInTheDocument();
    expect(within(table).getByText('#e-1')).toBeInTheDocument();
    expect(within(table).getByText('Python cuối kỳ')).toBeInTheDocument();
    expect(within(table).getByText('#e-2')).toBeInTheDocument();
  });
});

describe('ExamsPage — search and status filters', () => {
  it('IT-IEXAMS-002: should narrow the rows to matching titles and keep the four status pills disabled when a search term is typed', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: envelope([
        exam({ id: 'e-1', title: 'React giữa kỳ' }),
        exam({ id: 'e-2', title: 'Python cuối kỳ' }),
      ]),
    });

    renderExams();
    await waitFor(() => expect(screen.getByTestId('instructor-exams-table')).toBeInTheDocument());

    // The Exam entity has no status column, so only "Tất cả" is usable; the
    // other four pills are shipped disabled rather than filtering to nothing.
    const filters = screen.getByTestId('instructor-exams-filters');
    expect(within(filters).getByRole('button', { name: 'Tất cả' })).toBeEnabled();
    for (const label of ['Đang diễn ra', 'Đã lên lịch', 'Đã kết thúc', 'Bản nháp']) {
      expect(within(filters).getByRole('button', { name: label })).toBeDisabled();
    }

    await user.type(screen.getByTestId('instructor-exams-search'), 'python');

    await waitFor(() => {
      expect(screen.queryByText('React giữa kỳ')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Python cuối kỳ')).toBeInTheDocument();
  });
});

describe('ExamsPage — empty state', () => {
  it('IT-IEXAMS-003: should show the empty state with a create-exam link to /instructor/exams/create when the exam list request fails', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new ApiError('Dịch vụ bài thi không sẵn sàng', 503));

    renderExams();

    const empty = await screen.findByTestId('instructor-exams-empty');
    expect(within(empty).getByText('Chưa có bài thi nào.')).toBeInTheDocument();

    // The empty state is the only route back into exam creation; the header
    // link is hidden on small viewports, so this one has to work.
    const createLink = within(empty).getByRole('link');
    expect(createLink).toHaveTextContent('Tạo đề thi');
    expect(createLink).toHaveAttribute('href', '/instructor/exams/create');

    // No rows leak through and the count falls back to zero.
    expect(screen.queryByTestId('instructor-exams-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('instructor-exams-stats')).toHaveTextContent('0');
  });
});
