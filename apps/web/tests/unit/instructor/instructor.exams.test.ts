/** Wave 3C — Unit: /instructor/exams  (src/pages/instructor/ExamsPage.tsx) */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get, post: vi.fn() } };
});

import { listExams } from '@/services/api/exam.api';
import type { Exam } from '@/services/api/exam.api';

const ok = (data: unknown) => ({
  data: { success: true, message: 'ok', timestamp: '2026-10-04T00:00:00.000Z', data },
});

const exam = (over: Partial<Exam> = {}): Exam => ({
  id: 'e-1',
  courseId: null,
  instructorId: 'i-1',
  title: 'Kiểm tra giữa kỳ',
  description: null,
  examType: 'graded',
  timeLimitMinutes: 45,
  passingScore: null,
  maxAttempts: 3,
  isRandomized: false,
  showResults: true,
  isProctored: false,
  metadata: {},
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
  version: 1,
  ...over,
});

beforeEach(() => {
  get.mockReset();
});

describe('UT-IEXAMS: instructor exam list mapping', () => {
  it('UT-IEXAMS-001: should coerce the decimal passingScore column to a number when the exam list loads', async () => {
    // pg + TypeORM hand numeric/decimal back as a string ("60.50"). If the
    // client leaves it alone, every later comparison silently mis-evaluates.
    get.mockResolvedValue(ok([exam({ passingScore: '60.50' as unknown as number })]));

    await expect(listExams()).resolves.toEqual([expect.objectContaining({ passingScore: 60.5 })]);
  });

  it('UT-IEXAMS-002: should keep passingScore null when the column is null instead of coercing it to 0', async () => {
    // Number(null) === 0, so a naive coercion would report "đạt 0%" for an
    // exam that simply has no threshold configured.
    get.mockResolvedValue(ok([exam({ passingScore: null })]));

    await expect(listExams()).resolves.toEqual([expect.objectContaining({ passingScore: null })]);
  });
});
