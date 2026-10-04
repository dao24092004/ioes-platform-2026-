/** Wave 3B (instructor) — Integration: CourseEditPage (/instructor/courses/:courseId/edit) */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import CourseEditPage from '@/pages/instructor/CourseEditPage';
import {
  contentApi,
  type Category,
  type Course,
  type CourseDetail,
} from '@/services/api/content.api';
import { useAuthStore } from '@/app/store/authStore';

// ---------------------------------------------------------------------------
// i18n mock — self-contained; unknown keys fall through to the key itself.
// ---------------------------------------------------------------------------
const MESSAGES: Record<string, string> = {
  'instructor.course.edit': 'Edit course',
  'instructor.course.saveDraft': 'Save draft',
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
  'instructor.courses.status.draft': 'Draft',
  'instructor.courses.status.published': 'Published',
  'instructor.courses.status.archived': 'Archived',
  'courseApi.reviewStatus.none': 'Not submitted',
  'courseApi.reviewStatus.pending': 'Pending review',
  'courseApi.reviewStatus.approved': 'Approved',
  'courseApi.reviewStatus.rejected': 'Rejected',
  'courseApi.notFound.title': 'Course not found',
  'courseApi.notFound.description': 'It may have been deleted, or the id is wrong.',
  'courseApi.actions.backToList': 'Back to my courses',
  'courseApi.actions.submit': 'Submit for review',
  'courseApi.actions.publish': 'Publish',
  'courseApi.editNotes': 'Renaming an existing chapter or lesson is not saved.',
  'admin.approval.rejectionReason': 'Reason',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.loadError': 'Could not load data',
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
      getCourseDetail: vi.fn(),
      updateCourse: vi.fn(),
      submitCourseForReview: vi.fn(),
      publishCourse: vi.fn(),
      listCategories: vi.fn(),
      addChapter: vi.fn(),
      addLesson: vi.fn(),
      deleteChapter: vi.fn(),
      deleteLesson: vi.fn(),
    },
  };
});

const getCourseDetailMock = vi.mocked(contentApi.getCourseDetail);
const updateCourseMock = vi.mocked(contentApi.updateCourse);
const submitMock = vi.mocked(contentApi.submitCourseForReview);
const publishMock = vi.mocked(contentApi.publishCourse);
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

const COURSE_ID = 'c-42';

const makeCourse = (overrides: Partial<Course> = {}): Course => ({
  id: COURSE_ID,
  instructorId: 'i-1',
  categoryId: 'cat-1',
  title: 'React Testing Deep Dive',
  slug: 'react-testing',
  shortDescription: 'A short summary',
  description: 'The long description',
  thumbnailUrl: null,
  previewVideoUrl: null,
  price: 0,
  currency: 'VND',
  durationHours: null,
  difficultyLevel: 2,
  language: 'vi',
  status: 'draft',
  reviewStatus: null,
  rejectionReason: null,
  publishedAt: null,
  stats: null,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-02T00:00:00Z',
  ...overrides,
});

const makeDetail = (overrides: Partial<Course> = {}): CourseDetail => ({
  course: makeCourse(overrides),
  chapters: [
    {
      id: 'ch-1',
      courseId: COURSE_ID,
      title: 'Chapter 1',
      description: null,
      sortOrder: 1,
      isFree: null,
      lessons: [
        {
          id: 'l-1',
          chapterId: 'ch-1',
          title: 'Lesson 1',
          description: null,
          lessonType: 'video',
          contentUrl: null,
          durationMinutes: 30,
          sortOrder: 1,
          isFree: null,
          isPreview: null,
        },
      ],
    },
  ],
});

// ---------------------------------------------------------------------------
// Render harness
// ---------------------------------------------------------------------------
/** Echoes the route param so the back-navigation target can be asserted. */
const CourseIdProbe: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  return <div data-testid="LIST_ROUTE">LIST_ROUTE:{courseId}</div>;
};

function renderEdit(courseId = COURSE_ID) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/instructor/courses/${courseId}/edit`]}>
        <Routes>
          <Route path="/instructor/courses/:courseId/edit" element={<CourseEditPage />} />
          <Route path="/instructor/courses" element={<CourseIdProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const stepButton = (step: 1 | 2 | 3): HTMLElement =>
  screen
    .getAllByTestId('instructor-course-form-step')
    .find((button) => button.getAttribute('data-step') === String(step))!;

/** Wait until the form is mounted and hydrated from the fetched detail. */
async function waitForForm(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByTestId('instructor-course-form-title')).toHaveValue(
      'React Testing Deep Dive'
    );
  });
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
  getCourseDetailMock.mockReset();
  updateCourseMock.mockReset();
  submitMock.mockReset();
  publishMock.mockReset();
  listCategoriesMock.mockReset();
  listCategoriesMock.mockResolvedValue(CATEGORIES);
});

// ---------------------------------------------------------------------------
// IT-ICOURSEEDIT-001 — not-found branch
// ---------------------------------------------------------------------------
describe('IT-ICOURSEEDIT-001: CourseEditPage when the course cannot be loaded', () => {
  it('IT-ICOURSEEDIT-001: should render the not-found panel and return to the list route when the detail query fails and the back button is pressed', async () => {
    getCourseDetailMock.mockRejectedValue(new Error('404 course not found'));
    renderEdit();

    const notFound = await screen.findByTestId('instructor-course-edit-notfound');
    expect(notFound).toHaveTextContent('Course not found');
    expect(notFound).toHaveTextContent('It may have been deleted, or the id is wrong.');
    // The form never renders, so nothing can be submitted by accident.
    expect(screen.queryByTestId('instructor-course-form')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('instructor-course-edit-back'));
    expect(await screen.findByTestId('LIST_ROUTE')).toHaveTextContent('LIST_ROUTE:');
  });
});

// ---------------------------------------------------------------------------
// IT-ICOURSEEDIT-002 — status/review badges and workflow button visibility.
// `canSubmit` / `canPublish` are derived at CourseEditPage.tsx:189-191.
// ---------------------------------------------------------------------------
describe('IT-ICOURSEEDIT-002: CourseEditPage status workflow buttons', () => {
  it('IT-ICOURSEEDIT-002: should offer Submit for a rejected course, hide Publish, and render the rejection reason as literal text', async () => {
    // One course state per render: the detail query is cached per QueryClient,
    // so re-mocking the mock would not re-render the page.
    getCourseDetailMock.mockResolvedValue(
      makeDetail({
        reviewStatus: 'rejected',
        rejectionReason: "Robert'); DROP TABLE courses;-- <img src=x onerror=alert(1)>",
      })
    );
    renderEdit();
    await waitForForm();

    expect(screen.getByTestId('instructor-course-edit-status')).toHaveTextContent('Draft');
    expect(screen.getByTestId('instructor-course-edit-review')).toHaveTextContent('Rejected');
    // reviewStatus === 'rejected'  ->  canSubmit true, canPublish false.
    expect(screen.getByTestId('instructor-course-edit-submit')).toBeInTheDocument();
    expect(screen.queryByTestId('instructor-course-edit-publish')).not.toBeInTheDocument();

    const rejection = await screen.findByTestId('instructor-course-edit-rejection');
    expect(rejection).toHaveTextContent(
      "Robert'); DROP TABLE courses;-- <img src=x onerror=alert(1)>"
    );
    // Rendered as a text node: the payload created no element.
    expect(rejection.querySelector('img')).toBeNull();
    expect(document.querySelector('img[src="x"]')).toBeNull();

    // The cancel control in the header points back at the list route.
    expect(screen.getByTestId('instructor-course-edit-cancel')).toHaveAttribute(
      'href',
      '/instructor/courses'
    );
  });

  it('IT-ICOURSEEDIT-003: should show the Publish button and hide Submit when an approved course is still a draft, and call publishCourse when it is pressed', async () => {
    const approved = makeCourse({ reviewStatus: 'approved', status: 'draft' });
    getCourseDetailMock.mockResolvedValue(makeDetail({ reviewStatus: 'approved' }));
    publishMock.mockResolvedValue({
      ...approved,
      status: 'published',
      publishedAt: '2026-10-04T00:00:00Z',
    });
    renderEdit();
    await waitForForm();

    expect(screen.getByTestId('instructor-course-edit-status')).toHaveTextContent('Draft');
    expect(screen.getByTestId('instructor-course-edit-review')).toHaveTextContent('Approved');
    // reviewStatus === 'approved' && status !== 'published'  ->  canPublish true.
    expect(screen.getByTestId('instructor-course-edit-publish')).toBeInTheDocument();
    expect(screen.queryByTestId('instructor-course-edit-submit')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('instructor-course-edit-publish'));

    await waitFor(() => {
      expect(publishMock).toHaveBeenCalledTimes(1);
    });
    expect(publishMock).toHaveBeenCalledWith(COURSE_ID);
    // Publishing must not touch the update or submit endpoints.
    expect(updateCourseMock).not.toHaveBeenCalled();
    expect(submitMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// IT-ICOURSEEDIT-004 — saving the form: UpdateCourse payload + navigation.
// ---------------------------------------------------------------------------
describe('IT-ICOURSEEDIT-004: CourseEditPage save', () => {
  it('IT-ICOURSEEDIT-004: should PATCH the trimmed title, keep the existing curriculum, and navigate to the list route when the form is saved', async () => {
    getCourseDetailMock.mockResolvedValue(makeDetail());
    updateCourseMock.mockImplementation(async (_id, payload) => ({ ...makeCourse(), ...payload }));
    renderEdit();
    await waitForForm();

    const title = screen.getByTestId('instructor-course-form-title');
    await userEvent.clear(title);
    await userEvent.type(title, '  Renamed Course  ');

    // Step 2 shows the fetched chapter and lesson; nothing is removed, so
    // `syncCurriculum` must issue no curriculum write at all.
    await userEvent.click(stepButton(2));
    expect(screen.getByTestId('instructor-course-form-chapter-title')).toHaveValue('Chapter 1');
    await userEvent.click(screen.getByTestId('instructor-course-form-add-lesson'));
    expect(screen.getAllByTestId('instructor-course-form-lesson')).toHaveLength(2);

    await userEvent.click(stepButton(3));
    await userEvent.click(screen.getByTestId('instructor-course-form-submit'));

    await waitFor(() => {
      expect(updateCourseMock).toHaveBeenCalledTimes(1);
    });

    const [id, payload] = updateCourseMock.mock.calls[0];
    expect(id).toBe(COURSE_ID);
    expect(payload).toMatchObject({
      title: 'Renamed Course',
      categoryId: 'cat-1',
      difficultyLevel: 2,
      // price is 0 on the loaded course, so the free model sends an explicit 0.
      price: 0,
    });
    // A blank thumbnailUrl is sent as `undefined` so the backend keeps the old value.
    expect(payload.thumbnailUrl).toBeUndefined();

    // Existing chapter/lesson kept, one brand-new untitled lesson -> skipped.
    expect(contentApi.deleteChapter).not.toHaveBeenCalled();
    expect(contentApi.deleteLesson).not.toHaveBeenCalled();
    expect(contentApi.addChapter).not.toHaveBeenCalled();
    expect(contentApi.addLesson).not.toHaveBeenCalled();

    expect(await screen.findByTestId('LIST_ROUTE')).toBeInTheDocument();
  });
});
