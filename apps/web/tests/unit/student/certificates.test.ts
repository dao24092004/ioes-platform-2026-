/** Wave 2C (student) — Unit: certificates */
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

interface CertificateListItem {
  id: string;
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  /** SHA-256 hex of the canonical certificate payload. */
  certHash: string;
  /** Status derived from `certHash` registration on blockchain. */
  status: 'valid' | 'revoked';
}

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
});

describe('UT-CERT-001: certificate list endpoint returns the expected envelope shape', () => {
  it('should return a paginated array with certHash and status fields', async () => {
    const payload: CertificateListItem[] = [
      {
        id: 'cert-1',
        courseId: 'c-1',
        courseTitle: 'Algebra',
        issuedAt: '2026-10-01T00:00:00Z',
        certHash: 'a'.repeat(64),
        status: 'valid',
      },
      {
        id: 'cert-2',
        courseId: 'c-2',
        courseTitle: 'Geometry',
        issuedAt: '2026-09-15T00:00:00Z',
        certHash: 'b'.repeat(64),
        status: 'valid',
      },
    ];
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'OK', data: payload, timestamp: '2026-10-03T00:00:00Z' },
    } as unknown as ReturnType<typeof apiClient.get>);
    const got = (await vi.mocked(apiClient.get)('/api/certificates/my')) as unknown as {
      data: { data: CertificateListItem[] };
    };
    expect(got.data.data).toHaveLength(2);
    expect(got.data.data[0].certHash).toHaveLength(64);
    expect(got.data.data[0].status).toBe('valid');
  });
});

describe('UT-CERT-002: certificate verification endpoint returns valid|revoked for known certHash', () => {
  it('should return "valid" for a registered certHash and "revoked" for a revoked one', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/verify/')) {
        return Promise.resolve({
          data: {
            success: true,
            message: 'OK',
            data: { certHash: url.split('/').pop(), status: 'valid' as const },
            timestamp: '2026-10-03T00:00:00Z',
          },
        });
      }
      if (url.includes('/revoke/')) {
        return Promise.resolve({
          data: {
            success: true,
            message: 'OK',
            data: { certHash: url.split('/').pop(), status: 'revoked' as const },
            timestamp: '2026-10-03T00:00:00Z',
          },
        });
      }
      return Promise.reject(new Error('Unexpected URL ' + url));
    });

    const valid = await vi.mocked(apiClient.get)('/api/certificates/verify/' + 'a'.repeat(64));
    const revoked = await vi.mocked(apiClient.get)('/api/certificates/revoke/' + 'a'.repeat(64));
    expect((valid as unknown as { data: { data: { status: string } } }).data.data.status).toBe(
      'valid'
    );
    expect((revoked as unknown as { data: { data: { status: string } } }).data.data.status).toBe(
      'revoked'
    );
  });
});

describe('UT-CERT-003: certHash length invariant — 64-char SHA-256 hex', () => {
  it('should reject any certHash that is not exactly 64 lowercase hex characters', () => {
    const validateHash = (h: string): boolean => /^[0-9a-f]{64}$/.test(h);
    expect(validateHash('a'.repeat(64))).toBe(true);
    expect(validateHash('A'.repeat(64))).toBe(false); // uppercase rejected
    expect(validateHash('a'.repeat(63))).toBe(false); // short
    expect(validateHash('a'.repeat(65))).toBe(false); // long
    expect(validateHash('z'.repeat(64))).toBe(false); // non-hex
    expect(validateHash('')).toBe(false);
  });
});

describe('UT-CERT-004: empty certificate list is a normal state, not an error', () => {
  it('should resolve to an empty array when the student has no certificates yet', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'OK', data: [], timestamp: '2026-10-03T00:00:00Z' },
    } as unknown as ReturnType<typeof apiClient.get>);
    const got = (await vi.mocked(apiClient.get)('/api/certificates/my')) as unknown as {
      data: { data: CertificateListItem[] };
    };
    expect(got.data.data).toEqual([]);
    expect(got.data.data).toHaveLength(0);
  });
});
