import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import {
  KafkaProducer,
  UserPrincipalDto,
  QuestionStatus,
  QuestionType,
  Difficulty,
  KAFKA_TOPICS,
  EVENT_TYPES,
  OutboxEvent,
} from '@ioes/common-node';
import { QuestionWriteService } from './question-write.service';
import { Question } from './entities/question.entity';
import { CreateQuestionDto } from './dto/create-question.dto';

/**
 * Tests cho QuestionWriteService với Outbox Pattern.
 *
 * Quan trọng:
 * - KHÔNG được gọi KafkaProducer.sendEvent() trực tiếp từ service
 * - Phải INSERT vào outbox_events thay vì publish Kafka
 * - Transaction phải wrap cả DB write + outbox insert
 */
describe('QuestionWriteService - Outbox Pattern', () => {
  let service: QuestionWriteService;
  let mockDataSource: any;
  let mockProducer: any;
  let outboxInserts: any[] = [];
  let mockManager: any;

  const mockUser: UserPrincipalDto = Object.assign(
    new UserPrincipalDto(),
    {
      userId: 'user-uuid-1',
      email: 'instructor@example.com',
      role: 'INSTRUCTOR',
    },
  );

  const createDto: CreateQuestionDto = {
    questionText: 'What is polymorphism?',
    questionType: QuestionType.MULTIPLE_CHOICE,
    difficulty: Difficulty.MEDIUM,
    points: 2,
    topicId: 'topic-uuid-1',
    tags: ['oop'],
    options: [
      { optionText: 'A', isCorrect: true, sortOrder: 0 },
      { optionText: 'B', isCorrect: false, sortOrder: 1 },
    ],
  };

  const mockQuestionEntity: Partial<Question> = {
    id: 'q-uuid-1',
    questionText: 'What is polymorphism?',
    questionType: QuestionType.MULTIPLE_CHOICE,
    difficulty: Difficulty.MEDIUM,
    points: 2,
    topicId: 'topic-uuid-1',
    status: QuestionStatus.DRAFT,
    createdBy: mockUser.userId,
    updatedBy: mockUser.userId,
    tags: ['oop'],
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    outboxInserts = [];

    const outboxRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((entity) => {
        outboxInserts.push(entity);
        return Promise.resolve(entity);
      }),
    };

    const questionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => ({ ...mockQuestionEntity, ...data })),
      save: jest.fn((data) => Promise.resolve({ ...mockQuestionEntity, ...data })),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockManager = {
      getRepository: jest.fn((entity) => {
        if (entity === OutboxEvent) return outboxRepo;
        if (entity === Question) return questionRepo;
        return null;
      }),
      create: jest.fn((entity, data) => data),
      save: jest.fn((entity, data) => {
        outboxInserts.push(data);
        return Promise.resolve(data);
      }),
    };

    mockDataSource = {
      transaction: jest.fn(async (cb) => cb(mockManager)),
    };

    mockProducer = {
      sendEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionWriteService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: KafkaProducer, useValue: mockProducer },
      ],
    }).compile();

    service = module.get<QuestionWriteService>(QuestionWriteService);
  });

  describe('create()', () => {
    it('should_insertOutboxEvent_When_persisting', async () => {
      await service.create(createDto, mockUser, 'corr-1');

      // Verify outbox event created
      expect(outboxInserts).toHaveLength(1);
      const outbox = outboxInserts[0];
      expect(outbox).toMatchObject({
        eventType: EVENT_TYPES.QUESTION_CREATED,
        topic: KAFKA_TOPICS.QUESTION_CREATED,
        aggregateId: 'q-uuid-1',
        aggregateType: 'Question',
        source: 'exam-suite',
        status: 'PENDING',
        attempts: 0,
      });
      expect(outbox.eventId).toMatch(/^evt-/);
      expect(outbox.correlationId).toBe('corr-1');
    });

    it('should_notCallKafkaProducer_When_persisting', async () => {
      await service.create(createDto, mockUser, 'corr-1');

      // Verify KafkaProducer KHÔNG được gọi trực tiếp
      expect(mockProducer.sendEvent).not.toHaveBeenCalled();
    });

    it('should_beTransactional_When_dbWriteFails', async () => {
      mockManager.save = jest.fn(() => {
        throw new Error('DB constraint violation');
      });

      await expect(
        service.create(createDto, mockUser, 'corr-1'),
      ).rejects.toThrow('DB constraint violation');

      // Outbox KHÔNG được insert (transaction rollback)
      expect(outboxInserts).toHaveLength(0);
    });

    it('should_throwDuplicate_When_questionExists', async () => {
      mockManager.getRepository = jest.fn((entity) => {
        if (entity === OutboxEvent) {
          return { create: jest.fn(), save: jest.fn() };
        }
        if (entity === Question) {
          return {
            findOne: jest.fn().mockResolvedValue(mockQuestionEntity),
            create: jest.fn(),
            save: jest.fn(),
          };
        }
        return null;
      });

      await expect(
        service.create(createDto, mockUser, 'corr-1'),
      ).rejects.toThrow(/already exists/);
    });
  });

  describe('update()', () => {
    beforeEach(() => {
      mockManager.getRepository = jest.fn((entity) => {
        if (entity === OutboxEvent) {
          return {
            create: jest.fn((data) => data),
            save: jest.fn((data) => {
              outboxInserts.push(data);
              return Promise.resolve(data);
            }),
          };
        }
        if (entity === Question) {
          return {
            findOne: jest.fn().mockResolvedValue(mockQuestionEntity),
            create: jest.fn((data) => data),
            save: jest.fn((data) => Promise.resolve({ ...mockQuestionEntity, ...data, version: 2 })),
          };
        }
        return null;
      });
    });

    it('should_insertOutboxUpdatedEvent_When_updated', async () => {
      await service.update('q-uuid-1', { questionText: 'updated' }, mockUser, 'corr-1');

      expect(outboxInserts).toHaveLength(1);
      expect(outboxInserts[0]).toMatchObject({
        eventType: EVENT_TYPES.QUESTION_UPDATED,
        topic: KAFKA_TOPICS.QUESTION_UPDATED,
      });
    });

    it('should_throwConflict_When_etagMismatch', async () => {
      const existing = { ...mockQuestionEntity, version: 5 };

      mockManager.getRepository = jest.fn((entity) => {
        if (entity === Question) {
          return {
            findOne: jest.fn().mockResolvedValue(existing),
          };
        }
        return null;
      });

      await expect(
        service.update('q-uuid-1', { etag: '4' }, mockUser, 'corr-1'),
      ).rejects.toThrow(/modified by another request/);
    });
  });

  describe('softDelete()', () => {
    beforeEach(() => {
      mockManager.getRepository = jest.fn((entity) => {
        if (entity === OutboxEvent) {
          return {
            create: jest.fn((data) => data),
            save: jest.fn((data) => {
              outboxInserts.push(data);
              return Promise.resolve(data);
            }),
          };
        }
        if (entity === Question) {
          return {
            findOne: jest.fn().mockResolvedValue(mockQuestionEntity),
            softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
          };
        }
        return null;
      });
    });

    it('should_insertDeleteOutboxEvent_When_softDeleted', async () => {
      await service.softDelete('q-uuid-1', mockUser, 'corr-1');

      expect(outboxInserts).toHaveLength(1);
      expect(outboxInserts[0]).toMatchObject({
        eventType: EVENT_TYPES.QUESTION_DELETED,
        topic: KAFKA_TOPICS.QUESTION_DELETED,
      });
      expect(outboxInserts[0].payload).toMatchObject({
        id: 'q-uuid-1',
        deletedBy: mockUser.userId,
      });
    });
  });

  describe('publish()', () => {
    beforeEach(() => {
      mockManager.getRepository = jest.fn((entity) => {
        if (entity === OutboxEvent) {
          return {
            create: jest.fn((data) => data),
            save: jest.fn((data) => {
              outboxInserts.push(data);
              return Promise.resolve(data);
            }),
          };
        }
        if (entity === Question) {
          return {
            findOne: jest.fn().mockResolvedValue({
              ...mockQuestionEntity,
              status: QuestionStatus.DRAFT,
            }),
            save: jest.fn((data) => Promise.resolve({ ...data, status: QuestionStatus.PUBLISHED })),
          };
        }
        return null;
      });
    });

    it('should_insertPublishedEvent_When_published', async () => {
      await service.publish('q-uuid-1', mockUser, 'corr-1');

      expect(outboxInserts).toHaveLength(1);
      expect(outboxInserts[0]).toMatchObject({
        eventType: EVENT_TYPES.QUESTION_PUBLISHED,
        topic: KAFKA_TOPICS.QUESTION_PUBLISHED,
      });
    });
  });
});