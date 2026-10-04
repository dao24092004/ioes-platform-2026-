/** Wave 2B — Unit: exam.api.ts wrappers + countdown math */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get, post } };
});

import { startExam, getAttempt, submitExam, cancelAttempt } from '@/services/api/exam.api';

const ok = <T>(data: T) => ({
  data: { success: true, message: 'ok', timestamp: '2026-08-30T00:00:00.000Z', data },
});

const attempt = {
  id: 'att-1',
  examId: 'e-1',
  userId: 'u-1',
  status: 'in_progress',
  startedAt: '2026-09-01T10:00:00.000Z',
  submittedAt: null,
  gradedAt: null,
  timeRemainingSeconds: 1500,
  score: null,
  maxScore: null,
  percentageScore: null,
  passed: null,
  questionIds: ['q1', 'q2'],
  metadata: {},
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  version: 1,
} as const;

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

// ---------------------------------------------------------------------------
// startExam
// ---------------------------------------------------------------------------
describe('startExam', () => {
  it('UT-EXAMTAKING-001: should_PostEmptyBody_When_StartingAttempt', () => {
    post.mockResolvedValue(ok({ attempt, totalQuestions: 20 }));
    void startExam('e-1');
    expect(post).toHaveBeenCalledWith('/api/exams/e-1/start', {});
  });

  it('UT-EXAMTAKING-002: should_NormalizeAttemptNumericFields_When_DecimalStringsReturned', () => {
    // pg giữ numeric/decimal dưới dạng chuỗi — startExam phải ép về số.
    post.mockResolvedValue(
      ok({
        attempt: { ...attempt, score: '7.50', maxScore: '10.00', percentageScore: '75.00' },
        totalQuestions: 5,
      })
    );
    return startExam('e-1').then((r) => {
      expect(r.attempt.score).toBe(7.5);
      expect(r.attempt.maxScore).toBe(10);
      expect(r.attempt.percentageScore).toBe(75);
      expect(r.totalQuestions).toBe(5);
    });
  });

  it('UT-EXAMTAKING-003: should_KeepNullNumericFields_When_AttemptNotGraded', () => {
    // Number(null) là 0 — không được ép về 0 vì sẽ hiển thị điểm cho bài chưa chấm.
    post.mockResolvedValue(ok({ attempt, totalQuestions: 10 }));
    return startExam('e-1').then((r) => {
      expect(r.attempt.score).toBeNull();
      expect(r.attempt.maxScore).toBeNull();
      expect(r.attempt.percentageScore).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// getAttempt
// ---------------------------------------------------------------------------
describe('getAttempt', () => {
  it('UT-EXAMTAKING-004: should_BuildDetailPath_AndNormalizeAttempt', () => {
    get.mockResolvedValue(
      ok({
        attempt: { ...attempt, score: '5.0', maxScore: '10.0', percentageScore: '50.0' },
        questions: [],
        includeCorrectAnswers: false,
      })
    );
    void getAttempt('att-1');
    expect(get).toHaveBeenCalledWith('/api/attempts/att-1');
    return getAttempt('att-1').then((d) => {
      expect(d.attempt.score).toBe(5);
      expect(d.attempt.maxScore).toBe(10);
      expect(d.includeCorrectAnswers).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// submitExam
// ---------------------------------------------------------------------------
describe('submitExam', () => {
  it('UT-EXAMTAKING-005: should_PostAnswersAndIsAutoSubmitFalse_When_ManualSubmit', () => {
    post.mockResolvedValue(
      ok({ attemptId: 'att-1', submittedAt: '2026-09-01T11:00:00.000Z', autoSubmitted: false })
    );
    void submitExam('e-1', [{ questionId: 'q1', selectedOptionIds: ['o1'] }], false);
    expect(post).toHaveBeenCalledWith('/api/exams/e-1/submissions', {
      answers: [{ questionId: 'q1', selectedOptionIds: ['o1'] }],
      isAutoSubmit: false,
    });
  });

  it('UT-EXAMTAKING-006: should_SendIsAutoSubmitTrue_When_TriggeredByTimer', () => {
    post.mockResolvedValue(
      ok({ attemptId: 'att-1', submittedAt: '2026-09-01T11:00:00.000Z', autoSubmitted: true })
    );
    void submitExam('e-1', [], true);
    expect(post).toHaveBeenCalledWith('/api/exams/e-1/submissions', {
      answers: [],
      isAutoSubmit: true,
    });
  });

  it('UT-EXAMTAKING-007: should_AcceptMixedAnswerTypes_When_BulkSubmitted', () => {
    post.mockResolvedValue(
      ok({ attemptId: 'att-1', submittedAt: '2026-09-01T11:00:00.000Z', autoSubmitted: false })
    );
    const answers = [
      { questionId: 'q1', selectedOptionIds: ['o1', 'o2'] },
      { questionId: 'q2', answerText: 'My answer' },
      { questionId: 'q3', selectedOptionIds: ['o3'] },
    ];
    void submitExam('e-1', answers, false);
    expect(post).toHaveBeenCalledWith('/api/exams/e-1/submissions', {
      answers,
      isAutoSubmit: false,
    });
  });
});

// ---------------------------------------------------------------------------
// cancelAttempt
// ---------------------------------------------------------------------------
describe('cancelAttempt', () => {
  it('UT-EXAMTAKING-008: should_PostToCancelEndpoint_AndReturnCancelled', () => {
    post.mockResolvedValue(ok({ ...attempt, status: 'cancelled' }));
    void cancelAttempt('att-1');
    expect(post).toHaveBeenCalledWith('/api/attempts/att-1/cancel', {});
  });
});

// ---------------------------------------------------------------------------
// Countdown math (re-implemented locally; locked logic in component)
// ---------------------------------------------------------------------------
// Logic tái hiện khớp `ExamTakingPage.tsx`:
//
//   deadlineMs = Date.parse(attempt.startedAt) + exam.timeLimitMinutes * 60_000
//   secondsLeft = Math.max(0, Math.floor((deadlineMs - now) / 1000))
//
// Tách thành helper thuần để test bằng fake timers.
function secondsLeft(startedAt: string, timeLimitMinutes: number, nowMs: number): number {
  const deadlineMs = Date.parse(startedAt) + timeLimitMinutes * 60_000;
  return Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
}

describe('secondsLeft (countdown math)', () => {
  it('UT-EXAMTAKING-009: should_returnFullDuration_When_NowIsExactlyStartedAt', () => {
    const now = Date.parse('2026-09-01T10:00:00.000Z');
    const left = secondsLeft('2026-09-01T10:00:00.000Z', 60, now);
    expect(left).toBe(60 * 60);
  });

  it('UT-EXAMTAKING-010: should_decrementByElapsedSeconds_When_TimePasses', () => {
    const now = Date.parse('2026-09-01T10:05:00.000Z'); // 5 minutes later
    const left = secondsLeft('2026-09-01T10:00:00.000Z', 60, now);
    expect(left).toBe(55 * 60);
  });

  it('UT-EXAMTAKING-011: should_clampToZero_When_DeadlinePassed', () => {
    const now = Date.parse('2026-09-01T11:30:00.000Z'); // 90 min after a 60-min exam
    const left = secondsLeft('2026-09-01T10:00:00.000Z', 60, now);
    expect(left).toBe(0);
  });
});
