import { Test, TestingModule } from '@nestjs/testing';
import { ExamSessionService } from './exam-session.service';
import { ExamSessionRepository } from './exam-session.repository';
import { SessionCacheService } from './session-cache.service';
import { KafkaPublisherService } from '../../common/kafka-publisher.service';
import {
  START_EXAM_USE_CASE,
  IStartExamUseCase,
} from './use-cases/start-exam.use-case';
import {
  SAVE_ANSWER_USE_CASE,
  ISaveAnswerUseCase,
} from './use-cases/save-answer.use-case';
import {
  SUBMIT_EXAM_USE_CASE,
  ISubmitExamUseCase,
} from './use-cases/submit-exam.use-case';
import {
  RECONNECT_SESSION_USE_CASE,
  IReconnectSessionUseCase,
} from './use-cases/reconnect-session.use-case';
import { KAFKA_TOPICS } from '@ioes/common-node';

/**
 * Test cho ExamSessionService — verify Kafka event payload đúng schema.
 *
 * Vì Kafka broker không chạy trong CI/dev, ta mock KafkaPublisherService
 * nhưng vẫn kiểm tra envelope (eventId, eventType, aggregateId, payload).
 *
 * Đây là contract test cho downstream consumers (analytics, notification,
 * grading) — nếu payload sai → consumer sẽ crash.
 */
describe('ExamSessionService — Kafka event publishing', () => {
  let service: ExamSessionService;
  let kafkaPublisher: jest.Mocked<KafkaPublisherService>;
  let submitExamUc: jest.Mocked<ISubmitExamUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamSessionService,
        { provide: ExamSessionRepository, useValue: {} },
        {
          provide: SessionCacheService,
          useValue: { acquireSubmitLock: jest.fn(), releaseSubmitLock: jest.fn() },
        },
        {
          provide: KafkaPublisherService,
          useValue: { publish: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: START_EXAM_USE_CASE,
          useValue: { execute: jest.fn() },
        },
        {
          provide: SAVE_ANSWER_USE_CASE,
          useValue: { execute: jest.fn() },
        },
        {
          provide: SUBMIT_EXAM_USE_CASE,
          useValue: { execute: jest.fn() },
        },
        {
          provide: RECONNECT_SESSION_USE_CASE,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ExamSessionService);
    kafkaPublisher = module.get(KafkaPublisherService) as any;
    submitExamUc = module.get(SUBMIT_EXAM_USE_CASE) as any;
  });

  it('should_PublishExamStarted_WithCorrectPayload_When_StartAttempt', async () => {
    const startUc = service['startExam'] as jest.Mocked<IStartExamUseCase>;
    startUc.execute.mockResolvedValue({
      attemptId: 'att-1',
      durationMs: 60000,
      deadlineEpochMs: 1700000000000,
      proctoringRequired: true,
      screenRecordEnabled: false,
    } as any);

    await service.startAttempt('user-1', { examId: 'exam-1' } as any);

    // Wait microtask để fire-and-forget publish chạy
    await new Promise((r) => setImmediate(r));

    expect(kafkaPublisher.publish).toHaveBeenCalledWith(
      KAFKA_TOPICS.EXAM_STARTED,
      'ExamSessionStarted',
      expect.objectContaining({
        attemptId: 'att-1',
        examId: 'exam-1',
        userId: 'user-1',
        deadlineEpochMs: 1700000000000,
        proctoringRequired: true,
        screenRecordEnabled: false,
      }),
    );
  });

  it('should_PublishExamSubmitted_Manual_When_SubmitManually', async () => {
    submitExamUc.execute.mockResolvedValue({
      submissionId: 'sub-1',
      submissionKind: 'MANUAL',
      flagged: false,
    } as any);

    await service.submitManually('user-1', 'att-1');

    await new Promise((r) => setImmediate(r));

    expect(kafkaPublisher.publish).toHaveBeenCalledWith(
      KAFKA_TOPICS.EXAM_SUBMITTED,
      'ExamSubmitted',
      expect.objectContaining({
        attemptId: 'att-1',
        submissionId: 'sub-1',
        submissionKind: 'MANUAL',
        userId: 'user-1',
      }),
    );
  });

  it('should_PublishExamSubmitted_Timeout_When_AutoSubmit', async () => {
    submitExamUc.execute.mockResolvedValue({
      submissionId: 'sub-2',
      submissionKind: 'TIMEOUT',
      flagged: false,
    } as any);

    await service.autoSubmit('att-2', 'TIMEOUT');

    await new Promise((r) => setImmediate(r));

    expect(kafkaPublisher.publish).toHaveBeenCalledWith(
      KAFKA_TOPICS.EXAM_SUBMITTED,
      'ExamSubmitted',
      expect.objectContaining({
        attemptId: 'att-2',
        submissionId: 'sub-2',
        submissionKind: 'TIMEOUT',
        flagged: false,
      }),
    );
  });

  it('should_PublishExamSubmitted_AutoFlag_When_AutoFlag', async () => {
    submitExamUc.execute.mockResolvedValue({
      submissionId: 'sub-3',
      submissionKind: 'AUTO_FLAG',
      flagged: true,
    } as any);

    await service.autoSubmit('att-3', 'AUTO_FLAG');

    await new Promise((r) => setImmediate(r));

    expect(kafkaPublisher.publish).toHaveBeenCalledWith(
      KAFKA_TOPICS.EXAM_SUBMITTED,
      'ExamSubmitted',
      expect.objectContaining({
        submissionKind: 'AUTO_FLAG',
        flagged: true,
      }),
    );
  });

  it('should_NotCrash_When_KafkaPublishFails', async () => {
    kafkaPublisher.publish.mockRejectedValue(new Error('broker down'));
    submitExamUc.execute.mockResolvedValue({
      submissionId: 'sub-4',
      submissionKind: 'MANUAL',
      flagged: false,
    } as any);

    // submitManually() KHÔNG được throw dù publish fail
    await expect(service.submitManually('user-1', 'att-1')).resolves.toMatchObject({
      submissionId: 'sub-4',
    });

    // Chờ microtask để .catch() chạy
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
  });

  it('should_UsePastTenseEventType_When_Publishing', async () => {
    submitExamUc.execute.mockResolvedValue({
      submissionId: 'sub-5',
      submissionKind: 'MANUAL',
      flagged: false,
    } as any);

    await service.submitManually('user-1', 'att-1');
    await new Promise((r) => setImmediate(r));

    const calls = kafkaPublisher.publish.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    // Event name PHẢI là past tense theo PROJECT_RULES
    const eventType = calls[0][1];
    expect(eventType).toBe('ExamSubmitted');
    expect(eventType).not.toBe('SubmitExam'); // ❌ không dùng verb nguyên mẫu
  });

  it('should_NotBlockCaller_When_PublishingKafka', async () => {
    // Publish chậm 100ms
    kafkaPublisher.publish.mockImplementation(
      () => new Promise((r) => setTimeout(r, 100)),
    );
    submitExamUc.execute.mockResolvedValue({
      submissionId: 'sub-6',
      submissionKind: 'MANUAL',
      flagged: false,
    } as any);

    const start = Date.now();
    await service.submitManually('user-1', 'att-1');
    const elapsed = Date.now() - start;

    // Caller phải nhận response < 50ms (không block trên Kafka)
    expect(elapsed).toBeLessThan(50);
  });
});