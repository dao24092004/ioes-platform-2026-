/** Wave 3B (instructor) — Unit: content.api.ts course CRUD + status workflow. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Replace ONLY the HTTP boundary. `ApiError` / `toApiError` stay real so the
// error-mapping rows assert production behaviour instead of a stub.
vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import { apiClient, ApiError } from '@/config/api.config';
import {
  createCourse,
  deleteCourse,
  getCourse,
  getCourseDetail,
  listCategories,
  listCourses,
  publishCourse,
  rejectCourse,
  submitCourseForReview,
  updateCourse,
  type Course,
  type CourseDetail,
  type CourseStatus,
  type ReviewStatus,
} from '@/services/api/content.api';

// ---------------------------------------------------------------------------
// Request recorder — an explicit, readable list of what the wrapper asked the
// HTTP client to do, instead of asserting on mock internals.
// ---------------------------------------------------------------------------
interface RecordedRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  params?: Record<string, unknown>;
  body?: unknown;
}

const requests: RecordedRequest[] = [];

/** Per-test response override; `null` means "use the neutral default". */
let response: { data: unknown } | null = null;

const respondWith = (data: unknown): void => {
  response = { data };
};

const emptyPage = { data: [], meta: { total: 0, page: 1, perPage: 10, totalPages: 0 } };

const makeCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'c-1',
  instructorId: 'i-1',
  categoryId: 'cat-1',
  title: 'React Testing Deep Dive',
  slug: 'react-testing-deep-dive',
  shortDescription: 'short',
  description: 'long',
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
});

const makeDetail = (course: Course): CourseDetail => ({
  course,
  chapters: [
    {
      id: 'ch-1',
      courseId: course.id,
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

/** A realistic rejected axios call: `isAxiosError` + `response.status` + `response.data`. */
const axiosHttpError = (status: number, data: unknown, message = 'Request failed') =>
  Object.assign(new Error(message), {
    isAxiosError: true,
    response: { status, data },
    message,
  });

beforeEach(() => {
  requests.length = 0;
  response = null;

  vi.mocked(apiClient.get).mockImplementation(((
    url: string,
    config?: { params?: Record<string, unknown> }
  ) => {
    requests.push({ method: 'GET', url, params: config?.params });
    return Promise.resolve(response ?? { data: emptyPage });
  }) as never);

  vi.mocked(apiClient.post).mockImplementation(((url: string, body?: unknown) => {
    requests.push({ method: 'POST', url, body });
    return Promise.resolve(response ?? { data: body });
  }) as never);

  vi.mocked(apiClient.patch).mockImplementation(((url: string, body?: unknown) => {
    requests.push({ method: 'PATCH', url, body });
    return Promise.resolve(response ?? { data: body });
  }) as never);

  vi.mocked(apiClient.delete).mockImplementation(((url: string) => {
    requests.push({ method: 'DELETE', url });
    return Promise.resolve({ data: undefined });
  }) as never);
});

// ---------------------------------------------------------------------------
// Table helper: keeps the "table-driven" requirement while giving every row
// its own greppable ID in the required `<ID>: should … when …` name format.
// ---------------------------------------------------------------------------
interface Row {
  id: string;
  should: string;
  when: string;
  run: () => Promise<void> | void;
}

const table = (title: string, rows: Row[]) => {
  describe(title, () => {
    for (const row of rows) {
      it(`${row.id}: should ${row.should} when ${row.when}`, async () => {
        await row.run();
      });
    }
  });
};

// ---------------------------------------------------------------------------
// Create / read / update / delete
// ---------------------------------------------------------------------------
table('contentApi course CRUD', [
  {
    id: 'UT-ICOURSES-001',
    should: 'POST the create payload to /api/v1/courses and resolve with the created DTO',
    when: 'an instructor saves a new course draft',
    run: async () => {
      const created = makeCourse({ id: 'c-new', title: 'Khoá học mới' });
      respondWith(created);

      const payload = {
        title: 'Khoá học mới',
        slug: 'khoa-hoc-moi-lz3k9',
        categoryId: null,
        price: 0,
        currency: 'VND',
        difficultyLevel: 1,
        language: 'vi',
      };
      const result = await createCourse(payload);

      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('POST');
      expect(requests[0].url).toBe('/api/v1/courses');
      expect(requests[0].body).toEqual(payload);
      expect(result).toEqual(created);
    },
  },
  {
    id: 'UT-ICOURSES-002',
    should: 'PATCH /api/v1/courses/:id with only the keys the caller supplied',
    when: 'the edit form saves a partial update',
    run: async () => {
      const result = await updateCourse('c-42', { title: 'Đã đổi tên', price: 199000 });

      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('PATCH');
      expect(requests[0].url).toBe('/api/v1/courses/c-42');
      expect(Object.keys(requests[0].body as object).sort()).toEqual(['price', 'title']);
      expect(result).toEqual({ title: 'Đã đổi tên', price: 199000 });
    },
  },
  {
    id: 'UT-ICOURSES-003',
    should: 'forward the new status in the PATCH body',
    when: 'a course is moved to the archived state',
    run: async () => {
      await updateCourse('c-42', { status: 'archived' as CourseStatus });

      expect(requests[0].url).toBe('/api/v1/courses/c-42');
      expect(requests[0].body).toEqual({ status: 'archived' });
    },
  },
  {
    id: 'UT-ICOURSES-004',
    should: 'GET /api/v1/courses/:id and resolve the bare DTO (no ApiEnvelope wrapper)',
    when: 'a single course is read',
    run: async () => {
      const course = makeCourse({ id: 'c-7' });
      respondWith(course);

      const result = await getCourse('c-7');

      expect(requests[0].method).toBe('GET');
      expect(requests[0].url).toBe('/api/v1/courses/c-7');
      expect(result).toEqual(course);
      expect(result).not.toHaveProperty('data.data');
    },
  },
  {
    id: 'UT-ICOURSES-005',
    should: 'GET /api/v1/courses/:id/detail and resolve the course with its chapter tree',
    when: 'the edit page loads a course for editing',
    run: async () => {
      const detail = makeDetail(makeCourse({ id: 'c-9', title: 'Có chương' }));
      respondWith(detail);

      const result = await getCourseDetail('c-9');

      expect(requests[0].url).toBe('/api/v1/courses/c-9/detail');
      expect(result.course.title).toBe('Có chương');
      expect(result.chapters).toHaveLength(1);
      expect(result.chapters[0].lessons[0].durationMinutes).toBe(30);
    },
  },
  {
    id: 'UT-ICOURSES-006',
    should: 'DELETE /api/v1/courses/:id and resolve with undefined',
    when: 'a course is removed',
    run: async () => {
      const result = await deleteCourse('c-7');

      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('DELETE');
      expect(requests[0].url).toBe('/api/v1/courses/c-7');
      expect(result).toBeUndefined();
    },
  },
]);

// ---------------------------------------------------------------------------
// Status workflow — the three transitions the edit page's header buttons fire.
// ---------------------------------------------------------------------------
interface StatusStep {
  id: string;
  should: string;
  when: string;
  url: string;
  call: () => Promise<Course>;
}

const statusSteps: StatusStep[] = [
  {
    id: 'UT-ICOURSES-007',
    should: 'POST /api/v1/courses/:id/submit and resolve the updated DTO',
    when: 'an instructor sends a draft for review',
    url: '/api/v1/courses/c-3/submit',
    call: () => submitCourseForReview('c-3'),
  },
  {
    id: 'UT-ICOURSES-008',
    should: 'POST /api/v1/courses/:id/publish and resolve the updated DTO',
    when: 'an approved course is published',
    url: '/api/v1/courses/c-3/publish',
    call: () => publishCourse('c-3'),
  },
];

table(
  'contentApi status workflow',
  statusSteps.map((step) => ({
    id: step.id,
    should: step.should,
    when: step.when,
    run: async () => {
      const moved = makeCourse({ id: 'c-3', status: 'published', reviewStatus: 'approved' });
      respondWith(moved);

      const result = await step.call();

      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('POST');
      expect(requests[0].url).toBe(step.url);
      expect(result).toEqual(moved);
    },
  }))
);

table('contentApi rejection', [
  {
    id: 'UT-ICOURSES-009',
    should: 'POST /api/v1/courses/:id/reject with the reason wrapped in a body object',
    when: 'an admin rejects a course',
    run: async () => {
      const rejected = makeCourse({ reviewStatus: 'rejected', rejectionReason: 'Thiếu nội dung' });
      respondWith(rejected);

      const result = await rejectCourse('c-3', 'Thiếu nội dung');

      expect(requests[0].url).toBe('/api/v1/courses/c-3/reject');
      expect(requests[0].body).toEqual({ reason: 'Thiếu nội dung' });
      expect(result.rejectionReason).toBe('Thiếu nội dung');
    },
  },
]);

// ---------------------------------------------------------------------------
// Categories — the dropdown on both form pages and the row labels on the list.
// ---------------------------------------------------------------------------
table('contentApi categories', [
  {
    id: 'UT-ICOURSES-010',
    should: 'GET /api/v1/categories and resolve the bare array',
    when: 'the category dropdown and the list rows resolve their category names',
    run: async () => {
      const categories = [
        {
          id: 'cat-1',
          name: 'Lập trình',
          slug: 'lap-trinh',
          description: null,
          parentId: null,
          icon: null,
          sortOrder: 1,
        },
      ];
      respondWith(categories);

      const result = await listCategories();

      expect(requests[0].method).toBe('GET');
      expect(requests[0].url).toBe('/api/v1/categories');
      expect(result).toEqual(categories);
      expect(result[0].name).toBe('Lập trình');
    },
  },
]);

// ---------------------------------------------------------------------------
// listCourses parameter building. CoursesPage issues `mine=true, perPage=100`.
// `axios.getUri` is the real serializer, so "dropped from the query string" is
// asserted on the actual URL rather than on the params object shape.
// ---------------------------------------------------------------------------
table('contentApi listCourses parameter building', [
  {
    id: 'UT-ICOURSES-011',
    should: 'rename perPage to the snake_case per_page query param and keep mine=true',
    when: 'the list page asks the backend for the maximum of 100 own courses',
    run: async () => {
      await listCourses({ mine: true, perPage: 100 });

      expect(requests[0].url).toBe('/api/v1/courses');
      expect(requests[0].params?.per_page).toBe(100);
      expect(requests[0].params).not.toHaveProperty('perPage');
      expect(requests[0].params?.mine).toBe(true);
    },
  },
  {
    id: 'UT-ICOURSES-012',
    should: 'omit mine from the serialized query string',
    when: 'another screen lists every course instead of only the caller own',
    run: async () => {
      await listCourses({ mine: false });

      const uri = axios.getUri({
        url: '/api/v1/courses',
        params: requests[0].params as Record<string, unknown>,
      });
      expect(requests[0].params?.mine).toBeUndefined();
      expect(uri).not.toContain('mine');
    },
  },
  {
    id: 'UT-ICOURSES-013',
    should: 'omit search from the serialized query string',
    when: 'the list search box holds spaces but no keyword',
    run: async () => {
      await listCourses({ search: '   ' });

      const uri = axios.getUri({
        url: '/api/v1/courses',
        params: requests[0].params as Record<string, unknown>,
      });
      expect(requests[0].params?.search).toBeUndefined();
      expect(uri).not.toContain('search');
    },
  },
  {
    id: 'UT-ICOURSES-014',
    should: 'forward status, reviewStatus, categoryId and page into the query string',
    when: 'a filtered, paginated catalogue query is issued',
    run: async () => {
      await listCourses({
        status: 'published' as CourseStatus,
        reviewStatus: 'approved' as ReviewStatus,
        categoryId: 'cat-7',
        page: 3,
      });

      expect(requests[0].params).toMatchObject({
        status: 'published',
        reviewStatus: 'approved',
        categoryId: 'cat-7',
        page: 3,
      });
      expect(axios.getUri({ url: requests[0].url, params: requests[0].params })).toBe(
        '/api/v1/courses?status=published&reviewStatus=approved&categoryId=cat-7&page=3'
      );
    },
  },
]);

// ---------------------------------------------------------------------------
// Error mapping — real `toApiError` from src/config/api.config.ts.
// ---------------------------------------------------------------------------
table('contentApi error mapping', [
  {
    id: 'UT-ICOURSES-015',
    should: 'throw ApiError carrying the backend message, status and traceId',
    when: 'the backend answers 409 with an ApiEnvelope error body',
    run: async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(
        axiosHttpError(409, { success: false, message: 'Slug đã tồn tại', traceId: 'tr-9' })
      );

      const err = await createCourse({ title: 'A', slug: 'a' }).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toBe('Slug đã tồn tại');
      expect((err as ApiError).status).toBe(409);
      expect((err as ApiError).traceId).toBe('tr-9');
    },
  },
  {
    id: 'UT-ICOURSES-016',
    should: 'fall back to the axios error message when the error body has no message',
    when: 'a proxy answers 502 with an HTML body',
    run: async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(
        axiosHttpError(502, '<html>Bad Gateway</html>', 'Request failed with status code 502')
      );

      const err = await getCourse('c-7').catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toBe('Request failed with status code 502');
      expect((err as ApiError).status).toBe(502);
    },
  },
  {
    id: 'UT-ICOURSES-017',
    should: 'throw the Vietnamese timeout message with no status',
    when: 'the request is aborted by the axios timeout',
    run: async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(
        Object.assign(new Error('timeout of 120000ms exceeded'), {
          isAxiosError: true,
          code: 'ECONNABORTED',
        })
      );

      const err = await getCourseDetail('c-7').catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toBe('Yêu cầu quá thời gian chờ');
      expect((err as ApiError).status).toBeUndefined();
    },
  },
]);
