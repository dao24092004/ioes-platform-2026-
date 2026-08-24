import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReconnectSessionUseCase } from './reconnect-session.use-case';
import { ExamSessionRepository } from '../exam-session.repository';
import { SessionCacheService } from '../session-cache.service';

describe('ReconnectSessionUseCase', () => {
  let useCase: ReconnectSessionUseCase;
  let repository: jest.Mocked<ExamSessionRepository>;
  let sessionCache: jest.Mocked<SessionCacheService>;

  const FIXED_NOW = new Date('2026-08-23T10:00:00.000Z').getTime();
  const originalDateNow = Date.now;

  beforeEach(async () => {
    Date.now = jest.fn(() => FIXED_NOW);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconnectSessionUseCase,
        {
          provide: ExamSessionRepository,
          useValue: {
            findAttemptById: jest.fn(),
            findDraftsByAttempt: jest.fn(),
          },
        },
        {
          provide: SessionCacheService,
          useValue: {
            getDeadline: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(ReconnectSessionUseCase);
    repository = module.get(ExamSessionRepository) as any;
    sessionCache = module.get(SessionCacheService) as any;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  it('should_ReturnSessionStateAndDrafts_When_AttemptActive', async () => {
    const deadline = FIXED_NOW + 30 * 60 * 1000;
    repository.findAttemptById.mockResolvedValue({
      id: 'a-1',
      userId: 'u-1',
      status: 'IN_PROGRESS',
      deadlineAt: new Date(deadline),
    } as any);
    sessionCache.getDeadline.mockResolvedValue(deadline);
    repository.findDraftsByAttempt.mockResolvedValue([
      {
        questionId: 'q-1',
        answer: 'A',
        savedAt: new Date(FIXED_NOW - 60_000),
      } as any,
    ]);

    const result = await useCase.execute('u-1', 'a-1');
    expect(result.remainingMs).toBe(30 * 60 * 1000);
    expect(result.drafts).toHaveLength(1);
  });

  it('should_ThrowNotFound_When_AttemptNotFound', async () => {
    repository.findAttemptById.mockResolvedValue(null);
    await expect(useCase.execute('u-1', 'a-x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should_ThrowForbidden_When_NotOwner', async () => {
    repository.findAttemptById.mockResolvedValue({
      id: 'a-1',
      userId: 'u-other',
      status: 'IN_PROGRESS',
      deadlineAt: new Date(FIXED_NOW + 1000),
    } as any);
    await expect(useCase.execute('u-1', 'a-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should_ThrowForbidden_When_AttemptFinished', async () => {
    repository.findAttemptById.mockResolvedValue({
      id: 'a-1',
      userId: 'u-1',
      status: 'SUBMITTED',
      deadlineAt: new Date(FIXED_NOW + 1000),
    } as any);
    await expect(useCase.execute('u-1', 'a-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should_ThrowForbidden_When_DeadlinePassed', async () => {
    repository.findAttemptById.mockResolvedValue({
      id: 'a-1',
      userId: 'u-1',
      status: 'IN_PROGRESS',
      deadlineAt: new Date(FIXED_NOW - 1000),
    } as any);
    sessionCache.getDeadline.mockResolvedValue(FIXED_NOW - 1000);
    await expect(useCase.execute('u-1', 'a-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should_FallBackToDbDeadline_When_RedisMissing', async () => {
    const deadline = FIXED_NOW + 60_000;
    repository.findAttemptById.mockResolvedValue({
      id: 'a-1',
      userId: 'u-1',
      status: 'IN_PROGRESS',
      deadlineAt: new Date(deadline),
    } as any);
    sessionCache.getDeadline.mockResolvedValue(null); // cache miss
    repository.findDraftsByAttempt.mockResolvedValue([]);

    const result = await useCase.execute('u-1', 'a-1');
    expect(result.deadlineEpochMs).toBe(deadline);
    expect(result.remainingMs).toBeGreaterThan(0);
  });
});