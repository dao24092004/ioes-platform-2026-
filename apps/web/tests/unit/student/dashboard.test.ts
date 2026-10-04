/** Wave 2A — Unit: DashboardPage (student) helpers. */
import { describe, it, expect } from 'vitest';
import { toStudentExamView } from '@/services/api/exam.api';
import type { Exam, ExamAttempt } from '@/services/api/exam.api';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeExam = (overrides: Partial<Exam> = {}): Exam => ({
  id: 'e-1',
  courseId: 'c-1',
  instructorId: 'i-1',
  title: 'Sample Exam',
  description: null,
  examType: 'practice',
  timeLimitMinutes: 30,
  passingScore: 70,
  maxAttempts: 3,
  isRandomized: false,
  showResults: true,
  isProctored: false,
  metadata: {},
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  deletedAt: null,
  version: 1,
  ...overrides,
});

const makeAttempt = (overrides: Partial<ExamAttempt> = {}): ExamAttempt => ({
  id: 'att-1',
  examId: 'e-1',
  userId: 'u-1',
  status: 'in_progress',
  startedAt: '2024-01-01T00:00:00Z',
  submittedAt: null,
  gradedAt: null,
  timeRemainingSeconds: 1800,
  score: null,
  maxScore: null,
  percentageScore: null,
  passed: null,
  questionIds: null,
  metadata: {},
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  version: 1,
  ...overrides,
});

// ---------------------------------------------------------------------------
// toStudentExamView — status derivation (this is what DashboardPage consumes)
// ---------------------------------------------------------------------------
describe('toStudentExamView — status derivation', () => {
  it('UT-DASH-001: should return "available" when there are no attempts for the exam', () => {
    const exam = makeExam();
    const view = toStudentExamView(exam, []);
    expect(view.id).toBe(exam.id);
    expect(view.title).toBe(exam.title);
    expect(view.status).toBe('available');
    expect(view.attempts).toBe(0);
    expect(view.bestScore).toBeNull();
  });

  it('UT-DASH-002: should return "in_progress" when at least one attempt is in_progress, even if others are completed', () => {
    const exam = makeExam();
    const attempts = [
      makeAttempt({ id: 'a-1', status: 'graded', percentageScore: 90 }),
      makeAttempt({ id: 'a-2', status: 'in_progress', percentageScore: null }),
    ];
    const view = toStudentExamView(exam, attempts);
    expect(view.status).toBe('in_progress');
    // attempts count reflects only completed (graded/submitted) attempts.
    expect(view.attempts).toBe(1);
    expect(view.bestScore).toBe(90);
  });

  it('UT-DASH-003: should return "completed" when only submitted/graded attempts exist (no in_progress)', () => {
    const exam = makeExam();
    const attempts = [
      makeAttempt({ id: 'a-1', status: 'submitted', percentageScore: 75 }),
      makeAttempt({ id: 'a-2', status: 'graded', percentageScore: 88 }),
    ];
    const view = toStudentExamView(exam, attempts);
    expect(view.status).toBe('completed');
    expect(view.attempts).toBe(2);
    expect(view.bestScore).toBe(88);
  });

  it('UT-DASH-004: should ignore attempts belonging to OTHER exams when computing the view', () => {
    const exam = makeExam({ id: 'e-target' });
    const attempts = [
      makeAttempt({ id: 'a-1', examId: 'e-other', status: 'in_progress' }),
      makeAttempt({ id: 'a-2', examId: 'e-target', status: 'graded', percentageScore: 80 }),
    ];
    const view = toStudentExamView(exam, attempts);
    // Only the e-target attempt is considered → completed with 80.
    expect(view.status).toBe('completed');
    expect(view.attempts).toBe(1);
    expect(view.bestScore).toBe(80);
  });

  it('UT-DASH-005: should NOT count cancelled or expired attempts as completed (status stays available)', () => {
    const exam = makeExam();
    const attempts = [
      makeAttempt({ id: 'a-1', status: 'cancelled', percentageScore: 50 }),
      makeAttempt({ id: 'a-2', status: 'expired', percentageScore: 60 }),
    ];
    const view = toStudentExamView(exam, attempts);
    expect(view.status).toBe('available');
    expect(view.attempts).toBe(0);
    // Best score is null because no completed attempt contributed a percentage.
    expect(view.bestScore).toBeNull();
  });

  it('UT-DASH-006: should pick the max percentage across completed attempts (bestScore)', () => {
    const exam = makeExam();
    const attempts = [
      makeAttempt({ id: 'a-1', status: 'graded', percentageScore: 60 }),
      makeAttempt({ id: 'a-2', status: 'graded', percentageScore: 100 }),
      makeAttempt({ id: 'a-3', status: 'submitted', percentageScore: 80 }),
    ];
    const view = toStudentExamView(exam, attempts);
    expect(view.bestScore).toBe(100);
  });
});
