/** Wave 2B — Unit: exam.api.ts helpers + list/get normalizers */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get, post } };
});

import { listExams, toStudentExamView, type Exam, type ExamAttempt } from '@/services/api/exam.api';

const ok = <T>(data: T) => ({
  data: { success: true, message: 'ok', timestamp: '2026-08-30T00:00:00.000Z', data },
});

const baseExam: Exam = {
  id: 'e1',
  courseId: null,
  instructorId: 'i1',
  title: 'Luyện tập CSS',
  description: null,
  examType: 'practice',
  timeLimitMinutes: 30,
  passingScore: 60,
  maxAttempts: 5,
  isRandomized: false,
  showResults: true,
  isProctored: false,
  metadata: {},
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  deletedAt: null,
  version: 1,
};

const a = (over: Partial<ExamAttempt>): ExamAttempt => ({
  id: 'a1',
  examId: 'e1',
  userId: 'u1',
  status: 'graded',
  startedAt: null,
  submittedAt: '2026-08-02T00:00:00.000Z',
  gradedAt: null,
  timeRemainingSeconds: null,
  score: 2,
  maxScore: 3,
  percentageScore: 66.67,
  passed: true,
  questionIds: ['q1', 'q2', 'q3'],
  metadata: {},
  createdAt: '2026-08-02T00:00:00.000Z',
  updatedAt: '2026-08-02T00:00:00.000Z',
  version: 1,
  ...over,
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

// ---------------------------------------------------------------------------
// toStudentExamView — status derivation
// ---------------------------------------------------------------------------
describe('toStudentExamView — status', () => {
  it('UT-EXAMS-001: should_returnAvailable_When_NoAttempts', () => {
    const v = toStudentExamView(baseExam, []);
    expect(v.status).toBe('available');
    expect(v.attempts).toBe(0);
    expect(v.bestScore).toBeNull();
  });

  it('UT-EXAMS-002: should_returnInProgress_When_AttemptInProgressExists', () => {
    const v = toStudentExamView(baseExam, [
      a({ id: 'a1', status: 'graded', percentageScore: 50 }),
      a({ id: 'a2', status: 'in_progress', percentageScore: null }),
    ]);
    expect(v.status).toBe('in_progress');
  });

  it('UT-EXAMS-003: should_returnCompleted_When_AttemptSubmittedOrGradedExists', () => {
    const v = toStudentExamView(baseExam, [
      a({ id: 'a1', status: 'submitted', percentageScore: 80 }),
    ]);
    expect(v.status).toBe('completed');
  });

  it('UT-EXAMS-004: should_returnAvailable_When_OnlyCancelledOrExpiredAttemptsExist', () => {
    // `cancelled` và `expired` không tính là đã hoàn thành — nếu không thì
    // huỷ một lượt sẽ khoá exam ở "completed" vĩnh viễn (xem ghi chú trong
    // `toStudentExamView` của exam.api.ts).
    const v = toStudentExamView(baseExam, [
      a({ id: 'a1', status: 'cancelled', percentageScore: null }),
      a({ id: 'a2', status: 'expired', percentageScore: null }),
    ]);
    expect(v.status).toBe('available');
    expect(v.attempts).toBe(0);
    expect(v.bestScore).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// toStudentExamView — bestScore + attempts counting
// ---------------------------------------------------------------------------
describe('toStudentExamView — bestScore & attempts', () => {
  it('UT-EXAMS-005: should_returnMaxPercentageScore_AcrossSameExamAttempts', () => {
    const v = toStudentExamView(baseExam, [
      a({ id: 'a1', percentageScore: 50 }),
      a({ id: 'a2', percentageScore: 80 }),
      a({ id: 'a3', percentageScore: 70 }),
    ]);
    expect(v.bestScore).toBe(80);
  });

  it('UT-EXAMS-006: should_IgnoreAttempts_For_DifferentExams_When_BestAndCount', () => {
    const v = toStudentExamView(baseExam, [
      a({ id: 'a1', examId: 'e1', percentageScore: 60 }),
      a({ id: 'a2', examId: 'e2', percentageScore: 99 }),
    ]);
    expect(v.bestScore).toBe(60);
    expect(v.attempts).toBe(1);
  });

  it('UT-EXAMS-007: should_countOnlySubmittedOrGraded_When_TallyingAttempts', () => {
    const v = toStudentExamView(baseExam, [
      a({ id: 'a1', status: 'cancelled' }),
      a({ id: 'a2', status: 'expired' }),
      a({ id: 'a3', status: 'submitted', percentageScore: 70 }),
      a({ id: 'a4', status: 'graded', percentageScore: 90 }),
      a({ id: 'a5', status: 'in_progress' }),
    ]);
    expect(v.attempts).toBe(2);
    expect(v.bestScore).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// listExams — HTTP path + normalization
// ---------------------------------------------------------------------------
describe('listExams', () => {
  it('UT-EXAMS-008: should_callExamsListEndpoint_AndCoerceDecimalStringPassingScore', () => {
    // pg TypeORM giữ numeric/decimal dưới dạng chuỗi — listExams phải ép về số.
    get.mockResolvedValue(
      ok([
        { ...baseExam, id: 'e1', passingScore: '60.50' },
        { ...baseExam, id: 'e2', passingScore: null },
      ])
    );
    void listExams();
    expect(get).toHaveBeenCalledWith('/api/exams');
    return listExams().then((rows) => {
      expect(rows[0]?.passingScore).toBe(60.5);
      expect(rows[1]?.passingScore).toBeNull();
    });
  });
});
