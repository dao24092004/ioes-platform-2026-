/** Wave 4 / subagent 2C — Integration: ExamManagementPage (admin, /admin/exams) */
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

import ExamManagementPage from '@/pages/admin/ExamManagementPage';
import I18nProvider from '@/app/providers/I18nProvider';
import { ApiError, apiClient, type ApiEnvelope } from '@/config/api.config';
import type { AdminExamRow, AdminExamStats } from '@/services/api/exam.api';

const envelope = <T,>(data: T): ApiEnvelope<T> => ({
  success: true,
  message: 'ok',
  data,
  timestamp: '2026-09-01T00:00:00.000Z',
});

/** Bilingual: the UI ships Vietnamese first, English after a language switch. */
const LOAD_ERROR = /không tải được dữ liệu|could not load data/i;
const EMPTY = /không có bài thi nào|no exams found/i;
const LABEL = {
  practice: /luyện tập|practice/i,
  graded: /có điểm|graded/i,
  certification: /chứng chỉ|certification/i,
  all: /tất cả|all/i,
  noCourse: /chưa gắn khoá học|no course linked/i,
  duration: /phút|min/i,
  daysAgo: /^\d+ (ngày trước|d ago)$/,
} as const;

const overviewRow = (over: Partial<AdminExamRow>): AdminExamRow => ({
  id: 'e-1',
  title: 'React giữa kỳ',
  courseId: 'abcdef12-3456-7890-abcd-ef1234567890',
  instructorId: '11112222-3333-4444-5555-666677778888',
  examType: 'graded',
  timeLimitMinutes: 45,
  passingScore: 60,
  participants: 12,
  gradedAttempts: 9,
  avgScore: 78.5,
  // Fixed old timestamp: a 2026-09-01 date is always rendered in days, so the
  // assertion does not depend on when the suite happens to run.
  createdAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

const adminStats = (over: Partial<AdminExamStats>): AdminExamStats => ({
  totalExams: 3,
  totalAttempts: 31,
  inProgress: 2,
  awaitingGrading: 1,
  graded: 28,
  passed: 19,
  // 72.25 -> "72.3%" through toFixed(1) on the percent() helper.
  passRate: 67.9,
  avgScore: 72.25,
  ...over,
});

type GetReply = { data: ApiEnvelope<unknown> } | Promise<{ data: ApiEnvelope<unknown> }>;

/** Route the page's two reads to per-endpoint outcomes. */
const makeGetImpl = (opts: { stats: () => GetReply; overview: () => GetReply }) =>
  // `apiClient.get` is a generic axios method, so `mockImplementation` demands a
  // full `AxiosResponse`. These factories only ever need `.data` — the pages under
  // test read nothing else — so the cast is taken here, once, at the boundary.
  ((url: string) => {
    const u = String(url ?? '');
    if (u.includes('/api/exams/admin/stats')) return opts.stats();
    if (u.includes('/api/exams/admin/overview')) return opts.overview();
    return Promise.resolve({ data: envelope(null) });
  }) as unknown as typeof apiClient.get;

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/admin/exams']}>
          <ExamManagementPage />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
};

/**
 * Fill a controlled input with ONE input event.
 *
 * `user.type()` re-reads the element's DOM `value` before every character, so
 * under load React's re-render lands after the read and the characters
 * interleave. `paste()` is still a real user gesture but fires a single input
 * event, which is both exact and cheap.
 */
const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  el: HTMLElement,
  text: string
): Promise<void> => {
  await user.clear(el);
  await user.paste(text);
};

const kpiCards = () => screen.getAllByTestId('analytics-kpi');

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'admin.ops@ioes.test',
      full_name: 'IOES Ops Admin',
      role: 'admin' as const,
      avatar_url: null,
    },
    accessToken: 'fake-access-token',
    refreshToken: 'fake-refresh-token',
    isAuthenticated: true,
    isLoading: false,
  });
  vi.mocked(apiClient.get).mockReset();
});

describe('ExamManagementPage — stats cards and exam rows', () => {
  it('IT-ADMEXAMS-001: should show the loading row, then the six stat cards, the seven table columns and every field of each exam row, when both admin reads resolve', async () => {
    let releaseStats: ((v: { data: ApiEnvelope<AdminExamStats> }) => void) | undefined;
    let releaseOverview: ((v: { data: ApiEnvelope<AdminExamRow[]> }) => void) | undefined;
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        stats: () =>
          new Promise((resolve) => {
            releaseStats = resolve;
          }),
        overview: () =>
          new Promise((resolve) => {
            releaseOverview = resolve;
          }),
      })
    );

    renderPage();

    // Both queries still pending: the spinner branch owns the tbody.
    expect(await screen.findByTestId('admin-exams-loading')).toBeInTheDocument();
    expect(screen.queryAllByTestId('admin-exam-row')).toHaveLength(0);
    // The stat cards render their placeholder before stats arrive.
    expect(kpiCards()).toHaveLength(6);
    for (const card of kpiCards()) expect(card).toHaveTextContent('—');

    await act(async () => {
      releaseStats?.({ data: envelope(adminStats({})) });
      releaseOverview?.({
        data: envelope([
          overviewRow({ id: 'e-1', title: 'React giữa kỳ', examType: 'graded' }),
          // Second row exercises every "no data" fallback: no course, no time
          // limit and nothing graded yet, so avgScore is null.
          overviewRow({
            id: 'e-2',
            title: 'Python luyện tập',
            examType: 'practice',
            courseId: null,
            timeLimitMinutes: null,
            participants: 0,
            gradedAttempts: 0,
            avgScore: null,
          }),
        ]),
      });
    });

    expect(await screen.findAllByTestId('admin-exam-row')).toHaveLength(2);
    expect(screen.queryByTestId('admin-exams-loading')).not.toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: /quản lý bài thi|exam management/i })
    ).toBeInTheDocument();

    // Six KPI cards, in the page's own order.
    const cards = kpiCards();
    expect(cards).toHaveLength(6);
    expect(within(cards[0]!).getByText('3')).toBeInTheDocument();
    expect(within(cards[1]!).getByText('31')).toBeInTheDocument();
    expect(within(cards[2]!).getByText('2')).toBeInTheDocument();
    expect(within(cards[3]!).getByText('1')).toBeInTheDocument();
    // percent() formats with toFixed(1), so 72.25 renders as "72.3%".
    expect(within(cards[4]!).getByText('72.3%')).toBeInTheDocument();
    expect(within(cards[5]!).getByText('67.9%')).toBeInTheDocument();

    // Seven header columns, and the header plus one row per exam.
    const table = screen.getByTestId('admin-exams-table');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(7);
    expect(within(table).getAllByRole('row')).toHaveLength(3);

    const rows = screen.getAllByTestId('admin-exam-row');
    const [first, second] = rows as [HTMLElement, HTMLElement];

    // Row 1: title, relative created time, both ids truncated to 8 chars, the
    // type badge, the duration, and the three counters.
    expect(within(first).getByText('React giữa kỳ')).toBeInTheDocument();
    expect(within(first).getByText(LABEL.daysAgo)).toBeInTheDocument();
    expect(within(first).getByTestId('admin-exams-course-cell')).toHaveTextContent('abcdef12');
    expect(within(first).getByText('11112222')).toBeInTheDocument();
    expect(within(first).getByTestId('admin-exams-type-cell')).toHaveTextContent(LABEL.graded);
    expect(within(first).getByTestId('admin-exams-duration-cell')).toHaveTextContent(
      new RegExp(`45 (${LABEL.duration.source})`, 'i')
    );
    expect(within(first).getByText('12')).toBeInTheDocument();
    expect(within(first).getByText('9')).toBeInTheDocument();
    expect(within(first).getByTestId('admin-exams-avg-cell')).toHaveTextContent('78.5%');

    // Row 2: every nullable column falls back to the shared em dash, and the
    // "no course" label replaces the empty courseId.
    expect(within(second).getByText('Python luyện tập')).toBeInTheDocument();
    expect(within(second).getByTestId('admin-exams-course-cell')).toHaveTextContent(LABEL.noCourse);
    expect(within(second).getByTestId('admin-exams-type-cell')).toHaveTextContent(LABEL.practice);
    expect(within(second).getByTestId('admin-exams-duration-cell')).toHaveTextContent('—');
    expect(within(second).getByTestId('admin-exams-avg-cell')).toHaveTextContent('—');
  });
});

describe('ExamManagementPage — type tabs', () => {
  it('IT-ADMEXAMS-002: should count each exam type on its tab, narrow the rows to the selected type and restore them from the "all" tab', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        stats: () => ({ data: envelope(adminStats({ totalExams: 3 })) }),
        overview: () => ({
          data: envelope([
            overviewRow({ id: 'e-1', title: 'React giữa kỳ', examType: 'graded' }),
            overviewRow({ id: 'e-2', title: 'Python luyện tập', examType: 'practice' }),
            overviewRow({ id: 'e-3', title: 'Java chứng chỉ', examType: 'certification' }),
          ]),
        }),
      })
    );

    renderPage();
    await waitFor(() => expect(screen.getAllByTestId('admin-exam-row')).toHaveLength(3));

    // The `Exam` entity has no status, so the four "tabs" are exam TYPES: one
    // "all" plus the three values of the ExamType enum.
    const initialTabs = screen.getAllByTestId('admin-exam-status-tab');
    expect(initialTabs).toHaveLength(4);
    expect(initialTabs[0]).toHaveAttribute('aria-pressed', 'true');
    expect(initialTabs[1]).toHaveAttribute('aria-pressed', 'false');
    // Each badge counts the rows of the whole (unfiltered) list, not the
    // currently visible ones.
    expect(within(initialTabs[0]!).getByText('3')).toBeInTheDocument();
    expect(within(initialTabs[1]!).getByText('1')).toBeInTheDocument();
    expect(within(initialTabs[2]!).getByText('1')).toBeInTheDocument();
    expect(within(initialTabs[3]!).getByText('1')).toBeInTheDocument();

    // Type labels come from student.exams.type.*, mapped per exam row too.
    const rows = screen.getAllByTestId('admin-exam-row');
    expect(within(rows[0]!).getByTestId('admin-exams-type-cell')).toHaveTextContent(LABEL.graded);
    expect(within(rows[1]!).getByTestId('admin-exams-type-cell')).toHaveTextContent(LABEL.practice);
    expect(within(rows[2]!).getByTestId('admin-exams-type-cell')).toHaveTextContent(
      LABEL.certification
    );

    // Narrow to the "graded" tab.
    await user.click(screen.getAllByTestId('admin-exam-status-tab')[2]!);
    await waitFor(() => expect(screen.getAllByTestId('admin-exam-row')).toHaveLength(1));
    expect(screen.getByText('React giữa kỳ')).toBeInTheDocument();
    expect(screen.queryByText('Python luyện tập')).not.toBeInTheDocument();
    expect(screen.queryByText('Java chứng chỉ')).not.toBeInTheDocument();

    const afterClick = screen.getAllByTestId('admin-exam-status-tab');
    expect(afterClick[0]).toHaveAttribute('aria-pressed', 'false');
    expect(afterClick[2]).toHaveAttribute('aria-pressed', 'true');

    // Back to "all" restores every row, and the type badges survive the round trip.
    await user.click(screen.getAllByTestId('admin-exam-status-tab')[0]!);
    await waitFor(() => expect(screen.getAllByTestId('admin-exam-row')).toHaveLength(3));
    expect(screen.getAllByTestId('admin-exam-status-tab')[0]).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('admin-exam-search')).toBeInTheDocument();
  });
});

describe('ExamManagementPage — search', () => {
  it('IT-ADMEXAMS-003: should filter rows by a case-insensitive title match, keep the type tab applied on top, and show the empty row when nothing matches', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        stats: () => ({ data: envelope(adminStats({})) }),
        overview: () => ({
          data: envelope([
            overviewRow({ id: 'e-1', title: 'React giữa kỳ', examType: 'graded' }),
            overviewRow({ id: 'e-2', title: 'Python cuối kỳ', examType: 'practice' }),
            overviewRow({ id: 'e-3', title: 'react hooks nâng cao', examType: 'practice' }),
          ]),
        }),
      })
    );

    renderPage();
    await waitFor(() => expect(screen.getAllByTestId('admin-exam-row')).toHaveLength(3));

    // The search lowercases the needle and the title, so an upper-case query
    // still matches the lower-case title on row 3.
    await fill(user, screen.getByTestId('admin-exam-search'), 'REACT');
    await waitFor(() => expect(screen.getAllByTestId('admin-exam-row')).toHaveLength(2));
    expect(screen.getByText('React giữa kỳ')).toBeInTheDocument();
    expect(screen.getByText('react hooks nâng cao')).toBeInTheDocument();
    expect(screen.queryByText('Python cuối kỳ')).not.toBeInTheDocument();

    // Search and type tab are both applied: a graded-only tab keeps one of the two.
    await user.click(screen.getAllByTestId('admin-exam-status-tab')[2]!);
    await waitFor(() => expect(screen.getAllByTestId('admin-exam-row')).toHaveLength(1));
    expect(screen.getByText('React giữa kỳ')).toBeInTheDocument();
    expect(screen.queryByText('react hooks nâng cao')).not.toBeInTheDocument();

    // A term that matches nothing in the remaining type leaves the empty row.
    await fill(user, screen.getByTestId('admin-exam-search'), 'python');
    const empty = await screen.findByTestId('admin-exams-empty');
    expect(empty).toHaveTextContent(EMPTY);
    // The empty message still spans the full seven-column table.
    expect(within(empty).getByRole('cell')).toHaveAttribute('colspan', '7');
    expect(screen.queryAllByTestId('admin-exam-row')).toHaveLength(0);
    expect(screen.queryByTestId('admin-exams-error-row')).not.toBeInTheDocument();
  });
});

describe('ExamManagementPage — the two failure states are independent', () => {
  it('IT-ADMEXAMS-004: should show the stats-error banner with em-dash cards while the table still lists rows, and then show only the colSpan=7 table error row with no banner when the overview read fails', async () => {
    const user = userEvent.setup();
    const gatewayDown = () =>
      Promise.reject(new ApiError('Unable to find instance for exam-suite', 503));

    // --- A: only the stats read fails. ---
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        stats: gatewayDown,
        overview: () => ({ data: envelope([overviewRow({ id: 'e-1', title: 'React giữa kỳ' })]) }),
      })
    );

    const first = renderPage();

    const banner = await screen.findByTestId('admin-exams-stats-error');
    expect(banner).toHaveTextContent(LOAD_ERROR);
    // Every card falls back to the em dash instead of a fake 0.
    expect(kpiCards()).toHaveLength(6);
    for (const card of kpiCards()) expect(card).toHaveTextContent('—');
    // The list is a separate query and still succeeds.
    expect(await screen.findByTestId('admin-exam-row')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-exams-error-row')).not.toBeInTheDocument();

    // --- B: only the overview read fails. ---
    first.unmount();
    vi.mocked(apiClient.get).mockImplementation(
      makeGetImpl({
        stats: () => ({ data: envelope(adminStats({})) }),
        overview: gatewayDown,
      })
    );

    renderPage();

    const errorRow = await screen.findByTestId('admin-exams-error-row');
    expect(errorRow).toHaveTextContent(LOAD_ERROR);
    // One error message, spanning all seven columns of the table.
    expect(within(errorRow).getAllByRole('cell')).toHaveLength(1);
    expect(within(errorRow).getByRole('cell')).toHaveAttribute('colspan', '7');
    // The stats query succeeded here, so the banner must NOT appear and the
    // cards must carry real numbers.
    expect(screen.queryByTestId('admin-exams-stats-error')).not.toBeInTheDocument();
    expect(kpiCards()).toHaveLength(6);
    expect(within(kpiCards()[0]!).getByText('3')).toBeInTheDocument();
    // The empty row is a different state from the error row.
    expect(screen.queryByTestId('admin-exams-empty')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('admin-exam-row')).toHaveLength(0);

    // The search box and the tabs stay usable on top of the error state.
    expect(screen.getByTestId('admin-exam-search')).toBeEnabled();
    await user.click(screen.getAllByTestId('admin-exam-status-tab')[1]!);
    expect(screen.getByTestId('admin-exams-error-row')).toBeInTheDocument();
  });
});
