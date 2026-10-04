/** Wave 3B (instructor) — Unit: content.api.ts curriculum (chapter / lesson) API. */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import { apiClient, ApiError } from '@/config/api.config';
import {
  addChapter,
  addLesson,
  contentApi,
  deleteChapter,
  deleteLesson,
  getCourseDetail,
  updateCourse,
} from '@/services/api/content.api';

interface RecordedRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  body?: unknown;
}

const requests: RecordedRequest[] = [];
let response: { data: unknown } | null = null;
const respondWith = (data: unknown): void => {
  response = { data };
};

const makeChapter = (id: string, courseId: string) => ({
  id,
  courseId,
  title: 'Chapter 1',
  description: null,
  sortOrder: 1,
  isFree: null,
  lessons: [],
});

const makeLesson = (id: string, chapterId: string) => ({
  id,
  chapterId,
  title: 'Lesson 1',
  description: null,
  lessonType: 'video' as const,
  contentUrl: null,
  durationMinutes: 45,
  sortOrder: 1,
  isFree: null,
  isPreview: null,
});

beforeEach(() => {
  requests.length = 0;
  response = null;

  vi.mocked(apiClient.get).mockImplementation(((url: string) => {
    requests.push({ method: 'GET', url });
    return Promise.resolve(response ?? { data: null });
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
// Chapter / lesson calls made by CourseCreatePage and CourseEditPage.
// ---------------------------------------------------------------------------
table('contentApi curriculum endpoints used by the instructor course forms', [
  {
    id: 'UT-ICOURSES-018',
    should: 'POST the chapter to /api/v1/courses/:courseId/chapters and resolve the bare Chapter',
    when: 'the create form saves a draft whose curriculum has one named chapter',
    run: async () => {
      const created = makeChapter('ch-9', 'c-5');
      respondWith(created);

      const result = await addChapter('c-5', { title: 'Chương 1', sortOrder: 1 });

      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('POST');
      expect(requests[0].url).toBe('/api/v1/courses/c-5/chapters');
      expect(requests[0].body).toEqual({ title: 'Chương 1', sortOrder: 1 });
      expect(result).toEqual(created);
      expect(result.id).toBe('ch-9');
    },
  },
  {
    id: 'UT-ICOURSES-019',
    should:
      'POST the lesson to /api/v1/courses/:courseId/chapters/:chapterId/lessons and resolve the bare Lesson',
    when: 'the create form saves a draft whose first chapter has one named lesson',
    run: async () => {
      const created = makeLesson('l-9', 'ch-9');
      respondWith(created);

      const result = await addLesson('c-5', 'ch-9', {
        title: 'Bài 1',
        lessonType: 'video',
        durationMinutes: 45,
        sortOrder: 1,
      });

      expect(requests[0].url).toBe('/api/v1/courses/c-5/chapters/ch-9/lessons');
      expect(requests[0].body).toEqual({
        title: 'Bài 1',
        lessonType: 'video',
        durationMinutes: 45,
        sortOrder: 1,
      });
      expect(result).toEqual(created);
    },
  },
  {
    id: 'UT-ICOURSES-020',
    should: 'DELETE /api/v1/courses/:courseId/chapters/:chapterId and resolve with undefined',
    when: 'the edit form drops a chapter that no longer exists in the saved course',
    run: async () => {
      const result = await deleteChapter('c-5', 'ch-3');

      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('DELETE');
      expect(requests[0].url).toBe('/api/v1/courses/c-5/chapters/ch-3');
      expect(result).toBeUndefined();
    },
  },
  {
    id: 'UT-ICOURSES-021',
    should:
      'DELETE /api/v1/courses/:courseId/chapters/:chapterId/lessons/:lessonId and resolve with undefined',
    when: 'the edit form drops a lesson that no longer exists in the saved chapter',
    run: async () => {
      const result = await deleteLesson('c-5', 'ch-3', 'l-8');

      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('DELETE');
      expect(requests[0].url).toBe('/api/v1/courses/c-5/chapters/ch-3/lessons/l-8');
      expect(result).toBeUndefined();
    },
  },
  {
    id: 'UT-ICOURSES-022',
    should: 'throw ApiError with the backend status when a curriculum write is rejected',
    when: 'content-service answers 409 because the chapter title already exists',
    run: async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(
        Object.assign(new Error('Request failed with status code 409'), {
          isAxiosError: true,
          response: { status: 409, data: { success: false, message: 'Chương đã tồn tại' } },
        })
      );

      const err = await addChapter('c-5', { title: 'Chương 1' }).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toBe('Chương đã tồn tại');
      expect((err as ApiError).status).toBe(409);
    },
  },
]);

// ---------------------------------------------------------------------------
// Public surface guard. All three pages call `contentApi.<fn>`; a refactor that
// drops a member from the namespace object would fail at runtime, not at build
// time, because every call site is a dynamic property access.
// ---------------------------------------------------------------------------
table('contentApi namespace surface used by the instructor course pages', [
  {
    id: 'UT-ICOURSES-023',
    should: 'expose every course and curriculum function the three instructor pages call',
    when: 'a page resolves contentApi.<fn> at runtime instead of a static import',
    run: () => {
      const required = [
        'listCourses',
        'getCourse',
        'getCourseDetail',
        'createCourse',
        'updateCourse',
        'deleteCourse',
        'submitCourseForReview',
        'publishCourse',
        'addChapter',
        'addLesson',
        'deleteChapter',
        'deleteLesson',
        'listCategories',
      ] as const;

      for (const name of required) {
        expect(typeof contentApi[name]).toBe('function');
      }

      // The namespace entries must be the very same functions the named
      // exports resolve to, so a test double on one path cannot diverge.
      expect(contentApi.getCourseDetail).toBe(getCourseDetail);
      expect(contentApi.updateCourse).toBe(updateCourse);
    },
  },
]);
