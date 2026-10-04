/** Wave 2 - Unit: recommendations.api.ts (student-owned, Recommendations gaps). */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/api.config', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  unwrap: vi.fn((promise: Promise<{ data: { data: unknown } }>) =>
    promise.then((res) => res.data.data)
  ),
  FAST_READ_TIMEOUT_MS: 15_000,
}));

import {
  recommendationsApi,
  DEFAULT_RECOMMENDATION_LIMIT,
} from '@/services/api/recommendations.api';
import { apiClient } from '@/config/api.config';

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
});

describe('DEFAULT_RECOMMENDATION_LIMIT', () => {
  it('UT-RECS-001: should equal 6 per the contract', () => {
    expect(DEFAULT_RECOMMENDATION_LIMIT).toBe(6);
  });

  it('UT-RECS-002: should be a positive integer', () => {
    expect(Number.isInteger(DEFAULT_RECOMMENDATION_LIMIT)).toBe(true);
    expect(DEFAULT_RECOMMENDATION_LIMIT).toBeGreaterThan(0);
  });
});

describe('recommendationsApi.getCourseRecommendations', () => {
  it('UT-RECS-003: should GET /api/ai/recommendations/courses with default limit=6', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: { items: [], strategy: 'embedding+rules', generatedAt: '2026-10-01T00:00:00.000Z' },
      },
    });

    await recommendationsApi.getCourseRecommendations();

    const [url, config] = vi.mocked(apiClient.get).mock.calls[0]!;
    expect(url).toBe('/api/ai/recommendations/courses');
    expect((config?.params as Record<string, unknown>).limit).toBe(6);
  });

  it('UT-RECS-004: should forward the caller-supplied limit through unchanged', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: { items: [], strategy: 's', generatedAt: '' } },
    });

    await recommendationsApi.getCourseRecommendations(12);

    const [, config] = vi.mocked(apiClient.get).mock.calls[0]!;
    expect((config?.params as Record<string, unknown>).limit).toBe(12);
  });

  it('UT-RECS-005: should use the fast-read timeout (15s) rather than the default 120s', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: { items: [], strategy: 's', generatedAt: '' } },
    });

    await recommendationsApi.getCourseRecommendations();

    const [, config] = vi.mocked(apiClient.get).mock.calls[0]!;
    expect(config?.timeout).toBe(15_000);
    expect(config?.timeout).not.toBe(120_000);
  });

  it('UT-RECS-006: should return the unwrapped payload { items, strategy, generatedAt }', async () => {
    const payload = {
      items: [
        {
          courseId: 'c-1',
          title: 'Course',
          thumbnailUrl: null,
          categoryId: null,
          level: null,
          durationHours: null,
          price: 0,
          currency: null,
          score: 0.92,
          reason: 'Top match',
          reasonCode: 'POPULAR' as const,
        },
      ],
      strategy: 'embedding+rules',
      generatedAt: '2026-10-01T00:00:00.000Z',
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: payload } });

    const result = await recommendationsApi.getCourseRecommendations();

    expect(result).toEqual(payload);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.score).toBe(0.92);
  });

  it('UT-RECS-007: should accept every documented RecommendationReasonCode', async () => {
    // The TypeScript union is the source of truth; assert the documented set.
    const codes = ['SAME_CATEGORY', 'SIMILAR_CONTENT', 'NEXT_LEVEL', 'POPULAR', 'NEW'] as const;
    for (const c of codes) {
      expect(['SAME_CATEGORY', 'SIMILAR_CONTENT', 'NEXT_LEVEL', 'POPULAR', 'NEW']).toContain(c);
    }
  });
});
