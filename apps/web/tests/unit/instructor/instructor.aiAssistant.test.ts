/** Wave 3D — Unit: chat transport contract for /instructor/ai-assistant. */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>('@/config/api.config');
  return { ...actual, apiClient: { get, post, patch: vi.fn(), delete: vi.fn() } };
});

import { aiApi } from '@/services/api/ai.api';
import { ApiError } from '@/config/api.config';

const TS = '2026-10-04T00:00:00.000Z';

const ok = <T>(data: T) => ({ data: { success: true, message: 'ok', timestamp: TS, data } });

const turn = {
  sessionId: 's-1',
  messageId: 'm-1',
  answer: 'ok',
  grounded: true,
  sources: [],
  model: 'gemini',
  latencyMs: 12,
};

const rejection = async (promise: Promise<unknown>): Promise<ApiError> => {
  try {
    await promise;
  } catch (err) {
    return err as ApiError;
  }
  throw new Error('expected the promise to reject, but it resolved');
};

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('aiApi.listSessions — thread derivation input', () => {
  it('UT-IAIASSIST-001: should keep a null title and a null lastMessageAt so the page can apply its own fallback', async () => {
    const sessions = [
      {
        id: 's-1',
        userId: 'u-1',
        title: null,
        status: 'active',
        messageCount: 0,
        lastMessageAt: null,
        metadata: {},
        createdAt: TS,
        updatedAt: TS,
      },
    ];
    get.mockResolvedValue(ok(sessions));

    const result = await aiApi.listSessions();

    // `sessionToThread` in AIAssistantPage.tsx reads `session.title ??
    // fallbackTitle` and `session.lastMessageAt ?? session.updatedAt`, so a
    // null must not be replaced with '' or 0 on the way through unwrap.
    expect(result).toHaveLength(1);
    expect(result[0].title).toBeNull();
    expect(result[0].lastMessageAt).toBeNull();
    expect(result[0].updatedAt).toBe(TS);
  });

  it('UT-IAIASSIST-002: should return an empty array unchanged when the instructor has no chat session yet', async () => {
    get.mockResolvedValue(ok([]));

    const result = await aiApi.listSessions();

    // The page appends its own draft thread to this list; an empty array must
    // not be turned into null/undefined or a paged wrapper.
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

describe('aiApi.getHistory — message/role derivation input', () => {
  it('UT-IAIASSIST-003: should return one entry per message with role, content and createdAt copied 1:1', async () => {
    const history = [
      {
        id: 'm-1',
        sessionId: 's-1',
        role: 'user' as const,
        content: 'Soạn giáo án cho bài mảng',
        sources: [],
        model: null,
        promptTokens: 12,
        completionTokens: null,
        createdAt: '2026-10-01T08:00:00.000Z',
      },
      {
        id: 'm-2',
        sessionId: 's-1',
        role: 'assistant' as const,
        content: 'Dưới đây là giáo án...',
        sources: [{ docId: 'd1', chunkId: 'c1', title: 'Mảng', score: 0.82 }],
        model: 'gemini',
        promptTokens: 12,
        completionTokens: 340,
        createdAt: '2026-10-01T08:00:02.000Z',
      },
    ];
    get.mockResolvedValue(ok(history));

    const result = await aiApi.getHistory('s-1');

    expect(result.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(result[0].content).toBe('Soạn giáo án cho bài mảng');
    expect(result[0].createdAt).toBe('2026-10-01T08:00:00.000Z');
    expect(result[1].sources[0].docId).toBe('d1');
  });

  it('UT-IAIASSIST-004: should reject with ApiError carrying the backend message when a session history cannot be read', async () => {
    get.mockResolvedValue({
      data: { success: false, message: 'Phiên hội thoại không tồn tại', timestamp: TS },
    });

    const err = await rejection(aiApi.getHistory('s-gone'));

    // AIAssistantPage catches this and keeps the thread marked as loaded so it
    // does not retry forever; it prints `err.message` in the red banner.
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Phiên hội thoại không tồn tại');
  });
});

describe('aiApi.ask — prompt boundary', () => {
  it('UT-IAIASSIST-005: should forward the question verbatim with no trimming and no escaping at the API boundary', async () => {
    post.mockResolvedValue(ok(turn));
    const longQuestion = `  ${'a'.repeat(4000)}  `;
    const injection = `'; DROP TABLE ai_chat_message; -- <img src=x onerror=alert(1)>`;

    await aiApi.ask({ question: longQuestion });
    await aiApi.ask({ question: injection, sessionId: 's-1' });

    const [firstUrl, firstBody] = post.mock.calls[0]!;
    expect(firstUrl).toBe('/api/ai/chat');
    // The page trims before calling; the transport must not trim again, and it
    // must not escape either (the UI renders the text as a React child).
    expect((firstBody as { question: string }).question).toBe(longQuestion);
    expect((firstBody as { question: string }).question).toHaveLength(4004);
    expect((post.mock.calls[1]![1] as { question: string }).question).toBe(injection);
  });

  it('UT-IAIASSIST-006: should post a whitespace-only question instead of rejecting it, keeping the empty-input guard in the page', async () => {
    post.mockResolvedValue(ok(turn));

    const result = await aiApi.ask({ question: '   ' });

    // AIAssistantPage.send() is the only guard (`if (!content || thinking)
    // return`). The transport is a thin pass-through, so the guard must not
    // be duplicated here or the page could never tell a blocked send apart
    // from a lost one.
    expect((post.mock.calls[0]![1] as { question: string }).question).toBe('   ');
    expect(result.messageId).toBe('m-1');
  });
});
