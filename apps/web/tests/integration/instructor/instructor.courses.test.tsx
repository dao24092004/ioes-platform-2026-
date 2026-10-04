/** Wave 3B (instructor) — Integration: CoursesPage (/instructor/courses) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import CoursesPage from '@/pages/instructor/CoursesPage';
import { contentApi, type Category, type Course } from '@/services/api/content.api';
import { useAuthStore } from '@/app/store/authStore';

// ---------------------------------------------------------------------------
// i18n mock — self-contained, keys resolved to English so assertions read as
// literal English. Unknown keys fall through to the key itself, which keeps a
// missing mapping visible instead of silently rendering ''.
// ---------------------------------------------------------------------------
const MESSAGES: Record<string, string> = {
  'instructor.courses.title': 'My courses',
  'instructor.courses.subtitle': 'Manage your catalogue',
  'instructor.courses.createNew': 'Create new course',
  'instructor.courses.stats.total': 'Total',
  'instructor.courses.stats.published': 'Published',
  'instructor.courses.stats.drafts': 'Drafts',
  'instructor.courses.stats.students': 'Students',
  'instructor.courses.filter.all': 'All',
  'instructor.courses.filter.published': 'Published',
  'instructor.courses.filter.draft': 'Draft',
  'instructor.courses.filter.archived': 'Archived',
  'instructor.courses.searchPlaceholder': 'Search courses',
  'instructor.courses.sort.recent': 'Recently updated',
  'instructor.courses.sort.enrollments': 'Most enrolled',
  'instructor.courses.sort.title': 'Title A-Z',
  'instructor.courses.status.draft': 'Draft',
  'instructor.courses.status.published': 'Published',
  'instructor.courses.status.archived': 'Archived',
  'instructor.courses.edit': 'Edit',
  'instructor.courses.empty': 'You have no courses yet',
  'instructor.courses.studentsUnit': 'students',
  'instructor.courses.updated': 'Updated',
  'courseApi.reviewStatus.none': 'Not submitted',
  'courseApi.reviewStatus.pending': 'Pending review',
  'courseApi.reviewStatus.approved': 'Approved',
  'courseApi.reviewStatus.rejected': 'Rejected',
  'courseApi.uncategorized': 'Uncategorised',
  'common.loadError': 'Could not load data',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'instructor.nav.overview': 'Overview',
  'instructor.nav.community': 'Community',
  'instructor.nav.create': 'Create',
  'instructor.nav.analytics': 'Analytics',
  'instructor.nav.aiTools': 'AI tools',
  'instructor.nav.account': 'Account',
  'instructor.nav.dashboard': 'Dashboard',
  'instructor.nav.myCourses': 'My courses',
  'instructor.nav.exams': 'Exams',
  'instructor.nav.students': 'Students',
  'instructor.nav.discussions': 'Discussions',
  'instructor.nav.messages': 'Messages',
  'instructor.nav.createCourse': 'Create course',
  'instructor.nav.createExam': 'Create exam',
  'instructor.nav.stats': 'Stats',
  'instructor.nav.reports': 'Reports',
  'instructor.nav.grading': 'Grading',
  'instructor.nav.aiQuestion': 'AI question',
  'instructor.nav.aiAssistant': 'AI assistant',
  'instructor.nav.copyright': 'Copyright',
  'instructor.nav.profile': 'Profile',
  'instructor.nav.settings': 'Settings',
  'sidebar.role.instructor': 'Instructor',
  'header.logout': 'Log out',
  'header.toggleTheme': 'Toggle theme',
  'header.notifications': 'Notifications',
  'shared.menu': 'Menu',
  'instructor.courses.pagination.range': 'Showing {{from}}-{{to}} of {{total}}',
  'instructor.courses.pagination.prev': 'Previous',
  'instructor.courses.pagination.next': 'Next',
  'instructor.courses.pagination.pageSize': 'Rows',
  'instructor.courses.pagination.perPage': 'per page',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const template = MESSAGES[key];
      if (template === undefined) return key;
      return template.replace(/{{(\w+)}}/g, (_m, name: string) => String(opts?.[name] ?? ''));
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

// ---------------------------------------------------------------------------
// Network boundary: contentApi is the single seam both queries go through.
// ---------------------------------------------------------------------------
vi.mock('@/services/api/content.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api/content.api')>();
  return {
    ...actual,
    contentApi: {
      ...actual.contentApi,
      listCourses: vi.fn(),
      listCategories: vi.fn(),
    },
  };
});

const listCoursesMock = vi.mocked(contentApi.listCourses);
const listCategoriesMock = vi.mocked(contentApi.listCategories);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeCourse = (overrides: Partial<Course> = {}): Course =>
  ({
    id: 'c-1',
    instructorId: 'i-1',
    categoryId: 'cat-1',
    title: 'React Testing Deep Dive',
    slug: 'react-testing',
    shortDescription: null,
    description: null,
    thumbnailUrl: null,
    previewVideoUrl: null,
    price: 0,
    currency: 'VND',
    durationHours: null,
    difficultyLevel: 1,
    language: 'vi',
    status: 'draft',
    reviewStatus: null,
    rejectionReason: null,
    publishedAt: null,
    stats: { enrollments: 0 },
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
    ...overrides,
  }) satisfies Course;

const page = (data: Course[]) => ({
  data,
  meta: { total: data.length, page: 1, perPage: 100, totalPages: 1 },
});

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

// ---------------------------------------------------------------------------
// Render harness
// ---------------------------------------------------------------------------
function renderCourses() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/instructor/courses']}>
        <Routes>
          <Route path="/instructor/courses" element={<CoursesPage />} />
          <Route path="/instructor/courses/create" element={<div>CREATE_PAGE</div>} />
          <Route
            path="/instructor/courses/:courseId/edit"
            element={<div>EDIT_PAGE_FOR_{'${courseId}'}</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: 'i-1',
      email: 'gv@ioes.vn',
      full_name: 'Giang Vien',
      role: 'instructor',
      avatar_url: null,
    },
    accessToken: 'instructor-token',
    refreshToken: null,
    isAuthenticated: true,
    isLoading: false,
  });
  localStorage.clear();
  listCoursesMock.mockReset();
  listCategoriesMock.mockReset();
  listCategoriesMock.mockResolvedValue(CATEGORIES);
});

/** Keep the pending listCourses query unresolved so the loading branch renders. */
const keepPending = () => listCoursesMock.mockReturnValue(new Promise<never>(() => undefined));

// ---------------------------------------------------------------------------
// IT-ICOURSES-001 — loading state
// ---------------------------------------------------------------------------
describe('IT-ICOURSES-001: CoursesPage loading state', () => {
  it('IT-ICOURSES-001: should render the loading placeholder and no course rows while the list query is pending', async () => {
    keepPending();
    renderCourses();

    await waitFor(() => {
      expect(screen.getByTestId('instructor-courses-loading')).toBeInTheDocument();
    });
    expect(screen.queryAllByTestId('instructor-course-row')).toHaveLength(0);
    expect(screen.queryByTestId('instructor-courses-empty')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// IT-ICOURSES-002 — error state
// ---------------------------------------------------------------------------
describe('IT-ICOURSES-002: CoursesPage error state', () => {
  it('IT-ICOURSES-002: should render the load-error message and no rows when the course list query fails', async () => {
    listCoursesMock.mockRejectedValue(new Error('gateway down'));
    renderCourses();

    await waitFor(() => {
      expect(screen.getByTestId('instructor-courses-error')).toHaveTextContent(
        'Could not load data'
      );
    });
    expect(screen.queryAllByTestId('instructor-course-row')).toHaveLength(0);
    expect(screen.queryByTestId('instructor-courses-loading')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// IT-ICOURSES-003 — empty state and its call-to-action link
// ---------------------------------------------------------------------------
describe('IT-ICOURSES-003: CoursesPage empty state', () => {
  it('IT-ICOURSES-003: should render the empty message with a create link to /instructor/courses/create when the account owns no courses', async () => {
    listCoursesMock.mockResolvedValue(page([]));
    renderCourses();

    const empty = await screen.findByTestId('instructor-courses-empty');
    expect(empty).toHaveTextContent('You have no courses yet');

    const cta = within(empty).getByTestId('instructor-courses-empty-create-link');
    expect(cta).toHaveAttribute('href', '/instructor/courses/create');

    await userEvent.click(cta);
    expect(await screen.findByText('CREATE_PAGE')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// IT-ICOURSES-004 — populated list: row content, status/review derivation,
// category-name resolution, and the per-row edit link. One test walks the
// status filter and the search box so the module-private `filtered` memo
// (CoursesPage.tsx:62-72) is exercised end to end.
// ---------------------------------------------------------------------------
describe('IT-ICOURSES-004: CoursesPage list rows, status filter and search', () => {
  const draft = makeCourse({
    id: 'c-draft',
    title: 'Zeta Draft',
    status: 'draft',
    reviewStatus: 'rejected',
    rejectionReason: 'Missing content',
    categoryId: 'cat-1',
    stats: { enrollments: 3 },
  });
  const published = makeCourse({
    id: 'c-pub',
    title: 'Alpha Published',
    status: 'published',
    reviewStatus: 'approved',
    categoryId: 'cat-2',
    stats: { enrollments: 41 },
  });
  const archived = makeCourse({
    id: 'c-arch',
    title: 'Mu Archived',
    status: 'archived',
    reviewStatus: null,
    categoryId: null,
    stats: { enrollments: 0 },
  });

  beforeEach(() => {
    listCoursesMock.mockResolvedValue(page([draft, published, archived]));
  });

  it('IT-ICOURSES-004: should render one row per course with its status, review state, category name and edit link, then narrow the rows to the chosen status and search keyword', async () => {
    renderCourses();

    const rows = await screen.findAllByTestId('instructor-course-row');
    expect(rows).toHaveLength(3);

    // Status + review derivation, and the categoryName fallback for cat-2.
    expect(within(rows[0]).getByText('Zeta Draft')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Draft')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Rejected')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Programming')).toBeInTheDocument();
    expect(within(rows[0]).getByText(/Missing content/)).toBeInTheDocument();

    expect(within(rows[1]).getByText('Alpha Published')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Published')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Design')).toBeInTheDocument();

    // categoryId === null falls back to the uncategorised label.
    expect(within(rows[2]).getByText('Mu Archived')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Uncategorised')).toBeInTheDocument();

    // Per-row edit link points at the edit route for that course id.
    const editLinks = screen.getAllByTestId('instructor-courses-edit-link');
    expect(editLinks[0]).toHaveAttribute('href', '/instructor/courses/c-draft/edit');

    // Status filter narrows to the selected status only.
    const filters = screen.getAllByTestId('instructor-courses-filter');
    const publishedFilter = filters.find((f) => f.getAttribute('data-status') === 'published')!;
    await userEvent.click(publishedFilter);

    const filtered = await screen.findAllByTestId('instructor-course-row');
    expect(filtered).toHaveLength(1);
    expect(within(filtered[0]).getByText('Alpha Published')).toBeInTheDocument();

    // Search matches on the resolved category name, not only the title.
    const allFilter = screen
      .getAllByTestId('instructor-courses-filter')
      .find((f) => f.getAttribute('data-status') === 'all')!;
    await userEvent.click(allFilter);
    await userEvent.type(screen.getByTestId('instructor-courses-search'), 'design');

    const searched = await screen.findAllByTestId('instructor-course-row');
    expect(searched).toHaveLength(1);
    expect(within(searched[0]).getByText('Alpha Published')).toBeInTheDocument();

    // A keyword that matches nothing empties the list.
    await userEvent.clear(screen.getByTestId('instructor-courses-search'));
    await userEvent.type(screen.getByTestId('instructor-courses-search'), 'zzz-nope');
    expect(await screen.findByTestId('instructor-courses-empty')).toBeInTheDocument();
    expect(screen.queryAllByTestId('instructor-course-row')).toHaveLength(0);
  });
});
