/** Wave 2 - Unit: content.api.ts (student-owned) */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/api.config', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  toApiError: (e: unknown) => e,
}));

import { listCourses, findCourseBySlug } from '@/services/api/content.api';
import { apiClient } from '@/config/api.config';

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
});

const makeCourse = (overrides: Record<string, unknown> = {}): unknown => ({
  id: 'c-1',
  instructorId: 'i-1',
  categoryId: null,
  title: 'T',
  slug: 't',
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
  reviewStatus: null,
  rejectionReason: null,
  publishedAt: null,
  stats: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('listCourses — search param mapping', () => {
  it('UT-SEARCH-001: should trim whitespace search and send undefined when empty', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, perPage: 9, totalPages: 1 } },
    });

    await listCourses({ search: '   ', status: 'published', perPage: 9 });

    const [, config] = vi.mocked(apiClient.get).mock.calls[0]!;
    expect((config?.params as Record<string, unknown>).search).toBeUndefined();
  });

  it('UT-SEARCH-002: should send a trimmed non-empty search string through unchanged', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, perPage: 9, totalPages: 1 } },
    });

    await listCourses({ search: '  react  ', status: 'published', perPage: 9 });

    const [, config] = vi.mocked(apiClient.get).mock.calls[0]!;
    expect((config?.params as Record<string, unknown>).search).toBe('react');
  });

  it('UT-SEARCH-003: should map perPage to per_page (snake_case) per the Java contract', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, perPage: 1, page: 1, totalPages: 1 } },
    });

    await listCourses({ perPage: 25 });

    const [, config] = vi.mocked(apiClient.get).mock.calls[0]!;
    const params = (config?.params ?? {}) as Record<string, unknown>;
    expect(params.per_page).toBe(25);
    expect(params.perPage).toBeUndefined();
  });

  it('UT-SEARCH-004: should not send a mine=true flag when omitted', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, perPage: 9, totalPages: 1 } },
    });

    await listCourses({});

    const [, config] = vi.mocked(apiClient.get).mock.calls[0]!;
    const params = (config?.params ?? {}) as Record<string, unknown>;
    expect(params.mine).toBeUndefined();
  });

  it('UT-SEARCH-005: should send mine=true when caller requests own courses', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, perPage: 9, totalPages: 1 } },
    });

    await listCourses({ mine: true });

    const [, config] = vi.mocked(apiClient.get).mock.calls[0]!;
    expect((config?.params as Record<string, unknown>).mine).toBe(true);
  });
});

describe('findCourseBySlug — slug filter', () => {
  it('UT-SEARCH-006: should call listCourses with the slug as the search term', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, perPage: 100, totalPages: 1 } },
    });

    await findCourseBySlug('react-fundamentals');

    const [, config] = vi.mocked(apiClient.get).mock.calls[0]!;
    const params = (config?.params ?? {}) as Record<string, unknown>;
    expect(params.search).toBe('react-fundamentals');
    expect(params.status).toBe('published');
    expect(params.per_page).toBe(100);
  });

  it('UT-SEARCH-007: should return the course whose slug matches exactly', async () => {
    const a = makeCourse({ id: 'a', slug: 'intro' });
    const b = makeCourse({ id: 'b', slug: 'intermediate' });
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [a, b], meta: { total: 2, page: 1, perPage: 100, totalPages: 1 } },
    });

    const result = await findCourseBySlug('intermediate');

    expect(result?.id).toBe('b');
  });

  it('UT-SEARCH-008: should return null when no course has the requested slug', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: [makeCourse({ slug: 'intro' })],
        meta: { total: 1, page: 1, perPage: 100, totalPages: 1 },
      },
    });

    const result = await findCourseBySlug('advanced');

    expect(result).toBeNull();
  });
});
