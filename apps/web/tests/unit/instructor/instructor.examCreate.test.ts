/** Wave 3C — Unit: /instructor/exams/create */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get, post } };
});

import { examApi, cancelAttempt, submitExam } from '@/services/api/exam.api';

const ok = (data: unknown) => ({
  data: { success: true, message: 'ok', timestamp: '2026-10-04T00:00:00.000Z', data },
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('UT-IEXAMCREATE: the missing exam-write API', () => {
  it('UT-IEXAMCREATE-001: should expose no exam create, update or delete function on the exam API client', () => {
    const writeLike = Object.keys(examApi).filter((name) => /create|update|delete/i.test(name));

    expect(writeLike).toEqual([]);
  });

  it('UT-IEXAMCREATE-002: should never POST to the collection path when every exam write function runs', async () => {
    get.mockResolvedValue(ok([]));
    post.mockResolvedValue(ok({ attempt: { id: 'att-1' }, totalQuestions: 0 }));

    await examApi.startExam('e-1');
    await cancelAttempt('att-1');
    await submitExam('e-1', [{ questionId: 'q1', selectedOptionIds: ['o-1'] }]);
    await examApi.gradeAttempt('e-1', 'att-1');

    // Everything exam-suite can write is a sub-resource of an existing exam or
    // attempt. A POST to `/api/exams` would mean the backend grew the endpoint
    // the ComingSoon copy claims is missing.
    const collectionPosts = post.mock.calls.filter((call) => call[0] === '/api/exams');
    expect(collectionPosts).toEqual([]);
  });
});
