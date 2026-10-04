/** Wave 3C — Unit: /instructor/question-bank */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get, post, patch, del } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get, post, patch, delete: del } };
});

import { questionBankApi } from '@/services/api/question-bank.api';
import { ApiError } from '@/config/api.config';
import type { Difficulty, SearchParams } from '@/types/question-bank';

const ok = (data: unknown) => ({
  data: { success: true, message: 'ok', timestamp: '2026-10-04T00:00:00.000Z', data },
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
  del.mockReset();
});

describe('UT-QBANK: question-bank filter and mutation mapping', () => {
  it('UT-QBANK-001: should forward every search filter as query params, including pagination and skill ids', async () => {
    const params: SearchParams = {
      query: 'algorithm',
      topicId: 'topic-1',
      difficulty: 'hard',
      questionType: 'multiple_choice',
      skillIds: ['s-1', 's-2'],
      limit: 20,
      offset: 40,
    };
    get.mockResolvedValue(ok({ questions: [], total: 0, hasMore: false }));

    await questionBankApi.searchQuestions(params);

    expect(get).toHaveBeenCalledWith('/api/v1/question-bank/questions/search', { params });
  });

  it('UT-QBANK-002: should strip the uid out of the PATCH body so the update endpoint only receives changed fields', async () => {
    patch.mockResolvedValue(ok({ uid: 'q-1' }));

    await questionBankApi.updateQuestion({ uid: 'q-1', questionText: 'Bản cập nhật', points: 10 });

    expect(patch).toHaveBeenCalledWith('/api/v1/question-bank/questions/q-1', {
      questionText: 'Bản cập nhật',
      points: 10,
    });
  });

  it('UT-QBANK-003: should soft-delete through the question URL and resolve the envelope payload', async () => {
    del.mockResolvedValue({ data: { success: true, message: 'ok', timestamp: 't', data: null } });

    // `deleteQuestion` is declared `Promise<void>` but goes through `unwrap`,
    // so it actually resolves to the envelope payload — Jackson still sends
    // `data: null` for void endpoints. QuestionBankPage drops the row locally
    // and ignores the value, so the contract that matters is the URL plus a
    // resolved (not rejected) promise.
    await expect(questionBankApi.deleteQuestion('q-1')).resolves.toBeNull();

    expect(del).toHaveBeenCalledWith('/api/v1/question-bank/questions/q-1');
  });

  it('UT-QBANK-004: should map a failed search to an ApiError carrying the backend message', async () => {
    get.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 400'), {
        response: {
          status: 400,
          data: { success: false, message: 'Không tìm thấy chủ đề', traceId: 'tr-400' },
        },
        isAxiosError: true,
      })
    );

    const err = await questionBankApi.searchQuestions({ query: 'x' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe('Không tìm thấy chủ đề');
    expect((err as ApiError).status).toBe(400);
  });
});

describe('UT-QBANK: difficulty filter values', () => {
  it('UT-QBANK-005: should pass each of the five domain difficulty levels through to the search params unchanged', async () => {
    const levels: Difficulty[] = ['very_easy', 'easy', 'medium', 'hard', 'very_hard'];
    const sent: unknown[] = [];

    for (const difficulty of levels) {
      get.mockResolvedValue(ok({ questions: [], total: 0, hasMore: false }));
      await questionBankApi.searchQuestions({ difficulty });
      sent.push(vi.mocked(get).mock.calls.at(-1)?.[1]);
    }

    // QuestionCard maps each level to its own colour and label, so a value
    // that arrived renamed or dropped would render an undefined badge.
    expect(sent).toEqual(levels.map((difficulty) => ({ params: { difficulty } })));
  });
});
