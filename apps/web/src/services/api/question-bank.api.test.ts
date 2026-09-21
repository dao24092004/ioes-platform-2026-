import { describe, it, expect, vi } from 'vitest';
import { questionBankApi } from './question-bank.api';
import type { SearchParams, CreateQuestionDto } from '@/types/question-bank';

// Mock apiClient
vi.mock('@/config/api.config', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  unwrap: vi.fn((promise: Promise<{ data: { data: unknown } }>) =>
    promise.then((res) => res.data.data),
  ),
  ApiEnvelope: {},
}));

describe('questionBankApi', () => {
  describe('searchQuestions', () => {
    it('should search questions with filters', async () => {
      const params: SearchParams = {
        query: 'algorithm',
        difficulty: 'medium',
        limit: 10,
      };

      const mockResponse = {
        data: {
          data: {
            questions: [
              {
                uid: 'q1',
                questionText: 'What is BFS?',
                questionType: 'multiple_choice',
                difficulty: 'medium',
              },
            ],
            total: 1,
            hasMore: false,
          },
        },
      };

      const { apiClient } = await import('@/config/api.config');
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await questionBankApi.searchQuestions(params);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/v1/question-bank/questions/search',
        { params }
      );
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].questionText).toBe('What is BFS?');
    });
  });

  describe('createQuestion', () => {
    it('should create new question', async () => {
      const data: CreateQuestionDto = {
        questionText: 'What is DFS?',
        questionType: 'multiple_choice',
        difficulty: 'easy',
        points: 5,
        topicId: 't1',
        skillIds: ['s1'],
        options: [
          { optionText: 'Depth First Search', isCorrect: true, position: 0 },
          { optionText: 'Breadth First Search', isCorrect: false, position: 1 },
        ],
      };

      const mockResponse = {
        data: {
          data: {
            uid: 'q2',
            ...data,
          },
        },
      };

      const { apiClient } = await import('@/config/api.config');
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await questionBankApi.createQuestion(data);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/question-bank/questions', data);
      expect(result.uid).toBe('q2');
    });
  });
});
