import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CONTENT_SERVICE_CLIENT,
  ExamMetadata,
  IContentServiceClient,
  StartExamUseCase,
} from '../use-cases/start-exam.use-case';
import { ExamSessionRepository } from '../exam-session.repository';
import { SessionCacheService } from '../session-cache.service';

describe('StartExamUseCase', () => {
  let useCase: StartExamUseCase;
  let repository: jest.Mocked<ExamSessionRepository>;
  let sessionCache: jest.Mocked<SessionCacheService>;
  let contentClient: jest.Mocked<IContentServiceClient>;

  const FIXED_NOW = new Date('2026-08-23T10:00:00.000Z').getTime();
  const originalDateNow = Date.now;

  beforeEach(async () => {
    Date.now = jest.fn(() => FIXED_NOW);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartExamUseCase,
        {
          provide: ExamSessionRepository,
          useValue: {
            findActiveAttempt: jest.fn(),
            createAttempt: jest.fn(),
          },
        },
        {
          provide: SessionCacheService,
          useValue: {
            setSession: jest.fn(),
            setDeadline: jest.fn(),
          },
        },
        {
          provide: CONTENT_SERVICE_CLIENT,
          useValue: {
            getExamForStudent: jest.fn(),
          },
        },
        {
          provide: 'WS_BASE_URL',
          useValue: 'ws://localhost:9005',
        },
        {
          provide: 'APP_NAME',
          useValue: 'exam-suite',
        },
      ],
    }).compile();

    useCase = module.get(StartExamUseCase);
    repository = module.get(ExamSessionRepository) as any;
    sessionCache = module.get(SessionCacheService) as any;
    contentClient = module.get(CONTENT_SERVICE_CLIENT) as any;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  const baseExam = (overrides: Partial<ExamMetadata> = {}): ExamMetadata => ({
    id: 'exam-1',
    title: 'Test Exam',
    durationMs: 60 * 60 * 1000, // 60 min
    openFrom: new Date(FIXED_NOW - 1000),
    openUntil: new Date(FIXED_NOW + 60 * 60 * 1000),
    screenRecordEnabled: false,
    proctoringEnabled: true,
    maxScore: 10,
    enrollmentId: 'enr-1',
    ...overrides,
  });

  it('should_ReturnAttemptInfo_When_ValidRequest', async () => {
    contentClient.getExamForStudent.mockResolvedValue(baseExam());
    repository.findActiveAttempt.mockResolvedValue(null);
    repository.createAttempt.mockImplementation(async (data) => ({
      id: 'attempt-1',
      ...data,
    } as any));

    const result = await useCase.execute('user-1', { examId: 'exam-1' });

    expect(result.attemptId).toBe('attempt-1');
    expect(result.wsUrl).toBe('ws://localhost:9005');
    expect(result.deadlineEpochMs).toBe(FIXED_NOW + 60 * 60 * 1000);
    expect(result.proctoringRequired).toBe(true);
    expect(sessionCache.setSession).toHaveBeenCalledTimes(1);
    expect(sessionCache.setDeadline).toHaveBeenCalledTimes(1);
  });

  it('should_ThrowNotFound_When_ExamNotFoundOrNotEnrolled', async () => {
    contentClient.getExamForStudent.mockResolvedValue(null);

    await expect(useCase.execute('user-1', { examId: 'exam-x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should_ThrowForbidden_When_ExamNotInTimeWindow', async () => {
    contentClient.getExamForStudent.mockResolvedValue(
      baseExam({
        openFrom: new Date(FIXED_NOW + 60_000), // mở sau 1 phút
        openUntil: new Date(FIXED_NOW + 3600_000),
      }),
    );

    await expect(useCase.execute('user-1', { examId: 'exam-1' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('should_ThrowForbidden_When_DurationOver30MinButProctoringDisabled_BR010', async () => {
    contentClient.getExamForStudent.mockResolvedValue(
      baseExam({ durationMs: 45 * 60 * 1000, proctoringEnabled: false }),
    );

    await expect(useCase.execute('user-1', { examId: 'exam-1' })).rejects.toMatchObject({
      message: expect.stringContaining('BR-010'),
    });
  });

  it('should_NotRequireProctoring_When_DurationLessThan30Min_BR010', async () => {
    contentClient.getExamForStudent.mockResolvedValue(
      baseExam({ durationMs: 15 * 60 * 1000, proctoringEnabled: false }),
    );
    repository.findActiveAttempt.mockResolvedValue(null);
    repository.createAttempt.mockImplementation(async (data) => ({ id: 'a-1', ...data } as any));

    const result = await useCase.execute('user-1', { examId: 'exam-1' });
    expect(result.proctoringRequired).toBe(false);
  });

  it('should_ThrowForbidden_When_ActiveAttemptAlreadyExists', async () => {
    contentClient.getExamForStudent.mockResolvedValue(baseExam());
    repository.findActiveAttempt.mockResolvedValue({ id: 'existing-1' } as any);

    await expect(useCase.execute('user-1', { examId: 'exam-1' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});