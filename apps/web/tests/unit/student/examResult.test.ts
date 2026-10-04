/** Wave 2B — Unit: exam.api.ts toResultView + listAttempts */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get, post } };
});

import { toResultView, listAttempts, type Exam, type ExamAttempt } from '@/services/api/exam.api';

const ok = <T>(data: T) => ({
  data: { success: true, message: 'ok', timestamp: '2026-08-30T00:00:00.000Z', data },
});

const baseExam = (over: Partial<Exam> = {}): Exam => ({
  id: 'e-1',
  courseId: null,
  instructorId: 'i-1',
  title: 'Bài thi cuối khoá',
  description: null,
  examType: 'graded',
  timeLimitMinutes: 45,
  passingScore: 50,
  maxAttempts: 3,
  isRandomized: false,
  showResults: true,
  isProctored: false,
  metadata: {},
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  deletedAt: null,
  version: 1,
  ...over,
});

const baseAttempt = (over: Partial<ExamAttempt> = {}): ExamAttempt => ({
  id: 'att-1',
  examId: 'e-1',
  userId: 'u-1',
  status: 'graded',
  startedAt: '2026-08-30T09:00:00.000Z',
  submittedAt: '2026-08-30T10:00:00.000Z',
  gradedAt: '2026-08-30T10:05:00.000Z',
  timeRemainingSeconds: null,
  score: 8,
  maxScore: 10,
  percentageScore: 80,
  passed: true,
  questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'],
  metadata: {},
  createdAt: '2026-08-30T09:00:00.000Z',
  updatedAt: '2026-08-30T10:05:00.000Z',
  version: 1,
  ...over,
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

// ---------------------------------------------------------------------------
// toResultView — fields
// ---------------------------------------------------------------------------
describe('toResultView — fields', () => {
  it('UT-EXAMRESULT-001: should_countFromQuestionIds_When_ArrayPresent', () => {
    expect(toResultView(baseAttempt({ questionIds: ['q1', 'q2', 'q3'] })).questionCount).toBe(3);
  });

  it('UT-EXAMRESULT-002: should_returnNull_When_QuestionIdsIsNull', () => {
    expect(toResultView(baseAttempt({ questionIds: null })).questionCount).toBeNull();
  });

  it('UT-EXAMRESULT-003: should_useExamTitle_When_ExamProvided', () => {
    expect(toResultView(baseAttempt(), baseExam({ title: 'Custom' })).examTitle).toBe('Custom');
  });

  it('UT-EXAMRESULT-004: should_returnNullExamTitle_When_ExamOmitted', () => {
    expect(toResultView(baseAttempt(), undefined).examTitle).toBeNull();
  });

  it('UT-EXAMRESULT-005: should_useExamTimeLimit_When_ExamProvided', () => {
    expect(toResultView(baseAttempt(), baseExam({ timeLimitMinutes: 90 })).timeLimitMinutes).toBe(
      90
    );
  });

  it('UT-EXAMRESULT-006: should_returnNull_When_ExamTimeLimitIsNull', () => {
    expect(
      toResultView(baseAttempt(), baseExam({ timeLimitMinutes: null })).timeLimitMinutes
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listAttempts — HTTP + normalization
// ---------------------------------------------------------------------------
describe('listAttempts', () => {
  it('UT-EXAMRESULT-007: should_callAttemptsEndpoint_AndNormalizeDecimalStrings', () => {
    get.mockResolvedValue(
      ok([
        {
          ...baseAttempt({ id: 'a1' }),
          score: '8.00',
          maxScore: '10.00',
          percentageScore: '80.00',
        },
      ])
    );
    void listAttempts();
    expect(get).toHaveBeenCalledWith('/api/attempts');
    return listAttempts().then((rows) => {
      expect(rows[0]?.score).toBe(8);
      expect(rows[0]?.maxScore).toBe(10);
      expect(rows[0]?.percentageScore).toBe(80);
    });
  });
});

// ---------------------------------------------------------------------------
// Newest-for-this-exam selection (logic equivalent in page)
// ---------------------------------------------------------------------------
// Page sort: pick the attempt with the largest submittedAt among those whose
// examId matches the URL param. Re-implement locally as a pure helper.
function pickNewestForExam(
  rows: { examId: string; submittedAt: string | null }[],
  examId: string
): { examId: string; submittedAt: string | null } | undefined {
  const filtered = rows.filter((r) => r.examId === examId);
  if (filtered.length === 0) return undefined;
  return [...filtered].sort((a, b) => {
    const at = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bt = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return bt - at;
  })[0];
}

describe('pickNewestForExam', () => {
  it('UT-EXAMRESULT-008: should_pickLargestSubmittedAt_When_ExamHasMultipleAttempts', () => {
    const r = pickNewestForExam(
      [
        { examId: 'e-1', submittedAt: '2026-08-01T10:00:00.000Z' },
        { examId: 'e-1', submittedAt: '2026-08-05T10:00:00.000Z' },
        { examId: 'e-1', submittedAt: '2026-08-03T10:00:00.000Z' },
        { examId: 'e-2', submittedAt: '2026-08-10T10:00:00.000Z' },
      ],
      'e-1'
    );
    expect(r?.submittedAt).toBe('2026-08-05T10:00:00.000Z');
  });
});
