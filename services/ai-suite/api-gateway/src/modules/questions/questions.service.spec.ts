import { Test, TestingModule } from '@nestjs/testing';
import { Difficulty, QuestionType } from '@ioes/common-node';
import {
  MlGenerateQuestionsResponse,
  MlWorkerClient,
} from '../ml-worker/ml-worker.client';
import { QuestionsService } from './questions.service';

describe('QuestionsService', () => {
  let service: QuestionsService;
  let mlWorker: jest.Mocked<MlWorkerClient>;

  const mlResponse = (
    overrides: Partial<MlGenerateQuestionsResponse> = {},
  ): MlGenerateQuestionsResponse => ({
    questions: [
      {
        question_text: 'Box model gồm những lớp nào?',
        question_type: 'multiple_choice',
        difficulty: 'medium',
        options: [
          { option_text: 'content, padding, border, margin', is_correct: true },
          { option_text: 'chỉ content', is_correct: false },
        ],
        answer_text: null,
        explanation: 'Tài liệu liệt kê đủ bốn lớp.',
        source: {
          doc_id: 'box-model',
          chunk_id: 'box-model#0',
          title: 'Box model',
          score: 0.81,
          excerpt: 'Box model gồm content, padding, border và margin.',
        },
      },
    ],
    requested: 5,
    returned: 1,
    dropped_unverified: 2,
    grounded: true,
    model: 'gemini-3.5-flash-lite',
    usage: { prompt_tokens: null, completion_tokens: null, total_tokens: null },
    latency_ms: 4200,
    ...overrides,
  });

  beforeEach(async () => {
    mlWorker = {
      generateQuestions: jest.fn(),
    } as unknown as jest.Mocked<MlWorkerClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        { provide: MlWorkerClient, useValue: mlWorker },
      ],
    }).compile();

    service = module.get(QuestionsService);
  });

  it('đổi snake_case của ml-worker sang camelCase', async () => {
    mlWorker.generateQuestions.mockResolvedValue(mlResponse());

    const result = await service.generate('u-1', { topic: 'Box model' });

    expect(result.questions[0]).toMatchObject({
      questionText: 'Box model gồm những lớp nào?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      difficulty: Difficulty.MEDIUM,
      answerText: null,
    });
    expect(result.questions[0].options[0]).toEqual({
      optionText: 'content, padding, border, margin',
      isCorrect: true,
    });
    expect(result.questions[0].source.chunkId).toBe('box-model#0');
  });

  it('giữ nguyên số câu bị loại để giao diện nói thật với người dùng', async () => {
    mlWorker.generateQuestions.mockResolvedValue(mlResponse());

    const result = await service.generate('u-1', { topic: 'Box model', count: 5 });

    expect(result.requested).toBe(5);
    expect(result.returned).toBe(1);
    expect(result.droppedUnverified).toBe(2);
  });

  it('trả danh sách rỗng kèm grounded=false khi học liệu chưa phủ chủ đề', async () => {
    mlWorker.generateQuestions.mockResolvedValue(
      mlResponse({ questions: [], returned: 0, dropped_unverified: 0, grounded: false }),
    );

    const result = await service.generate('u-1', { topic: 'Gradient Descent' });

    // Không phải lỗi: học liệu không có nội dung thì đây là câu trả lời đúng.
    expect(result.grounded).toBe(false);
    expect(result.questions).toEqual([]);
  });

  it('gửi mặc định xuống ml-worker khi người dùng không chọn', async () => {
    mlWorker.generateQuestions.mockResolvedValue(mlResponse());

    await service.generate('u-1', { topic: 'Box model' });

    expect(mlWorker.generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({
        question_type: QuestionType.MULTIPLE_CHOICE,
        difficulty: Difficulty.MEDIUM,
        count: 5,
        language: 'vi',
      }),
    );
  });

  it('chuyển tiếp lựa chọn của người dùng, không ghi đè', async () => {
    mlWorker.generateQuestions.mockResolvedValue(mlResponse());

    await service.generate('u-1', {
      topic: 'Flexbox',
      questionType: QuestionType.TRUE_FALSE,
      difficulty: Difficulty.HARD,
      count: 3,
      language: 'en',
      instructions: 'tập trung vào justify-content',
    });

    expect(mlWorker.generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'Flexbox',
        question_type: QuestionType.TRUE_FALSE,
        difficulty: Difficulty.HARD,
        count: 3,
        language: 'en',
        instructions: 'tập trung vào justify-content',
      }),
    );
  });
});
