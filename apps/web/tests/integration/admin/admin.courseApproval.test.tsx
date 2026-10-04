/** Wave 4B (admin) — Integration: CourseApprovalPage (`/admin/courses/approval`). */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
  };
});

import CourseApprovalPage from '@/pages/admin/CourseApprovalPage';
import I18nProvider from '@/app/providers/I18nProvider';
import { ApiError, apiClient } from '@/config/api.config';
import type {
  Category,
  Chapter,
  Course,
  CoursePage,
  CourseStats,
} from '@/services/api/content.api';
import { useAuthStore } from '@/app/store/authStore';

/** Bilingual — the UI ships Vietnamese first, English after a language switch. */
const LOAD_ERROR = /không tải được dữ liệu|could not load data/i;
const EMPTY = /không có khóa học nào|no courses found/i;
const L = {
  pending: /chờ duyệt|pending/i,
  rejected: /bị từ chối|rejected/i,
  notSubmitted: /chưa gửi duyệt|not submitted/i,
  uncategorized: /chưa phân loại|uncategorized/i,
  reason: /lý do từ chối|rejection reason/i,
  preview: /xem trước|preview/i,
  viewDetail: /xem chi tiết|view detail/i,
  students: /học viên|students/i,
  updated: /cập nhật|updated/i,
  approve: /phê duyệt|approve/i,
  reject: /từ chối|reject/i,
  draft: /bản nháp|draft/i,
  section: /^phần$|^section$/i,
} as const;

const CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Programming',
    slug: 'lap-trinh',
    description: null,
    parentId: null,
    icon: null,
    sortOrder: 1,
  },
  {
    id: 'cat-2',
    name: 'Design',
    slug: 'thiet-ke',
    description: null,
    parentId: null,
    icon: null,
    sortOrder: 2,
  },
];

/** Noon UTC, so dd/MM/yyyy is stable in any timezone within ±11h of UTC. */
const STAMP = '2026-06-15T12:00:00Z';
const FORMATTED = '15/06/2026';

const makeCourse = (over: Partial<Course> = {}): Course => ({
  id: 'c-1',
  instructorId: 'i-1',
  categoryId: 'cat-1',
  title: 'React Testing Deep Dive',
  slug: 'react-testing',
  shortDescription: 'A short summary',
  description: null,
  thumbnailUrl: null,
  previewVideoUrl: null,
  price: 0,
  currency: 'VND',
  durationHours: null,
  difficultyLevel: null,
  language: 'vi',
  status: 'draft',
  reviewStatus: 'pending',
  rejectionReason: null,
  publishedAt: null,
  stats: { enrollments: 12 },
  createdAt: STAMP,
  updatedAt: STAMP,
  ...over,
});

const coursePage = (data: Course[]): CoursePage => ({
  data,
  meta: { total: data.length, page: 1, perPage: 50, totalPages: 1 },
});

const COURSE_STATS: CourseStats = {
  total: 42,
  draft: 10,
  published: 25,
  archived: 7,
  pendingReview: 5,
  approved: 20,
  rejected: 2,
};

const chapter = (id: string, lessons: number): Chapter => ({
  id,
  courseId: 'c-1',
  title: `Chapter ${id}`,
  description: null,
  sortOrder: 1,
  isFree: null,
  lessons: Array.from({ length: lessons }, (_, i) => ({
    id: `${id}-l${i}`,
    chapterId: id,
    title: `Lesson ${i}`,
    description: null,
    lessonType: 'video' as const,
    contentUrl: null,
    durationMinutes: null,
    sortOrder: i,
    isFree: null,
    isPreview: null,
  })),
});

/** content-service returns the DTO itself, not an envelope. */
type Reply = { data: unknown } | Promise<{ data: unknown }>;

const makeGet = (opts: {
  stats?: () => Reply;
  list?: (params: Record<string, unknown>) => Reply;
  detail?: (id: string) => Reply;
  categories?: () => Reply;
}) =>
  // `apiClient.get` is a generic axios method, so `mockImplementation` demands a
  // full `AxiosResponse`. These factories only ever need `.data` — the pages under
  // test read nothing else — so the cast is taken here, once, at the boundary.
  ((url: string, config?: { params?: Record<string, unknown> }) => {
    const u = String(url ?? '');
    const params = (config?.params ?? {}) as Record<string, unknown>;
    // `/api/v1/courses/stats` also startsWith `/api/v1/courses`, so test it first.
    if (u.endsWith('/api/v1/courses/stats')) return opts.stats?.() ?? { data: COURSE_STATS };
    if (u.endsWith('/api/v1/categories')) return opts.categories?.() ?? { data: CATEGORIES };
    const detail = /\/api\/v1\/courses\/([^/]+)\/detail$/.exec(u);
    if (detail)
      return opts.detail?.(detail[1]!) ?? { data: { course: makeCourse(), chapters: [] } };
    if (u.endsWith('/api/v1/courses')) return opts.list?.(params) ?? { data: coursePage([]) };
    throw new Error(`unexpected GET ${u}`);
  }) as unknown as typeof apiClient.get;

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/admin/courses/approval']}>
          <CourseApprovalPage />
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

/** Every `reviewStatus` the list query was asked for, in call order. */
const listFilters = () =>
  vi
    .mocked(apiClient.get)
    .mock.calls.filter(([url]) => String(url).endsWith('/api/v1/courses'))
    .map(([, config]) => (config?.params ?? {}) as Record<string, unknown>);

const postsTo = (suffix: string) =>
  vi
    .mocked(apiClient.post)
    .mock.calls.filter(([url]) => String(url).endsWith(suffix))
    .map(([, body]) => body);

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
  vi.mocked(apiClient.post).mockReset();
});

// ---------------------------------------------------------------------------
// IT-ADMCOURSE-001 — list states and per-card derivation
// ---------------------------------------------------------------------------
describe('IT-ADMCOURSE-001: CourseApprovalPage list', () => {
  it('IT-ADMCOURSE-001: should show the loading placeholder, then the four stat cards and one card per course with its status badge, category name, enrolment count, formatted date and the correct action buttons', async () => {
    let release: ((v: { data: CoursePage }) => void) | undefined;
    vi.mocked(apiClient.get).mockImplementation(
      makeGet({
        list: () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      })
    );

    renderPage();

    expect(await screen.findByTestId('admin-course-approval-loading')).toBeInTheDocument();
    expect(screen.queryAllByTestId('admin-course-approval-card')).toHaveLength(0);
    // The stat cards are a separate query, so they resolve while the grid is
    // still loading.
    await waitFor(() =>
      expect(screen.getByTestId('admin-course-approval-stat-all')).toHaveTextContent('42')
    );
    expect(screen.getByTestId('admin-course-approval-stat-pending')).toHaveTextContent('5');
    expect(screen.getByTestId('admin-course-approval-stat-approved')).toHaveTextContent('20');
    expect(screen.getByTestId('admin-course-approval-stat-rejected')).toHaveTextContent('2');

    await act(async () => {
      release?.({
        data: coursePage([
          makeCourse({ id: 'c-pending', title: 'React Testing Deep Dive' }),
          makeCourse({
            id: 'c-approved',
            title: 'Alpha Published',
            reviewStatus: 'approved',
            categoryId: 'cat-2',
            thumbnailUrl: 'https://cdn.test/thumb.png',
            stats: { enrollments: 41 },
          }),
          // No categoryId, no `stats` key at all, and a rejection reason.
          makeCourse({
            id: 'c-rejected',
            title: 'Mu Rejected',
            reviewStatus: 'rejected',
            rejectionReason: 'Thiếu mục 3',
            categoryId: null,
            stats: null,
          }),
          // reviewStatus null takes the fourth "not submitted" badge.
          makeCourse({
            id: 'c-none',
            title: 'Nu Unsubmitted',
            reviewStatus: null,
            categoryId: 'cat-1',
          }),
          // Only the long description: exercises the middle arm of
          // `shortDescription ?? description ?? ''`.
          makeCourse({
            id: 'c-longdesc',
            title: 'Xi Long Description',
            reviewStatus: 'approved',
            shortDescription: null,
            description: 'The long description is the only text on this course',
          }),
          // Nothing optional at all: no description, no updatedAt, and a
          // categoryId the categories query never returned.
          makeCourse({
            id: 'c-bare',
            title: 'Omicron Bare',
            reviewStatus: 'approved',
            shortDescription: null,
            description: null,
            updatedAt: null as unknown as string,
            categoryId: 'cat-9',
          }),
        ]),
      });
    });

    const cards = await screen.findAllByTestId('admin-course-approval-card');
    expect(cards).toHaveLength(6);
    expect(screen.queryByTestId('admin-course-approval-loading')).not.toBeInTheDocument();

    // Card 1: pending -> three actions, resolved category, enrolment count,
    // dd/MM/yyyy date and the two-letter initial fallback for the thumbnail.
    const [pending, approved, rejected, unsubmitted, longDesc, bare] = cards as HTMLElement[];
    expect(within(pending).getByText('React Testing Deep Dive')).toBeInTheDocument();
    expect(within(pending).getByText('Programming')).toBeInTheDocument();
    expect(within(pending).getByText(L.pending)).toBeInTheDocument();
    expect(
      within(pending).getByText(new RegExp(`12 ${L.students.source}`, 'i'))
    ).toBeInTheDocument();
    expect(within(pending).getByText(new RegExp(FORMATTED))).toBeInTheDocument();
    expect(pending).toHaveTextContent('RT'); // getInitials of the title
    expect(pending.querySelector('img')).toBeNull();
    expect(within(pending).getByTestId('admin-course-approval-preview')).toBeInTheDocument();
    expect(within(pending).getByTestId('admin-course-approval-reject')).toBeInTheDocument();
    expect(within(pending).getByTestId('admin-course-approval-approve')).toBeInTheDocument();
    expect(
      within(pending).queryByTestId('admin-course-approval-view-detail')
    ).not.toBeInTheDocument();

    // Card 2: approved -> a single "view detail" button, and the thumbnail
    // URL wins over the initials.
    expect(within(approved).getByTestId('admin-course-approval-view-detail')).toBeInTheDocument();
    expect(within(approved).queryByTestId('admin-course-approval-approve')).not.toBeInTheDocument();
    expect(approved.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/thumb.png');
    expect(within(approved).getByText('Design')).toBeInTheDocument();

    // Card 3: rejected -> the reason banner, the uncategorised fallback and no
    // enrolment block because `stats` is null (courseStat returns null).
    expect(within(rejected).getByTestId('admin-course-approval-reason')).toHaveTextContent(
      'Thiếu mục 3'
    );
    expect(within(rejected).getByText(L.uncategorized)).toBeInTheDocument();
    expect(
      within(rejected).queryByText(new RegExp(L.students.source, 'i'))
    ).not.toBeInTheDocument();
    expect(within(rejected).getByTestId('admin-course-approval-view-detail')).toBeInTheDocument();

    // Card 4: reviewStatus null -> the "not submitted" badge.
    expect(within(unsubmitted).getByTestId('admin-course-approval-status')).toHaveTextContent(
      L.notSubmitted
    );
    // status (publication state) is a separate label from reviewStatus.
    expect(within(unsubmitted).getByText(L.draft)).toBeInTheDocument();

    // Card 5: no shortDescription, so the card falls through to description.
    expect(
      within(longDesc).getByText('The long description is the only text on this course')
    ).toBeInTheDocument();

    // Card 6: no description at all renders an empty <p>, a null updatedAt
    // renders the em dash, and a categoryId the categories query never returned
    // falls back to "uncategorised" (the map lookup misses, not a null id).
    expect(within(bare).getByText(L.uncategorized)).toBeInTheDocument();
    // The label and the date are sibling text nodes inside one <span>, so the
    // em dash is matched through the whole line rather than on its own.
    expect(
      within(bare).getByText(new RegExp(`(${L.updated.source})[^A-Za-z0-9]*—`, 'i'))
    ).toBeInTheDocument();
    expect(bare).not.toHaveTextContent(FORMATTED);
  });
});

// ---------------------------------------------------------------------------
// IT-ADMCOURSE-002 — the stat cards double as the review-status filter
// ---------------------------------------------------------------------------
describe('IT-ADMCOURSE-002: CourseApprovalPage status filter and search', () => {
  it('IT-ADMCOURSE-002: should open on reviewStatus=pending, refetch with each chosen status, send the trimmed search, and show the empty box when nothing matches', async () => {
    const user = userEvent.setup();
    let shown: Course[] = [makeCourse({ id: 'c-pending', title: 'React Testing' })];
    vi.mocked(apiClient.get).mockImplementation(
      makeGet({ list: (params) => ({ data: coursePage(params.search ? shown : shown) }) })
    );

    renderPage();
    await screen.findAllByTestId('admin-course-approval-card');
    // First paint asks for the pending queue, page 1, 50 per page, no search.
    expect(listFilters()[0]).toEqual({ page: 1, reviewStatus: 'pending', per_page: 50 });

    // Each stat card is a filter button: clicking it refetches the list.
    for (const [key, expected] of [
      ['all', 'all'],
      ['pending', 'pending'],
      ['approved', 'approved'],
      ['rejected', 'rejected'],
    ] as const) {
      await user.click(screen.getByTestId(`admin-course-approval-stat-${key}`));
      await waitFor(() =>
        expect(listFilters().at(-1)).toEqual({ page: 1, reviewStatus: expected, per_page: 50 })
      );
    }

    // Typing a search term re-keys the query and forwards it trimmed.
    await fill(user, screen.getByTestId('admin-course-approval-search'), '  React  ');
    await waitFor(() =>
      expect(listFilters().at(-1)).toEqual({
        page: 1,
        reviewStatus: 'rejected',
        search: 'React',
        per_page: 50,
      })
    );
    // A blank search is folded to `undefined` by the api wrapper, so it is
    // simply absent from the params.
    await fill(user, screen.getByTestId('admin-course-approval-search'), '');
    await waitFor(() =>
      expect((listFilters().at(-1) as { search?: string }).search).toBeUndefined()
    );

    // Nothing in the queue for this filter.
    shown = [];
    await fill(user, screen.getByTestId('admin-course-approval-search'), 'khong-co-khoa-nay');
    const empty = await screen.findByTestId('admin-course-approval-empty');
    expect(empty).toHaveTextContent(EMPTY);
    expect(screen.queryAllByTestId('admin-course-approval-card')).toHaveLength(0);
    expect(screen.queryByTestId('admin-course-approval-error')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// IT-ADMCOURSE-003 — list error, then the preview modal and both mutations
// ---------------------------------------------------------------------------
describe('IT-ADMCOURSE-003: CourseApprovalPage list error and review mutations', () => {
  it('IT-ADMCOURSE-003: should show the load-error box instead of the grid when the list read fails, then open the preview, keep Reject disabled until a reason is typed, and close the modal after a successful reject or approve', async () => {
    const user = userEvent.setup();
    const listReply: { current: (params: Record<string, unknown>) => Reply } = {
      current: () => ({ data: coursePage([]) }),
    };
    vi.mocked(apiClient.get).mockImplementation(
      makeGet({
        list: (params) => listReply.current(params),
        detail: () => ({
          data: { course: makeCourse(), chapters: [chapter('ch-1', 3), chapter('ch-2', 2)] },
        }),
      })
    );
    vi.mocked(apiClient.post).mockResolvedValue({ data: makeCourse() });

    // --- phase A: the list read fails ---
    listReply.current = () => Promise.reject(new ApiError('gateway down', 503));
    const first = renderPage();
    expect(await screen.findByTestId('admin-course-approval-error')).toHaveTextContent(LOAD_ERROR);
    // The empty box is a different state and must not also appear.
    expect(screen.queryByTestId('admin-course-approval-empty')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('admin-course-approval-card')).toHaveLength(0);
    // Stats and categories are separate queries, so the cards still render.
    expect(screen.getByTestId('admin-course-approval-stat-all')).toHaveTextContent('42');
    first.unmount();

    // --- phase B: a pending course is listed ---
    // No description on either field and a categoryId the categories query
    // never returned, so the modal's two `??` chains take their last arms.
    listReply.current = () => ({
      data: coursePage([
        makeCourse({
          id: 'c-1',
          title: 'React Testing',
          difficultyLevel: 3,
          shortDescription: null,
          description: null,
          categoryId: 'cat-9',
        }),
      ]),
    });
    renderPage();
    const card = (await screen.findAllByTestId('admin-course-approval-card'))[0]!;

    // Preview: the modal opens and the detail query fills the two counters.
    await user.click(within(card).getByTestId('admin-course-approval-preview'));
    const modal = await screen.findByTestId('admin-course-approval-modal');
    expect(within(modal).getByTestId('admin-course-approval-modal-title')).toHaveTextContent(
      'React Testing'
    );
    expect(within(modal).getByTestId('admin-course-approval-lesson-count')).toHaveTextContent('5');
    expect(within(modal).getByTestId('admin-course-approval-chapter-count')).toHaveTextContent('2');
    expect(within(modal).getByText(FORMATTED)).toBeInTheDocument();
    // difficultyLevel 3 is rendered as a level badge in the modal header.
    expect(within(modal).getByText(/trung bình|intermediate/i)).toBeInTheDocument();
    // An unknown categoryId falls back to the uncategorised label...
    expect(within(modal).getByText(L.uncategorized)).toBeInTheDocument();
    // ...and with no description and no shortDescription, the modal shows the
    // shared "no description yet" copy.
    expect(within(modal).getByText(/chưa có mô tả|no description yet/i)).toBeInTheDocument();

    // The reject action is guarded: a whitespace-only reason is still empty.
    const rejectBtn = within(modal).getByTestId('admin-course-approval-modal-reject');
    const reason = within(modal).getByTestId('admin-course-approval-reason-input');
    expect(rejectBtn).toBeDisabled();
    await fill(user, reason, '   ');
    expect(rejectBtn).toBeDisabled();
    expect(postsTo('/reject')).toHaveLength(0);

    await fill(user, reason, '  Thiếu mục 3  ');
    expect(rejectBtn).toBeEnabled();
    await user.click(rejectBtn);
    await waitFor(() =>
      expect(screen.queryByTestId('admin-course-approval-modal')).not.toBeInTheDocument()
    );
    // The page trims before calling, and the api wrapper forwards it verbatim.
    expect(postsTo('/reject')).toEqual([{ reason: 'Thiếu mục 3' }]);
    // onSuccess invalidates the ['content','courses'] tree, so the list refetched.
    await waitFor(() => expect(listFilters().length).toBeGreaterThan(1));

    // Approve from the card. `setPreview` and `mutate` run in the same handler,
    // so the modal only stays on screen while the mutation is in flight — the
    // approve button is disabled for exactly that window, then closePreview()
    // takes the modal down again.
    let releaseApprove: (() => void) | undefined;
    vi.mocked(apiClient.post).mockImplementation((url: string) => {
      if (String(url).endsWith('/approve')) {
        return new Promise((resolve) => {
          releaseApprove = () => resolve({ data: makeCourse() });
        });
      }
      return Promise.resolve({ data: makeCourse() });
    });

    const card2 = (await screen.findAllByTestId('admin-course-approval-card'))[0]!;
    await user.click(within(card2).getByTestId('admin-course-approval-approve'));
    const approving = await screen.findByTestId('admin-course-approval-modal');
    expect(within(approving).getByTestId('admin-course-approval-modal-approve')).toBeDisabled();

    await act(async () => {
      releaseApprove?.();
    });
    await waitFor(() =>
      expect(screen.queryByTestId('admin-course-approval-modal')).not.toBeInTheDocument()
    );
    expect(postsTo('/approve')).toHaveLength(1);
    // approveCourse sends no request body at all.
    expect(
      vi.mocked(apiClient.post).mock.calls.filter(([u]) => String(u).endsWith('/approve'))[0]![1]
    ).toBeUndefined();

    // --- phase C: the card Reject button ---
    // Unlike Approve, it does NOT fire a mutation: it only opens the modal and
    // clears any reason left over from a previous attempt.
    const card3 = (await screen.findAllByTestId('admin-course-approval-card'))[0]!;
    await user.click(within(card3).getByTestId('admin-course-approval-reject'));
    const viaCard = await screen.findByTestId('admin-course-approval-modal');
    expect(within(viaCard).getByTestId('admin-course-approval-reason-input')).toHaveValue('');
    expect(within(viaCard).getByTestId('admin-course-approval-modal-reject')).toBeDisabled();
    expect(postsTo('/reject')).toEqual([{ reason: 'Thiếu mục 3' }]);

    // Approve straight from the modal footer this time. The mock is still the
    // deferred one, so the button disables for the in-flight window again.
    await user.click(within(viaCard).getByTestId('admin-course-approval-modal-approve'));
    const approving2 = await screen.findByTestId('admin-course-approval-modal');
    expect(within(approving2).getByTestId('admin-course-approval-modal-approve')).toBeDisabled();
    await act(async () => {
      releaseApprove?.();
    });
    await waitFor(() =>
      expect(screen.queryByTestId('admin-course-approval-modal')).not.toBeInTheDocument()
    );
    expect(postsTo('/approve')).toHaveLength(2);

    // --- phase D: a NON-pending course's preview is read-only ---
    listReply.current = () => ({
      data: coursePage([
        makeCourse({ id: 'c-9', title: 'Alpha Published', reviewStatus: 'approved' }),
      ]),
    });
    await user.click(screen.getByTestId('admin-course-approval-stat-approved'));
    const approvedCard = (await screen.findAllByTestId('admin-course-approval-card'))[0]!;
    expect(within(approvedCard).getByText('Alpha Published')).toBeInTheDocument();
    await user.click(within(approvedCard).getByTestId('admin-course-approval-view-detail'));
    const readOnly = await screen.findByTestId('admin-course-approval-modal');
    expect(within(readOnly).getByTestId('admin-course-approval-modal-title')).toHaveTextContent(
      'Alpha Published'
    );
    // No reason box and no review actions — only Cancel.
    expect(
      within(readOnly).queryByTestId('admin-course-approval-reason-input')
    ).not.toBeInTheDocument();
    expect(
      within(readOnly).queryByTestId('admin-course-approval-modal-approve')
    ).not.toBeInTheDocument();
    expect(
      within(readOnly).queryByTestId('admin-course-approval-modal-reject')
    ).not.toBeInTheDocument();
    expect(within(readOnly).getByTestId('admin-course-approval-cancel')).toBeInTheDocument();
    await user.click(within(readOnly).getByTestId('admin-course-approval-modal-close'));
    await waitFor(() =>
      expect(screen.queryByTestId('admin-course-approval-modal')).not.toBeInTheDocument()
    );
  });
});

// ---------------------------------------------------------------------------
// IT-ADMCOURSE-004 — the shared mutationError slot
// ---------------------------------------------------------------------------
describe('IT-ADMCOURSE-004: CourseApprovalPage mutationError precedence', () => {
  it('IT-ADMCOURSE-004: should surface the approve failure, keep showing it after a reject failure because the slot is `approveMut.error ?? rejectMut.error`, and clear it when the modal is closed', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockImplementation(
      makeGet({
        list: () => ({ data: coursePage([makeCourse({ id: 'c-1', title: 'React Testing' })]) }),
      })
    );
    vi.mocked(apiClient.post).mockImplementation((url: string) => {
      const u = String(url);
      if (u.endsWith('/approve')) {
        return Promise.reject(new ApiError('Bạn không thể duyệt khoá học do chính mình tạo', 403));
      }
      return Promise.reject(new ApiError('Lý do từ chối là bắt buộc', 400));
    });

    renderPage();
    const card = (await screen.findAllByTestId('admin-course-approval-card'))[0]!;

    // Clicking Approve on the card opens the modal AND fires the mutation.
    await user.click(within(card).getByTestId('admin-course-approval-approve'));
    const modal = await screen.findByTestId('admin-course-approval-modal');
    const err = await within(modal).findByTestId('admin-course-approval-mutation-error');
    expect(err).toHaveTextContent('Bạn không thể duyệt khoá học do chính mình tạo');

    // Now fail a reject too. `approveMut.error` is still set, so `??` short
    // circuits and the approve message stays on screen.
    await fill(
      user,
      within(modal).getByTestId('admin-course-approval-reason-input'),
      'Thiếu mục 3'
    );
    await user.click(within(modal).getByTestId('admin-course-approval-modal-reject'));
    await waitFor(() => expect(postsTo('/reject')).toHaveLength(1));
    const stillFirst = within(modal).getByTestId('admin-course-approval-mutation-error');
    expect(stillFirst).toHaveTextContent('Bạn không thể duyệt khoá học do chính mình tạo');
    expect(stillFirst).not.toHaveTextContent('Lý do từ chối là bắt buộc');
    // The modal stays open: neither mutation succeeded, so no onSuccess ran.
    expect(screen.getByTestId('admin-course-approval-modal')).toBeInTheDocument();

    // closePreview() resets both mutations, so the error slot empties.
    await user.click(within(modal).getByTestId('admin-course-approval-cancel'));
    await waitFor(() =>
      expect(screen.queryByTestId('admin-course-approval-modal')).not.toBeInTheDocument()
    );
    await user.click(within(card).getByTestId('admin-course-approval-preview'));
    expect(
      within(await screen.findByTestId('admin-course-approval-modal')).queryByTestId(
        'admin-course-approval-mutation-error'
      )
    ).not.toBeInTheDocument();
  });
});
