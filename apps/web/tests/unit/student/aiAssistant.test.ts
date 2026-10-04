/** Wave 2 - Unit: ai.api.ts (student-owned) */
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

import { aiApi } from '@/services/api/ai.api';
import { apiClient } from '@/config/api.config';

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
});

const emptyTurn = {
  sessionId: 's-1',
  messageId: 'm-1',
  answer: '',
  grounded: false,
  sources: [],
  model: 'gemini',
  latencyMs: 1,
};

describe('aiApi.ask', () => {
  it('UT-AIASSIST-001: should POST /api/ai/chat with { question, sessionId } body', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { data: { ...emptyTurn, answer: 'ok' } },
    });

    await aiApi.ask({ question: 'How do I learn React?', sessionId: 'sess-1' });

    const [url, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(url).toBe('/api/ai/chat');
    expect(body).toEqual({ question: 'How do I learn React?', sessionId: 'sess-1' });
  });

  it('UT-AIASSIST-002: should omit sessionId from body when undefined', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: emptyTurn } });

    await aiApi.ask({ question: 'any' });

    const [, body] = vi.mocked(apiClient.post).mock.calls[0]!;
    expect(Object.prototype.hasOwnProperty.call(body, 'sessionId')).toBe(false);
  });

  it('UT-AIASSIST-003: should send topK=1..20 through unchanged when caller passes it', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: emptyTurn } });

    await aiApi.ask({ question: 'q', topK: 1 });
    expect((vi.mocked(apiClient.post).mock.calls[0]![1] as { topK: number }).topK).toBe(1);

    await aiApi.ask({ question: 'q', topK: 20 });
    expect((vi.mocked(apiClient.post).mock.calls[1]![1] as { topK: number }).topK).toBe(20);
  });

  it('UT-AIASSIST-004: should propagate grounded=false (no RAG coverage) to caller', async () => {
    // When the materials don't cover the topic, AIAssistantPage renders an
    // empty-state message instead of the answer text. The flag must travel
    // through unwrap().
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { data: { ...emptyTurn, answer: '', grounded: false } },
    });

    const result = await aiApi.ask({ question: 'obscure' });

    expect(result.grounded).toBe(false);
    expect(result.answer).toBe('');
  });

  it('UT-AIASSIST-005: should propagate grounded=true and answer when backend can cite sources', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {
          ...emptyTurn,
          answer: 'Use hooks.',
          grounded: true,
          sources: [{ docId: 'd1', chunkId: 'c1', title: 'Hooks', score: 0.9 }],
        },
      },
    });

    const result = await aiApi.ask({ question: 'what are hooks' });

    expect(result.grounded).toBe(true);
    expect(result.answer).toBe('Use hooks.');
    expect(result.sources).toHaveLength(1);
  });
});

describe('aiApi.listSessions', () => {
  it('UT-AIASSIST-006: should GET /api/ai/chat/sessions with no params', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } });

    await aiApi.listSessions();

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.get).mock.calls[0]![0]).toBe('/api/ai/chat/sessions');
  });

  it('UT-AIASSIST-007: should return the unwrapped ChatSession[] payload', async () => {
    const sessions = [
      {
        id: 's1',
        userId: 'u1',
        title: 'Title',
        status: 'active',
        messageCount: 2,
        lastMessageAt: '2026-10-01T00:00:00.000Z',
        metadata: {},
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ];
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: sessions } });

    const result = await aiApi.listSessions();

    expect(result).toEqual(sessions);
  });
});

describe('aiApi.getHistory', () => {
  it('UT-AIASSIST-008: should GET /api/ai/chat/:sessionId', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } });

    await aiApi.getHistory('sess-abc');

    const [url] = vi.mocked(apiClient.get).mock.calls[0]!;
    expect(url).toBe('/api/ai/chat/sess-abc');
  });
});
