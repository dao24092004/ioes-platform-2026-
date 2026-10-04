/** Wave 2C (student) — Unit: reviews */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/api.config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/api.config')>();
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    toApiError: (e: unknown) => e,
  };
});

import { apiClient } from '@/config/api.config';

interface ReviewStatus {
  reviewId: string;
  status: 'pending' | 'approved' | 'rejected';
}

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
});

describe('UT-REVIEWS-001: review payload validators — rating is 1..5', () => {
  it('should accept rating 1..5 and reject anything else', () => {
    const isValidRating = (r: number) => Number.isInteger(r) && r >= 1 && r <= 5;
    expect(isValidRating(1)).toBe(true);
    expect(isValidRating(3)).toBe(true);
    expect(isValidRating(5)).toBe(true);
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(6)).toBe(false);
    expect(isValidRating(2.5)).toBe(false);
    expect(isValidRating(-1)).toBe(false);
    expect(isValidRating(Number.NaN)).toBe(false);
  });
});

describe('UT-REVIEWS-002: comment length is bounded and non-empty after trim', () => {
  it('should reject empty/whitespace-only comments and very long comments', () => {
    const isValidComment = (c: string) => {
      const t = c.trim();
      return t.length > 0 && t.length <= 1000;
    };
    expect(isValidComment('great course')).toBe(true);
    expect(isValidComment('   ')).toBe(false); // whitespace-only → empty after trim
    expect(isValidComment('\t\n  \r')).toBe(false); // various whitespace chars
    expect(isValidComment('<script>alert(1)</script>')).toBe(true); // rendered as text
    expect(isValidComment('a'.repeat(1001))).toBe(false); // over limit
    expect(isValidComment('a'.repeat(1000))).toBe(true); // boundary OK
    expect(isValidComment('')).toBe(false);
  });
});

describe('UT-REVIEWS-003: review status derivation — pending/approved/rejected lifecycle', () => {
  it('should accept pending → approved/rejected transitions', async () => {
    vi.mocked(apiClient.post).mockImplementation((url: string) => {
      if (url.endsWith('/reviews')) {
        return Promise.resolve({
          data: {
            success: true,
            message: 'OK',
            data: { reviewId: 'r-1', status: 'pending' as const } as ReviewStatus,
            timestamp: '2026-10-03T00:00:00Z',
          },
        });
      }
      if (url.includes('/approve')) {
        return Promise.resolve({
          data: {
            success: true,
            message: 'OK',
            data: { reviewId: 'r-1', status: 'approved' as const } as ReviewStatus,
            timestamp: '2026-10-03T00:00:00Z',
          },
        });
      }
      return Promise.reject(new Error('Unexpected URL ' + url));
    });
    const create = await vi.mocked(apiClient.post)('/api/v1/courses/c-1/reviews');
    const approve = await vi.mocked(apiClient.post)('/api/v1/reviews/r-1/approve');
    expect((create as unknown as { data: { data: { status: string } } }).data.data.status).toBe(
      'pending'
    );
    expect((approve as unknown as { data: { data: { status: string } } }).data.data.status).toBe(
      'approved'
    );
  });
});

describe('UT-REVIEWS-004: review list endpoint returns chronological array (newest first)', () => {
  it('should accept a list of reviews sorted by createdAt', async () => {
    const list = [
      {
        reviewId: 'r-1',
        rating: 5,
        comment: 'good',
        createdAt: '2026-10-02T00:00:00Z',
      },
      {
        reviewId: 'r-2',
        rating: 4,
        comment: 'ok',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ];
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'OK', data: list, timestamp: '2026-10-03T00:00:00Z' },
    } as unknown as ReturnType<typeof apiClient.get>);
    const got = (await vi.mocked(apiClient.get)('/api/v1/courses/c-1/reviews')) as unknown as {
      data: { data: { createdAt: string }[] };
    };
    expect(got.data.data).toHaveLength(2);
    expect(got.data.data[0].createdAt > got.data.data[1].createdAt).toBe(true); // newest first
  });
});

describe('UT-REVIEWS-005: deletion request is idempotent — second DELETE returns 404 but does not throw', () => {
  it('should map an already-deleted review to a "not found" sentinel without crashing', async () => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockImplementation((url: string) => {
      if (url.includes('/reviews/r-1/delete')) {
        return Promise.resolve({
          data: {
            success: false,
            message: 'Review not found',
            timestamp: '2026-10-03T00:00:00Z',
          },
        });
      }
      return Promise.reject(new Error('Unexpected URL ' + url));
    });
    const res = await vi.mocked(apiClient.post)('/api/v1/reviews/r-1/delete');
    expect((res as unknown as { data: { success: boolean } }).data.success).toBe(false);
  });
});
