import { Test, TestingModule } from '@nestjs/testing';
import { QuestionBankService } from './question-bank.service';
import { DgraphClient } from './dgraph.client';
import {
  SearchQuestionDto,
  QuestionType,
  Difficulty,
} from './dto/search-question.dto';

describe('QuestionBankService', () => {
  let service: QuestionBankService;
  let dgraph: jest.Mocked<DgraphClient>;

  beforeEach(async () => {
    const dgraphMock: Partial<jest.Mocked<DgraphClient>> = {
      query: jest.fn(),
      isHealthy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionBankService,
        { provide: DgraphClient, useValue: dgraphMock },
      ],
    }).compile();

    service = module.get<QuestionBankService>(QuestionBankService);
    dgraph = module.get(DgraphClient) as jest.Mocked<DgraphClient>;
  });

  describe('searchQuestions()', () => {
    it('should_returnMappedResults_When_dgraphReturnsValidResponse', async () => {
      dgraph.query.mockResolvedValue({
        queryQuestion: [
          {
            id: '0x1',
            questionText: 'What is polymorphism?',
            questionType: 'MULTIPLE_CHOICE',
            difficulty: 'MEDIUM',
            language: 'java',
            points: 2,
            tags: ['oop'],
            createdAt: '2026-08-23T10:00:00Z',
            updatedAt: '2026-08-23T10:00:00Z',
            topic: { id: 't1', name: 'OOP', slug: 'oop' },
            requiresSkills: [{ id: 's1', name: 'virtual', slug: 'virtual' }],
            prerequisites: [{ id: 'q0', questionText: 'class basics', difficulty: 'EASY' }],
          },
        ],
        aggregateQuestion: { count: 1 },
      } as any);

      const dto: SearchQuestionDto = {
        q: 'polymorphism',
        difficulty: Difficulty.MEDIUM,
        page: 1,
        limit: 20,
      };

      const result = await service.searchQuestions(dto);

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('0x1');
      expect(result.items[0].questionText).toBe('What is polymorphism?');
      expect(result.items[0].topicId).toBe('t1');
      expect(result.items[0].skillIds).toEqual(['s1']);
      expect(result.items[0].prerequisites).toEqual(['q0']);

      expect(dgraph.query).toHaveBeenCalledWith(
        expect.stringContaining('query SearchQuestions'),
        expect.objectContaining({
          filters: expect.objectContaining({
            questionText: { anyoftext: 'polymorphism' },
            difficulty: { eq: 'MEDIUM' },
          }),
          offset: 0,
          limit: 20,
        }),
      );
    });

    it('should_passSoftDeleteFilter_When_alwaysExcluded', async () => {
      dgraph.query.mockResolvedValue({
        queryQuestion: [],
        aggregateQuestion: { count: 0 },
      } as any);

      await service.searchQuestions({ q: 'test', page: 1, limit: 10 });

      const variables = dgraph.query.mock.calls[0][1] as any;
      expect(variables.filters).toEqual(
        expect.objectContaining({
          not: { has: { deletedAt: true } },
          questionText: { anyoftext: 'test' },
        }),
      );
    });

    it('should_calculateOffset_When_paginationProvided', async () => {
      dgraph.query.mockResolvedValue({
        queryQuestion: [],
        aggregateQuestion: { count: 0 },
      } as any);

      await service.searchQuestions({ q: 'test', page: 3, limit: 15 });

      expect(dgraph.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ offset: 30, limit: 15 }),
      );
    });

    it('should_useDefaults_When_paginationNotProvided', async () => {
      dgraph.query.mockResolvedValue({
        queryQuestion: [],
        aggregateQuestion: { count: 0 },
      } as any);

      await service.searchQuestions({});

      expect(dgraph.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ offset: 0, limit: 20 }),
      );
    });

    it('should_filterByTopic_When_topicIdProvided', async () => {
      dgraph.query.mockResolvedValue({
        queryQuestion: [],
        aggregateQuestion: { count: 0 },
      } as any);

      await service.searchQuestions({ topicId: 'topic-abc' });

      const variables = dgraph.query.mock.calls[0][1] as any;
      expect(variables.filters).toEqual(
        expect.objectContaining({
          topic: { id: { eq: 'topic-abc' } },
        }),
      );
    });

    it('should_filterByQuestionType_When_provided', async () => {
      dgraph.query.mockResolvedValue({
        queryQuestion: [],
        aggregateQuestion: { count: 0 },
      } as any);

      await service.searchQuestions({ questionType: QuestionType.CODING });

      const variables = dgraph.query.mock.calls[0][1] as any;
      expect(variables.filters).toEqual(
        expect.objectContaining({
          questionType: { eq: 'CODING' },
        }),
      );
    });
  });

  describe('getQuestion()', () => {
    it('should_returnMappedQuestion_When_found', async () => {
      dgraph.query.mockResolvedValue({
        getQuestion: {
          id: '0x1',
          questionText: 'Test',
          questionType: 'TRUE_FALSE',
          difficulty: 'EASY',
          points: 1,
          createdAt: '2026-08-23T10:00:00Z',
          updatedAt: '2026-08-23T10:00:00Z',
          topic: { id: 't1', name: 'Topic', slug: 'topic' },
        },
      } as any);

      const result = await service.getQuestion('0x1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('0x1');
      expect(result?.topicId).toBe('t1');
    });

    it('should_returnNull_When_questionNotFound', async () => {
      dgraph.query.mockResolvedValue({ getQuestion: null } as any);
      const result = await service.getQuestion('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getPracticePath()', () => {
    it('should_returnOrderedQuestions_When_topicExists', async () => {
      dgraph.query.mockResolvedValue({
        getTopic: {
          id: 't1',
          name: 'OOP',
          slug: 'oop',
          questions: [
            { id: 'q-easy', questionText: 'Easy', difficulty: 'EASY' },
            { id: 'q-hard', questionText: 'Hard', difficulty: 'HARD' },
          ],
          subTopics: [
            {
              id: 'st1',
              name: 'Inheritance',
              questions: [
                { id: 'q-sub', questionText: 'Sub', difficulty: 'MEDIUM' },
              ],
            },
          ],
        },
      } as any);

      const result = await service.getPracticePath('t1');
      expect(result).not.toBeNull();
      expect(result?.topicId).toBe('t1');
      expect(result?.questions).toHaveLength(3);
      const firstEasy = result?.questions.find((q) => q.id === 'q-easy');
      const lastHard = result?.questions.find((q) => q.id === 'q-hard');
      expect(firstEasy?.order).toBeGreaterThan(lastHard?.order ?? 0);
    });

    it('should_returnNull_When_topicNotFound', async () => {
      dgraph.query.mockResolvedValue({ getTopic: null } as any);
      const result = await service.getPracticePath('missing');
      expect(result).toBeNull();
    });
  });

  describe('getSimilarQuestions()', () => {
    it('should_deduplicateAndLimit_When_combiningSources', async () => {
      dgraph.query.mockResolvedValue({
        getQuestion: {
          similarQuestions: [
            {
              id: 'q1',
              questionText: 'Sim1',
              questionType: 'CODING',
              difficulty: 'MEDIUM',
              points: 1,
              createdAt: '2026-08-23',
              updatedAt: '2026-08-23',
            },
            {
              id: 'q2',
              questionText: 'Sim2',
              questionType: 'CODING',
              difficulty: 'HARD',
              points: 1,
              createdAt: '2026-08-23',
              updatedAt: '2026-08-23',
            },
          ],
          topic: {
            questions: [
              {
                id: 'q2',
                questionText: 'Dup',
                questionType: 'CODING',
                difficulty: 'HARD',
                points: 1,
                createdAt: '2026-08-23',
                updatedAt: '2026-08-23',
              },
              {
                id: 'q3',
                questionText: 'Topic3',
                questionType: 'CODING',
                difficulty: 'EASY',
                points: 1,
                createdAt: '2026-08-23',
                updatedAt: '2026-08-23',
              },
            ],
          },
        },
      } as any);

      const result = await service.getSimilarQuestions('q0', 5);
      const ids = result.map((r) => r.id);
      expect(ids).toEqual(['q1', 'q2', 'q3']);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should_excludeSelfQuestion_When_returned', async () => {
      dgraph.query.mockResolvedValue({
        getQuestion: {
          similarQuestions: [],
          topic: {
            questions: [
              {
                id: 'q0',
                questionText: 'Self',
                questionType: 'CODING',
                difficulty: 'EASY',
                points: 1,
                createdAt: '2026-08-23',
                updatedAt: '2026-08-23',
              },
              {
                id: 'q1',
                questionText: 'Other',
                questionType: 'CODING',
                difficulty: 'EASY',
                points: 1,
                createdAt: '2026-08-23',
                updatedAt: '2026-08-23',
              },
            ],
          },
        },
      } as any);

      const result = await service.getSimilarQuestions('q0', 5);
      expect(result.map((r) => r.id)).toEqual(['q1']);
    });
  });
});
