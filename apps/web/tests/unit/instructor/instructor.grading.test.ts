/** Wave 3C — Unit: /instructor/grading  (src/pages/instructor/GradingPage.tsx) */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get, post } };
});

import { gradeAttempt, getGradingQueue } from '@/services/api/exam.api';

const ok = (data: unknown) => ({
  data: { success: true, message: 'ok', timestamp: '2026-10-04T00:00:00.000Z', data },
});

const gradeBody = (over: Record<string, unknown> = {}) => ({
  score: 8,
  maxScore: 10,
  percentageScore: 80,
  passed: true,
  autoGradedCount: 12,
  manualGradedCount: 0,
  finalGrading: true,
  ...over,
});

const queueItem = (over: Record<string, unknown> = {}) => ({
  attemptId: 'att-1',
  examId: 'exam-1',
  userId: '00000000-0000-0000-0000-0000000000aa',
  submittedAt: '2026-10-03T09:00:00.000Z',
  waitingSeconds: 7200,
  score: null,
  maxScore: null,
  ...over,
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('UT-GRADING: score and percentage derivation', () => {
  it('UT-GRADING-001: should post an empty body to the attempt grade endpoint when auto-grading a submission', async () => {
    post.mockResolvedValue(ok(gradeBody()));

    await expect(gradeAttempt('exam-1', 'att-1')).resolves.toMatchObject({ passed: true });

    expect(post).toHaveBeenCalledWith('/api/exams/exam-1/submissions/att-1/grade', {});
  });

  it('UT-GRADING-002: should normalise the decimal score, max score and percentage columns when the backend returns them as strings', async () => {
    post.mockResolvedValue(
      ok(gradeBody({ score: '7.50', maxScore: '10.00', percentageScore: '75.00' }))
    );

    await expect(gradeAttempt('exam-1', 'att-1')).resolves.toEqual(
      expect.objectContaining({ score: 7.5, maxScore: 10, percentageScore: 75 })
    );
  });

  it('UT-GRADING-003: should fall back to a zero score for every unusable numeric column the grader returns', async () => {
    // null / undefined / '' / 'abc' — the banner prints these straight into
    // "score/max (pct%)", so anything but a finite number must land on 0
    // rather than render "NaN/NaN (NaN%)".
    const unusable = [null, undefined, '', 'abc'] as const;
    const results: number[][] = [];

    for (const value of unusable) {
      post.mockResolvedValue(
        ok(gradeBody({ score: value, maxScore: value, percentageScore: value }))
      );
      const r = await gradeAttempt('exam-1', 'att-1');
      results.push([r.score, r.maxScore, r.percentageScore]);
    }

    expect(results).toEqual([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });

  it('UT-GRADING-004: should format the graded percentage to one decimal place for the success banner', async () => {
    // Exactly the expression GradingPage passes to
    // `examApi.grading.gradeSuccess` as `pct`.
    const percentages = [0, 33.33, 66.666, 87.5, 100];

    const rendered: string[] = [];
    for (const percentageScore of percentages) {
      post.mockResolvedValue(ok(gradeBody({ percentageScore })));
      const r = await gradeAttempt('exam-1', 'att-1');
      rendered.push(r.percentageScore.toFixed(1));
    }

    expect(rendered).toEqual(['0.0', '33.3', '66.7', '87.5', '100.0']);
  });

  it('UT-GRADING-005: should ask the queue endpoint for its default limit of 50 items and normalise their score columns', async () => {
    get.mockResolvedValue(ok([queueItem({ score: '4.00', maxScore: '8.00' })]));

    const rows = await getGradingQueue();

    expect(get).toHaveBeenCalledWith('/api/exams/grading/queue', { params: { limit: 50 } });
    expect(rows[0]).toEqual(expect.objectContaining({ score: 4, maxScore: 8 }));
  });

  it('UT-GRADING-006: should keep a null queue score as null so an ungraded attempt shows the placeholder instead of 0/0', async () => {
    get.mockResolvedValue(ok([queueItem()]));

    const rows = await getGradingQueue();

    expect(rows[0]).toEqual(expect.objectContaining({ score: null, maxScore: null }));
  });
});
