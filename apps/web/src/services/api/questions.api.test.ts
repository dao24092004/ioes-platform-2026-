import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiClient, ApiError } from '@/config/api.config';
import { questionsApi, type GeneratedQuestionSet } from './questions.api';

vi.mock('@/config/api.config', async () => {
  const actual = await vi.importActual<typeof import('@/config/api.config')>(
    '@/config/api.config',
  );
  return { ...actual, apiClient: { post: vi.fn() } };
});

const post = apiClient.post as unknown as ReturnType<typeof vi.fn>;

const questionSet = (overrides: Partial<GeneratedQuestionSet> = {}): GeneratedQuestionSet => ({
  questions: [
    {
      questionText: 'Box model gồm những lớp nào?',
      questionType: 'multiple_choice',
      difficulty: 'medium',
      options: [
        { optionText: 'content, padding, border, margin', isCorrect: true },
        { optionText: 'chỉ content', isCorrect: false },
      ],
      answerText: null,
      explanation: 'Tài liệu liệt kê đủ bốn lớp.',
      source: {
        docId: 'box-model',
        chunkId: 'box-model#0',
        title: 'Box model',
        score: 0.81,
        excerpt: 'Box model gồm content, padding, border và margin.',
      },
    },
  ],
  requested: 5,
  returned: 1,
  droppedUnverified: 2,
  grounded: true,
  model: 'gemini-3.5-flash-lite',
  latencyMs: 4200,
  ...overrides,
});

beforeEach(() => {
  post.mockReset();
});

describe('questionsApi.generate', () => {
  it('gọi đúng đường dẫn của gateway', async () => {
    post.mockResolvedValue({ data: { success: true, data: questionSet() } });

    await questionsApi.generate({ topic: 'Box model' });

    expect(post).toHaveBeenCalledWith('/api/ai/questions/generate', { topic: 'Box model' });
  });

  it('bóc vỏ envelope và trả về bộ câu hỏi', async () => {
    post.mockResolvedValue({ data: { success: true, data: questionSet() } });

    const result = await questionsApi.generate({ topic: 'Box model', count: 5 });

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].options[0].isCorrect).toBe(true);
    expect(result.questions[0].source.title).toBe('Box model');
  });

  it('giữ lại requested/returned để giao diện nói rõ học liệu đủ tới đâu', async () => {
    post.mockResolvedValue({ data: { success: true, data: questionSet() } });

    const result = await questionsApi.generate({ topic: 'Box model', count: 5 });

    expect(result.requested).toBe(5);
    expect(result.returned).toBe(1);
    expect(result.droppedUnverified).toBe(2);
  });

  it('grounded=false với danh sách rỗng KHÔNG phải lỗi', async () => {
    post.mockResolvedValue({
      data: {
        success: true,
        data: questionSet({ questions: [], returned: 0, droppedUnverified: 0, grounded: false }),
      },
    });

    const result = await questionsApi.generate({ topic: 'Gradient Descent' });

    expect(result.grounded).toBe(false);
    expect(result.questions).toEqual([]);
  });

  it('ném ApiError khi backend báo thất bại', async () => {
    post.mockResolvedValue({
      data: { success: false, message: 'Quá số lượt cho phép', traceId: 'tr-1' },
    });

    await expect(questionsApi.generate({ topic: 'Box model' })).rejects.toBeInstanceOf(ApiError);
  });
});
