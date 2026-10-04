/** Wave 2 - Unit: questions.api.ts (student-owned) */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/api.config', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  unwrap: vi.fn((promise: Promise<{ data: { data: unknown } }>) =>
    promise.then((res) => res.data.data)
  ),
}));

import { questionsApi } from '@/services/api/questions.api';
import { apiClient } from '@/config/api.config';

beforeEach(() => {
  vi.mocked(apiClient.post).mockReset();
});

describe('questionsApi.generate', () => {
  it('UT-PRACTICEQUIZ-001: should POST /api/ai/questions/generate with full body', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {
          questions: [],
          requested: 5,
          returned: 4,
          droppedUnverified: 0,
          grounded: true,
          model: 'm',
          latencyMs: 100,
        },
      },
    });

    await questionsApi.generate({
      topic: 'recursion',
      questionType: 'multiple_choice',
      difficulty: 'medium',
      count: 5,
      language: 'vi',
      instructions: 'cover base cases',
      topK: 8,
    });

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    const [url, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(url).toBe('/api/ai/questions/generate');
    expect(body).toEqual({
      topic: 'recursion',
      questionType: 'multiple_choice',
      difficulty: 'medium',
      count: 5,
      language: 'vi',
      instructions: 'cover base cases',
      topK: 8,
    });
  });

  it('UT-PRACTICEQUIZ-002: should return the GeneratedQuestionSet fields intact', async () => {
    const payload = {
      questions: [
        {
          questionText: 'What?',
          questionType: 'multiple_choice' as const,
          difficulty: 'easy' as const,
          options: [{ optionText: 'A', isCorrect: true }],
          answerText: null,
          explanation: 'because',
          source: { docId: 'd', chunkId: 'c', title: 't', score: 0.9, excerpt: 'e' },
        },
      ],
      requested: 1,
      returned: 1,
      droppedUnverified: 0,
      grounded: true,
      model: 'gemini',
      latencyMs: 50,
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: payload } });

    const result = await questionsApi.generate({ topic: 'any' });

    expect(result).toEqual(payload);
    expect(result.questions).toHaveLength(1);
  });

  it('UT-PRACTICEQUIZ-003: should send grounded=true payload when caller passes it through', async () => {
    // PracticeQuizPage branches on set.grounded === false to show "not grounded".
    // Confirms the API surfaces the field at the boundary.
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {
          questions: [],
          requested: 5,
          returned: 0,
          droppedUnverified: 5,
          grounded: false,
          model: 'm',
          latencyMs: 10,
        },
      },
    });

    const result = await questionsApi.generate({ topic: 'obscure', count: 5 });

    expect(result.grounded).toBe(false);
    expect(result.returned).toBe(0);
    expect(result.droppedUnverified).toBe(5);
  });

  it('UT-PRACTICEQUIZ-004: should count boundary value 20 (per backend cap) without coercion', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {
          questions: [],
          requested: 20,
          returned: 20,
          droppedUnverified: 0,
          grounded: true,
          model: 'm',
          latencyMs: 1,
        },
      },
    });

    await questionsApi.generate({ topic: 't', count: 20 });

    // `mock.calls` is typed `unknown[]` vì `apiClient.post` là hàm generic;
    // thu hẹp về đúng shape của request body trước khi assert.
    const [, body] = vi.mocked(apiClient.post).mock.calls[0] as [string, { count?: number }];
    expect(body.count).toBe(20);
  });

  it('UT-PRACTICEQUIZ-005: should omit undefined optional fields from the request body', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {
          questions: [],
          requested: 1,
          returned: 0,
          droppedUnverified: 1,
          grounded: false,
          model: 'm',
          latencyMs: 1,
        },
      },
    });

    await questionsApi.generate({ topic: 't' });

    const [, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(body).toEqual({ topic: 't' });
    expect(Object.keys(body as object)).toEqual(['topic']);
  });
});
