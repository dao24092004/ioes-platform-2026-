/** Batch Wave 1A — Unit: content.api.ts pure helpers + list/find wrappers */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Course, Chapter } from '@/services/api/content.api';

// ---------------------------------------------------------------------------
// Mock BEFORE any import that triggers module-level side-effects.
// ---------------------------------------------------------------------------
vi.mock('@/config/api.config', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  toApiError: (e: unknown) => e,
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are set.
// ---------------------------------------------------------------------------
import {
  courseStat,
  formatCoursePrice,
  countLessons,
  isPaidCourse,
  listCourses,
  findCourseBySlug,
} from '@/services/api/content.api';
import { apiClient } from '@/config/api.config';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'c-1',
  instructorId: 'i-1',
  categoryId: null,
  title: 'Test Course',
  slug: 'test-course',
  shortDescription: null,
  description: null,
  thumbnailUrl: null,
  previewVideoUrl: null,
  price: null,
  currency: null,
  durationHours: null,
  difficultyLevel: null,
  language: null,
  status: 'published',
  reviewStatus: 'approved',
  rejectionReason: null,
  publishedAt: null,
  stats: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const makeChapter = (lessons: number, overrides: Partial<Chapter> = {}): Chapter => ({
  id: 'ch-1',
  courseId: 'c-1',
  title: 'Chapter 1',
  description: null,
  sortOrder: null,
  isFree: null,
  lessons: Array.from({ length: lessons }, (_, i) => ({
    id: `l-${i + 1}`,
    chapterId: 'ch-1',
    title: `Lesson ${i + 1}`,
    description: null,
    lessonType: 'video' as const,
    contentUrl: null,
    durationMinutes: null,
    sortOrder: null,
    isFree: null,
    isPreview: null,
  })),
  ...overrides,
});

// ---------------------------------------------------------------------------
// courseStat
// ---------------------------------------------------------------------------
describe('courseStat', () => {
  it('UT-CONTENTAPI-001: should return null when stats is missing (null)', () => {
    const c = makeCourse({ stats: null });
    expect(courseStat(c, 'enrollments')).toBeNull();
  });

  it('UT-CONTENTAPI-002: should return null when stats is undefined', () => {
    const c = makeCourse({ stats: undefined as unknown as null });
    expect(courseStat(c, 'enrollments')).toBeNull();
  });

  it('UT-CONTENTAPI-003: should return null when the key is missing from stats', () => {
    const c = makeCourse({ stats: { other_key: 99 } });
    expect(courseStat(c, 'enrollments')).toBeNull();
  });

  it('UT-CONTENTAPI-004: should return null when the key exists but value is null', () => {
    const c = makeCourse({ stats: { enrollments: null } });
    expect(courseStat(c, 'enrollments')).toBeNull();
  });

  it('UT-CONTENTAPI-005: should return null when the key value is an empty string', () => {
    const c = makeCourse({ stats: { enrollments: '' } });
    expect(courseStat(c, 'enrollments')).toBeNull();
  });

  it('UT-CONTENTAPI-006: should return 0 when the key value is the number 0', () => {
    const c = makeCourse({ stats: { enrollments: 0 } });
    expect(courseStat(c, 'enrollments')).toBe(0);
  });

  it('UT-CONTENTAPI-007: should return the number when the key value is a string number', () => {
    const c = makeCourse({ stats: { enrollments: '42' } });
    expect(courseStat(c, 'enrollments')).toBe(42);
  });

  it('UT-CONTENTAPI-008: should return null when the key value is an object', () => {
    const c = makeCourse({ stats: { enrollments: { a: 1 } } });
    expect(courseStat(c, 'enrollments')).toBeNull();
  });

  it('UT-CONTENTAPI-009: should return null when the key value is an array', () => {
    const c = makeCourse({ stats: { enrollments: [1, 2, 3] } });
    expect(courseStat(c, 'enrollments')).toBeNull();
  });

  it('UT-CONTENTAPI-010: should return null when the key value is Infinity', () => {
    const c = makeCourse({ stats: { enrollments: Infinity } });
    expect(courseStat(c, 'enrollments')).toBeNull();
  });

  it('UT-CONTENTAPI-011: should return null when the key value is NaN', () => {
    const c = makeCourse({ stats: { enrollments: NaN } });
    expect(courseStat(c, 'enrollments')).toBeNull();
  });

  it('UT-CONTENTAPI-012: should return a positive integer when the key value is a finite number', () => {
    const c = makeCourse({ stats: { enrollments: 1234 } });
    expect(courseStat(c, 'enrollments')).toBe(1234);
  });
});

// ---------------------------------------------------------------------------
// formatCoursePrice
// ---------------------------------------------------------------------------
describe('formatCoursePrice', () => {
  const freeLabel = 'Miễn phí';

  it('UT-CONTENTAPI-013: should return freeLabel when price is null', () => {
    const c = makeCourse({ price: null });
    expect(formatCoursePrice(c, freeLabel)).toBe(freeLabel);
  });

  it('UT-CONTENTAPI-014: should return freeLabel when price is 0', () => {
    const c = makeCourse({ price: 0 });
    expect(formatCoursePrice(c, freeLabel)).toBe(freeLabel);
  });

  it('UT-CONTENTAPI-015: should format VND integer with thousands separators', () => {
    const c = makeCourse({ price: 1250000, currency: 'VND' });
    expect(formatCoursePrice(c, freeLabel)).toBe('1.250.000đ');
  });

  it('UT-CONTENTAPI-016: should format VND with decimal using vi-VN locale (decimal separator shown)', () => {
    const c = makeCourse({ price: 99999.5, currency: 'VND' });
    // toLocaleString('vi-VN') formats both integer and decimal parts:
    // 99999.5 → "99.999,5" (comma as decimal separator in Vietnamese locale)
    expect(formatCoursePrice(c, freeLabel)).toBe('99.999,5đ');
  });

  it('UT-CONTENTAPI-017: should format USD with two decimal places', () => {
    const c = makeCourse({ price: 29.99, currency: 'USD' });
    expect(formatCoursePrice(c, freeLabel)).toBe('29.99 USD');
  });

  it('UT-CONTENTAPI-018: should default to VND when currency is undefined', () => {
    const c = makeCourse({ price: 500000, currency: undefined as unknown as null });
    expect(formatCoursePrice(c, freeLabel)).toBe('500.000đ');
  });

  it('UT-CONTENTAPI-019: should return freeLabel when price is 0 even if currency is non-VND (price 0 means free)', () => {
    const c = makeCourse({ price: 0, currency: 'USD' });
    // The implementation treats price === 0 as free regardless of currency.
    expect(formatCoursePrice(c, freeLabel)).toBe('Miễn phí');
  });
});

// ---------------------------------------------------------------------------
// countLessons
// ---------------------------------------------------------------------------
describe('countLessons', () => {
  it('UT-CONTENTAPI-020: should return 0 when chapters array is empty', () => {
    expect(countLessons([])).toBe(0);
  });

  it('UT-CONTENTAPI-021: should return 0 when a single chapter has 0 lessons', () => {
    expect(countLessons([makeChapter(0)])).toBe(0);
  });

  it('UT-CONTENTAPI-022: should return the lesson count when a single chapter has multiple lessons', () => {
    expect(countLessons([makeChapter(5)])).toBe(5);
  });

  it('UT-CONTENTAPI-023: should sum lessons across multiple chapters', () => {
    const chapters = [makeChapter(3), makeChapter(2), makeChapter(4)];
    expect(countLessons(chapters)).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// isPaidCourse
// ---------------------------------------------------------------------------
describe('isPaidCourse', () => {
  it('UT-CONTENTAPI-024: should return false when price is null', () => {
    const c = makeCourse({ price: null });
    expect(isPaidCourse(c)).toBe(false);
  });

  it('UT-CONTENTAPI-025: should return false when price is 0', () => {
    const c = makeCourse({ price: 0 });
    expect(isPaidCourse(c)).toBe(false);
  });

  it('UT-CONTENTAPI-026: should return true when price is positive', () => {
    const c = makeCourse({ price: 299000 });
    expect(isPaidCourse(c)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// listCourses
// ---------------------------------------------------------------------------
describe('listCourses', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it('UT-CONTENTAPI-027: should call apiClient.get with the courses endpoint', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, perPage: 9, totalPages: 1 } },
    } as unknown as ReturnType<typeof apiClient.get>);
    await listCourses();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/courses', expect.any(Object));
  });

  it('UT-CONTENTAPI-028: should pass params correctly and omit undefined fields', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, perPage: 9, totalPages: 1 } },
    } as unknown as ReturnType<typeof apiClient.get>);
    await listCourses({ search: 'react', categoryId: 'cat-1', page: 2, perPage: 18 });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/courses',
      expect.objectContaining({
        params: expect.objectContaining({
          search: 'react',
          categoryId: 'cat-1',
          page: 2,
          per_page: 18,
        }),
      })
    );
  });

  it('UT-CONTENTAPI-029: should trim whitespace from search before sending', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, perPage: 9, totalPages: 1 } },
    } as unknown as ReturnType<typeof apiClient.get>);
    await listCourses({ search: '  python  ' });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/courses',
      expect.objectContaining({
        params: expect.objectContaining({ search: 'python' }),
      })
    );
  });

  it('UT-CONTENTAPI-030: mine=false should not appear as a query param in the URL (axios serializes undefined as absent)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, perPage: 9, totalPages: 1 } },
    } as unknown as ReturnType<typeof apiClient.get>);
    await listCourses({ mine: false });
    // The implementation sets mine: undefined (since false || undefined = undefined).
    // axios serializes { mine: undefined } to an absent URL param, which is the
    // correct behavior: mine=false must not appear as a query parameter.
    // We verify by checking the raw URLSearchParams from the test call.
    const axiosConfig = vi.mocked(apiClient.get).mock.calls[0]?.[1] as
      { params: Record<string, unknown> } | undefined;
    const rawParams = axiosConfig?.params ?? {};
    // mine should not appear as a non-undefined key in the params object.
    const hasDefinedMine = 'mine' in rawParams && rawParams.mine !== undefined;
    expect(hasDefinedMine).toBe(false);
  });

  it('UT-CONTENTAPI-031: should convert perPage to snake_case per_page in params', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, perPage: 9, totalPages: 1 } },
    } as unknown as ReturnType<typeof apiClient.get>);
    await listCourses({ perPage: 20 });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/courses',
      expect.objectContaining({
        params: expect.objectContaining({ per_page: 20 }),
      })
    );
  });

  it('UT-CONTENTAPI-032: should send mine=true when provided', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, perPage: 9, totalPages: 1 } },
    } as unknown as ReturnType<typeof apiClient.get>);
    await listCourses({ mine: true });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/courses',
      expect.objectContaining({
        params: expect.objectContaining({ mine: true }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// findCourseBySlug
// ---------------------------------------------------------------------------
describe('findCourseBySlug', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it('UT-CONTENTAPI-033: should return the matching course when slug is found', async () => {
    const fixture = makeCourse({ id: 'c-found', slug: 'python-basics', title: 'Python Basics' });
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: [fixture],
        meta: { total: 1, page: 1, perPage: 100, totalPages: 1 },
      },
    } as unknown as ReturnType<typeof apiClient.get>);

    const result = await findCourseBySlug('python-basics');
    expect(result).toEqual(fixture);
  });

  it('UT-CONTENTAPI-034: should return null when no course matches the slug', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: [makeCourse({ slug: 'other-slug' })],
        meta: { total: 1, page: 1, perPage: 100, totalPages: 1 },
      },
    } as unknown as ReturnType<typeof apiClient.get>);

    const result = await findCourseBySlug('non-existent-slug');
    expect(result).toBeNull();
  });

  it('UT-CONTENTAPI-035: should call listCourses with trimmed search value', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: [],
        meta: { total: 0, page: 1, perPage: 100, totalPages: 1 },
      },
    } as unknown as ReturnType<typeof apiClient.get>);

    await findCourseBySlug('  web-dev  ');
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/courses',
      expect.objectContaining({
        params: expect.objectContaining({ search: 'web-dev' }),
      })
    );
  });
});
