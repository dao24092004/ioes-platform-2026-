/** Wave 2 - Unit: question-bank.api.ts (student-owned) */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiClient BEFORE import so module-level side-effects are inert.
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

import { questionBankApi } from '@/services/api/question-bank.api';
import { apiClient } from '@/config/api.config';

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
  vi.mocked(apiClient.patch).mockReset();
  vi.mocked(apiClient.delete).mockReset();
});

describe('questionBankApi.searchQuestions', () => {
  it('UT-PRACTICE-001: should call GET /api/v1/question-bank/questions/search with all filters as query params', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: { questions: [], total: 0, hasMore: false } },
    });

    await questionBankApi.searchQuestions({
      query: 'bubble sort',
      topicId: 't-algos',
      difficulty: 'medium',
      questionType: 'multiple_choice',
      skillIds: ['s-1', 's-2'],
      limit: 25,
      offset: 50,
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    const [url, config] = vi.mocked(apiClient.get).mock.calls[0]!;
    expect(url).toBe('/api/v1/question-bank/questions/search');
    expect(config?.params).toEqual({
      query: 'bubble sort',
      topicId: 't-algos',
      difficulty: 'medium',
      questionType: 'multiple_choice',
      skillIds: ['s-1', 's-2'],
      limit: 25,
      offset: 50,
    });
  });

  it('UT-PRACTICE-002: should return the unwrapped payload of { questions, total, hasMore }', async () => {
    const payload = {
      questions: [{ uid: 'q-1' }],
      total: 1,
      hasMore: false,
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: payload } });

    const result = await questionBankApi.searchQuestions({ query: 'x' });

    expect(result).toEqual(payload);
  });
});

describe('questionBankApi.getPracticePath', () => {
  it('UT-PRACTICE-003: should call GET /api/v1/question-bank/topics/:topicId/practice', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: { question: {}, prerequisites: [], nextQuestions: [] } },
    });

    await questionBankApi.getPracticePath('topic-42');

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    const [url, config] = vi.mocked(apiClient.get).mock.calls[0]!;
    expect(url).toBe('/api/v1/question-bank/topics/topic-42/practice');
    // No params: PracticePage only needs the topic in the URL.
    expect(config?.params).toBeUndefined();
  });

  it('UT-PRACTICE-004: should propagate the practice path payload structure unchanged', async () => {
    const node = {
      question: { uid: 'q-1', questionText: 'Q?' },
      prerequisites: [{ uid: 'q-0', questionText: 'Prereq' }],
      nextQuestions: [{ uid: 'q-2', questionText: 'Next' }],
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: node } });

    const result = await questionBankApi.getPracticePath('t-1');

    expect(result).toEqual(node);
    expect(result.prerequisites).toHaveLength(1);
    expect(result.nextQuestions).toHaveLength(1);
  });
});

describe('questionBankApi.listTopics', () => {
  it('UT-PRACTICE-005: should call GET /api/v1/question-bank/topics with no params', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } });

    await questionBankApi.listTopics();

    const [url, config] = vi.mocked(apiClient.get).mock.calls[0]!;
    expect(url).toBe('/api/v1/question-bank/topics');
    // No config means the second arg is `undefined` (axios drops it), so the
    // call is "url only" — there should be no params either way.
    expect(config?.params).toBeUndefined();
  });

  it('UT-PRACTICE-006: should return an empty array when the envelope has an empty data array', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } });

    const result = await questionBankApi.listTopics();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });
});
