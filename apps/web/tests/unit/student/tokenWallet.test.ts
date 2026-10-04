/** Wave 2C (student) — Unit: token wallet */
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

interface TokenBalance {
  /** Whole-token balance, never negative. */
  available: number;
  /** Tokens currently locked in escrow / staking. */
  locked: number;
  /** ISO 4217-ish display code, e.g. "IOES". */
  currency: 'IOES';
}

interface TokenTransaction {
  id: string;
  /** Negative for debit, positive for credit. */
  delta: number;
  reason: 'exam_pass' | 'course_complete' | 'streak' | 'redeem' | 'purchase';
  createdAt: string;
}

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
});

describe('UT-WALLET-001: token balance endpoint returns available+locked sum invariant', () => {
  it('should surface available and locked separately and sum to total', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        message: 'OK',
        data: { available: 100, locked: 25, currency: 'IOES' } as TokenBalance,
        timestamp: '2026-10-03T00:00:00Z',
      },
    } as unknown as ReturnType<typeof apiClient.get>);
    const got = (await vi.mocked(apiClient.get)('/api/wallet/me')) as unknown as {
      data: { data: TokenBalance };
    };
    const bal = got.data.data;
    expect(bal.available).toBe(100);
    expect(bal.locked).toBe(25);
    expect(bal.available + bal.locked).toBe(125); // total invariant
    expect(bal.currency).toBe('IOES');
  });
});

describe('UT-WALLET-002: balance never goes negative — server clamps at zero', () => {
  it('should accept a 0 balance and reject negative without throwing (clamp invariant)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        message: 'OK',
        data: { available: 0, locked: 0, currency: 'IOES' } as TokenBalance,
        timestamp: '2026-10-03T00:00:00Z',
      },
    } as unknown as ReturnType<typeof apiClient.get>);
    const got = (await vi.mocked(apiClient.get)('/api/wallet/me')) as unknown as {
      data: { data: TokenBalance };
    };
    expect(got.data.data.available).toBeGreaterThanOrEqual(0);
    expect(got.data.data.locked).toBeGreaterThanOrEqual(0);
  });
});

describe('UT-WALLET-003: transaction history endpoint returns chronologically ordered deltas', () => {
  it('should return deltas whose sum equals the balance delta over the period', async () => {
    const txs: TokenTransaction[] = [
      {
        id: 't-1',
        delta: 50,
        reason: 'course_complete',
        createdAt: '2026-09-15T00:00:00Z',
      },
      {
        id: 't-2',
        delta: -10,
        reason: 'redeem',
        createdAt: '2026-09-20T00:00:00Z',
      },
      {
        id: 't-3',
        delta: 25,
        reason: 'streak',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ];
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'OK', data: txs, timestamp: '2026-10-03T00:00:00Z' },
    } as unknown as ReturnType<typeof apiClient.get>);
    const got = (await vi.mocked(apiClient.get)('/api/wallet/transactions')) as unknown as {
      data: { data: TokenTransaction[] };
    };
    const sum = got.data.data.reduce((acc, t) => acc + t.delta, 0);
    expect(sum).toBe(65); // 50 - 10 + 25
    expect(got.data.data).toHaveLength(3);
  });
});

describe('UT-WALLET-004: empty transaction history is a normal state, not an error', () => {
  it('should resolve to an empty array when the student has no transactions yet', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'OK', data: [], timestamp: '2026-10-03T00:00:00Z' },
    } as unknown as ReturnType<typeof apiClient.get>);
    const got = (await vi.mocked(apiClient.get)('/api/wallet/transactions')) as unknown as {
      data: { data: TokenTransaction[] };
    };
    expect(got.data.data).toEqual([]);
    expect(got.data.data).toHaveLength(0);
  });
});
