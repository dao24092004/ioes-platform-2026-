/** Wave 3B (instructor) — Integration: CourseCreatePage (/instructor/courses/create) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import CourseCreatePage from '@/pages/instructor/CourseCreatePage';
import { contentApi, type Category, type Course } from '@/services/api/content.api';
import { useAuthStore } from '@/app/store/authStore';

// ---------------------------------------------------------------------------
// i18n mock — self-contained; unknown keys fall through to the key itself so a
// missing mapping shows up as a visible key rather than an empty string.
// ---------------------------------------------------------------------------
const MESSAGES: Record<string, string> = {
  'instructor.course.create': 'Create course',
  'instructor.course.subtitle': 'Fill in the details to save a draft',
  'instructor.course.saveDraft': 'Save draft',
  'instructor.course.publish': 'Publish',
  'instructor.course.steps.basic': 'Basic info',
  'instructor.course.steps.content': 'Curriculum',
  'instructor.course.steps.pricing': 'Pricing',
  'instructor.course.info.title': 'Course information',
  'instructor.course.info.courseTitle': 'Course title',
  'instructor.course.info.courseTitlePlaceholder': 'e.g. React Testing',
  'instructor.course.info.shortDesc': 'Short description',
  'instructor.course.info.shortDescPlaceholder': 'One line summary',
  'instructor.course.info.fullDesc': 'Full description',
  'instructor.course.info.fullDescPlaceholder': 'What the course covers',
  'instructor.course.info.category': 'Category',
  'instructor.course.info.selectCategory': 'Select a category',
  'instructor.course.info.level': 'Level',
  'instructor.course.info.thumbnail': 'Thumbnail URL',
  'instructor.course.curriculum.title': 'Curriculum',
  'instructor.course.curriculum.addChapter': 'Add chapter',
  'instructor.course.curriculum.addLesson': 'Add lesson',
  'instructor.course.curriculum.chapterPlaceholder': 'Chapter title',
  'instructor.course.curriculum.lessonPlaceholder': 'Lesson title',
  'instructor.course.curriculum.durationPlaceholder': 'min',
  'instructor.course.pricing.title': 'Pricing',
  'instructor.course.pricing.free': 'Free',
  'instructor.course.pricing.freeDesc': 'Anyone can enrol',
  'instructor.course.pricing.paid': 'Paid',
  'instructor.course.pricing.paidDesc': 'Charge a one-off fee',
  'courseApi.level.1': 'Beginner',
  'courseApi.level.2': 'Elementary',
  'courseApi.level.3': 'Intermediate',
  'courseApi.level.4': 'Advanced',
  'courseApi.level.5': 'Expert',
  'courseApi.lessonType.video': 'Video',
  'courseApi.lessonType.document': 'Document',
  'courseApi.lessonType.quiz': 'Quiz',
  'courseApi.lessonType.assignment': 'Assignment',
  'courseApi.lessonType.live': 'Live',
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
// Network boundary
// ---------------------------------------------------------------------------
vi.mock('@/services/api/content.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api/content.api')>();
  return {
    ...actual,
    contentApi: {
      ...actual.contentApi,
      createCourse: vi.fn(),
      listCategories: vi.fn(),
      addChapter: vi.fn(),
      addLesson: vi.fn(),
    },
  };
});

const createCourseMock = vi.mocked(contentApi.createCourse);
const listCategoriesMock = vi.mocked(contentApi.listCategories);

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
];

const CREATED: Course = {
  id: 'c-new',
  instructorId: 'i-1',
  categoryId: 'cat-1',
  title: 'Created',
  slug: 'created',
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
  stats: null,
  createdAt: '2026-10-04T00:00:00Z',
  updatedAt: '2026-10-04T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Render harness
// ---------------------------------------------------------------------------
function renderCreate() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/instructor/courses/create']}>
        <Routes>
          <Route path="/instructor/courses/create" element={<CourseCreatePage />} />
          <Route
            path="/instructor/courses/:courseId/edit"
            element={<div data-testid="EDIT_ROUTE">EDIT_ROUTE</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** The stepper renders three buttons sharing one testid; pick by data-step. */
const stepButton = (step: 1 | 2 | 3): HTMLElement =>
  screen
    .getAllByTestId('instructor-course-form-step')
    .find((button) => button.getAttribute('data-step') === String(step))!;

/** The form always starts on step 1; wait for the category options to load. */
async function waitForForm(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByTestId('instructor-course-form-title')).toBeInTheDocument();
  });
  await waitFor(() => {
    expect(screen.getByRole('option', { name: 'Programming' })).toBeInTheDocument();
  });
}

const fieldErrors = () => screen.queryAllByTestId('instructor-course-form-field-error');

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
  createCourseMock.mockReset();
  listCategoriesMock.mockReset();
  listCategoriesMock.mockResolvedValue(CATEGORIES);
});

// ---------------------------------------------------------------------------
// IT-ICOURSEADD-001 — empty title
// ---------------------------------------------------------------------------
describe('IT-ICOURSEADD-001: CourseForm step 1 with an empty title', () => {
  it('IT-ICOURSEADD-001: should block Next and flag the title as Required when the title input is left empty', async () => {
    renderCreate();
    await waitForForm();

    await userEvent.selectOptions(screen.getByTestId('instructor-course-form-category'), 'cat-1');
    expect(fieldErrors()).toHaveLength(0);

    await userEvent.click(screen.getByTestId('instructor-course-form-next'));

    const errors = await screen.findAllByTestId('instructor-course-form-field-error');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toHaveTextContent('Required');
    // Still on step 1: the curriculum step never rendered.
    expect(screen.getByTestId('instructor-course-form-title')).toBeInTheDocument();
    expect(screen.queryByTestId('instructor-course-form-add-chapter')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// IT-ICOURSEADD-002 — whitespace-only title and no category
// ---------------------------------------------------------------------------
describe('IT-ICOURSEADD-002: CourseForm step 1 with a whitespace-only title and no category', () => {
  it('IT-ICOURSEADD-002: should flag both the title and the category as Required when the title holds only spaces', async () => {
    renderCreate();
    await waitForForm();

    await userEvent.type(screen.getByTestId('instructor-course-form-title'), '     ');
    await userEvent.click(screen.getByTestId('instructor-course-form-next'));

    const errors = await screen.findAllByTestId('instructor-course-form-field-error');
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.textContent)).toEqual(['Required', 'Required']);
    // Whitespace survives in the input (the component only trims for validation).
    expect(screen.getByTestId('instructor-course-form-title')).toHaveValue('     ');
    expect(screen.queryByTestId('instructor-course-form-add-chapter')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// IT-ICOURSEADD-003 — paid model with a blank price
// ---------------------------------------------------------------------------
describe('IT-ICOURSEADD-003: CourseForm step 3 with the paid model and no price', () => {
  it('IT-ICOURSEADD-003: should block submit and flag the price as Required when the paid model is selected with an empty price', async () => {
    renderCreate();
    await waitForForm();

    // The stepper jumps straight to step 3, bypassing step 1 validation.
    await userEvent.click(stepButton(3));
    expect(screen.getByTestId('instructor-course-form-pricing-paid')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('instructor-course-form-pricing-paid'));
    const price = screen.getByTestId('instructor-course-form-price');
    expect(price).toHaveValue(null);

    await userEvent.click(screen.getByTestId('instructor-course-form-submit'));

    const errors = await screen.findAllByTestId('instructor-course-form-field-error');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toHaveTextContent('Required');
    expect(createCourseMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('EDIT_ROUTE')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// IT-ICOURSEADD-004 — SQL/XSS-like backend error text
// ---------------------------------------------------------------------------
describe('IT-ICOURSEADD-004: CourseCreatePage error banner', () => {
  it('IT-ICOURSEADD-004: should render a SQL/XSS-like backend message as literal text without injecting any element', async () => {
    const hostile = "Robert'); DROP TABLE courses;-- <img src=x onerror=alert(1)>";
    createCourseMock.mockRejectedValue(new Error(hostile));
    renderCreate();
    await waitForForm();

    await userEvent.type(screen.getByTestId('instructor-course-form-title'), 'Plain title');
    await userEvent.selectOptions(screen.getByTestId('instructor-course-form-category'), 'cat-1');
    await userEvent.click(stepButton(3));
    await userEvent.click(screen.getByTestId('instructor-course-form-submit'));

    const banner = await screen.findByTestId('instructor-course-create-error');
    expect(banner).toHaveTextContent(hostile);
    // Rendered as a text node: no element was created from the payload.
    expect(banner.querySelector('img')).toBeNull();
    expect(document.querySelector('img[src="x"]')).toBeNull();
    // A failed create leaves the user on the form, ready to retry.
    expect(screen.queryByTestId('EDIT_ROUTE')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// IT-ICOURSEADD-005 — successful submit; asserts the LOCKED `slugify` output
// through the createCourse payload, plus the page's fixed field defaults.
// Date.now is pinned so the slug suffix is deterministic.
// ---------------------------------------------------------------------------
describe('IT-ICOURSEADD-005: CourseCreatePage successful submit', () => {
  it('IT-ICOURSEADD-005: should POST a diacritic-free slug built from the Vietnamese title and redirect to the edit route when the draft is saved', async () => {
    // 2026-10-04T00:00:00Z -> 1788480000000 ms -> base36 "mtm6tc00".
    vi.spyOn(Date, 'now').mockReturnValue(1788480000000);
    createCourseMock.mockResolvedValue({ ...CREATED, title: 'Lập Trình JavaScript Nâng Cao' });

    renderCreate();
    await waitForForm();

    const title = "Robert'); DROP TABLE courses;-- <img src=x onerror=alert(1)>";
    await userEvent.type(screen.getByTestId('instructor-course-form-title'), title);
    await userEvent.selectOptions(screen.getByTestId('instructor-course-form-category'), 'cat-1');
    await userEvent.selectOptions(screen.getByTestId('instructor-course-form-level'), '3');
    await userEvent.click(stepButton(3));
    await userEvent.click(screen.getByTestId('instructor-course-form-pricing-paid'));
    await userEvent.type(screen.getByTestId('instructor-course-form-price'), '499000');
    await userEvent.click(screen.getByTestId('instructor-course-form-submit'));

    await waitFor(() => {
      expect(createCourseMock).toHaveBeenCalledTimes(1);
    });

    // Title is forwarded trimmed but otherwise verbatim — no escaping, no truncation.
    expect(createCourseMock.mock.calls[0][0].title).toBe(title);

    // LOCKED `slugify`: NFD de-accenting, lowercase, non-alphanumerics folded to
    // single dashes, leading/trailing dashes stripped, capped at 200 chars.
    expect(createCourseMock.mock.calls[0][0].slug).toBe(
      'robert-drop-table-courses-img-src-x-onerror-alert-1-mtm6tc00'
    );

    // Page-level defaults that the form itself does not collect.
    expect(createCourseMock.mock.calls[0][0]).toMatchObject({
      categoryId: 'cat-1',
      price: 499000,
      currency: 'VND',
      difficultyLevel: 3,
      language: 'vi',
      shortDescription: null,
      description: null,
      thumbnailUrl: null,
    });

    // The default empty chapter is filtered out, so no chapter call is made.
    expect(contentApi.addChapter).not.toHaveBeenCalled();
    expect(contentApi.addLesson).not.toHaveBeenCalled();

    // Success navigates to the edit route for the newly created course.
    expect(await screen.findByTestId('EDIT_ROUTE')).toBeInTheDocument();
  });

  it('IT-ICOURSEADD-006: should build a lowercase dash-separated slug from a pure Vietnamese title when the accented characters are the whole difference', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1788480000000);
    createCourseMock.mockResolvedValue(CREATED);

    renderCreate();
    await waitForForm();

    await userEvent.type(
      screen.getByTestId('instructor-course-form-title'),
      'Lập Trình JavaScript Nâng Cao'
    );
    await userEvent.selectOptions(screen.getByTestId('instructor-course-form-category'), 'cat-1');
    await userEvent.click(stepButton(3));
    await userEvent.click(screen.getByTestId('instructor-course-form-submit'));

    await waitFor(() => {
      expect(createCourseMock).toHaveBeenCalledTimes(1);
    });
    expect(createCourseMock.mock.calls[0][0].slug).toBe('lap-trinh-javascript-nang-cao-mtm6tc00');
    // The free model is the default, so the price is coerced to 0.
    expect(createCourseMock.mock.calls[0][0].price).toBe(0);
  });
});
