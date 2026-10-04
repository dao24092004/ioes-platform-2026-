/** Wave 3C — Unit: /instructor/ai-question  (src/pages/instructor/AIQuestionPage.tsx) */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { post: vi.fn() } };
});

import { apiClient, ApiError } from '@/config/api.config';
import { questionsApi } from '@/services/api/questions.api';

const post = apiClient.post as unknown as ReturnType<typeof vi.fn>;

const ok = (data: unknown) => ({
  data: { success: true, message: 'ok', timestamp: '2026-10-04T00:00:00.000Z', data },
});

const emptySet = {
  questions: [],
  requested: 0,
  returned: 0,
  droppedUnverified: 0,
  grounded: false,
  model: 'gemini-3.5-flash-lite',
  latencyMs: 0,
};

beforeEach(() => {
  post.mockReset();
});

describe('UT-AIQUESTION: generate request and error mapping', () => {
  it('UT-AIQUESTION-001: should send every generation parameter unchanged, including topK and the trimmed instructions', async () => {
    post.mockResolvedValue(ok(emptySet));

    const params = {
      topic: 'Box model',
      questionType: 'multiple_select' as const,
      difficulty: 'hard' as const,
      count: 12,
      language: 'en' as const,
      instructions: 'Tập trung vào phần padding',
      topK: 8,
    };
    await questionsApi.generate(params);

    // The page relies on the API layer being a pass-through: any renaming or
    // default injected here would silently change what the model is asked.
    expect(post).toHaveBeenCalledWith('/api/ai/questions/generate', params);
  });

  it('UT-AIQUESTION-002: should map a 429 rate-limit response to an ApiError carrying the status and the trace id', async () => {
    // ai-gateway caps 5 generations per minute; the page shows the message
    // verbatim in its alert box.
    post.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 429'), {
        response: {
          status: 429,
          data: { success: false, message: 'Quá số lượt cho phép', traceId: 'tr-429' },
        },
        isAxiosError: true,
      })
    );

    const err = await questionsApi.generate({ topic: 'Box model' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe('Quá số lượt cho phép');
    expect((err as ApiError).status).toBe(429);
    expect((err as ApiError).traceId).toBe('tr-429');
  });

  it('UT-AIQUESTION-003: should map an aborted request to the timeout ApiError when axios reports ECONNABORTED', async () => {
    // Generation runs on an LLM, so it is the one call on this page that can
    // outrun the client timeout; the message must be the Vietnamese one the
    // user is meant to read, not the raw axios text.
    post.mockRejectedValue(
      Object.assign(new Error('timeout of 120000ms exceeded'), {
        code: 'ECONNABORTED',
        isAxiosError: true,
      })
    );

    const err = await questionsApi.generate({ topic: 'Box model' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe('Yêu cầu quá thời gian chờ');
  });
});
