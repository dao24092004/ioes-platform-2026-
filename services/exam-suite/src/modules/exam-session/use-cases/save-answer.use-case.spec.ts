import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SaveAnswerUseCase } from './save-answer.use-case';
import { ExamSessionRepository } from '../exam-session.repository';
import { SessionCacheService } from '../session-cache.service';

describe('SaveAnswerUseCase', () => {
  let useCase: SaveAnswerUseCase;
  let repository: jest.Mocked<ExamSessionRepository>;
  let sessionCache: jest.Mocked<SessionCacheService>;

  const FIXED_NOW = new Date('2026-08-23T10:00:00.000Z').getTime();
  const originalDateNow = Date.now;

  beforeEach(async () => {
    Date.now = jest.fn(() => FIXED_NOW);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveAnswerUseCase,
        {
          provide: ExamSessionRepository,
          useValue: {
            findAttemptById: jest.fn(),
            upsertDraft: jest.fn(),
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

    useCase = module.get(SaveAnswerUseCase);
    repository = module.get(ExamSessionRepository) as any;
    sessionCache = module.get(SessionCacheService) as any;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  it('should_UpsertDraft_When_AttemptInProgress', async () => {
    repository.findAttemptById.mockResolvedValue({
      id: 'a-1',
      userId: 'u-1',
      status: 'IN_PROGRESS',
      deadlineAt: new Date(FIXED_NOW + 60000),
    } as any);
    sessionCache.getDeadline.mockResolvedValue(FIXED_NOW + 60000);
    repository.upsertDraft.mockResolvedValue({
      savedAt: new Date(FIXED_NOW),
    } as any);

    const result = await useCase.execute('u-1', {
      attemptId: 'a-1',
      questionId: 'q-1',
      answer: 'my answer',
    });

    expect(result.savedAt).toBeInstanceOf(Date);
    expect(repository.upsertDraft).toHaveBeenCalledWith(
      expect.objectContaining({ attemptId: 'a-1', questionId: 'q-1', answer: 'my answer' }),
    );
  });

  it('should_ThrowNotFound_When_AttemptNotFound', async () => {
    repository.findAttemptById.mockResolvedValue(null);

    await expect(
      useCase.execute('u-1', { attemptId: 'a-x', questionId: 'q-1', answer: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should_ThrowForbidden_When_AttemptBelongsToOtherUser', async () => {
    repository.findAttemptById.mockResolvedValue({
      id: 'a-1',
      userId: 'u-other',
      status: 'IN_PROGRESS',
      deadlineAt: new Date(FIXED_NOW + 60000),
    } as any);

    await expect(
      useCase.execute('u-1', { attemptId: 'a-1', questionId: 'q-1', answer: 'x' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should_ThrowForbidden_When_AttemptNotInProgress_BR008', async () => {
    repository.findAttemptById.mockResolvedValue({
      id: 'a-1',
      userId: 'u-1',
      status: 'SUBMITTED',
      deadlineAt: new Date(FIXED_NOW + 60000),
    } as any);

    await expect(
      useCase.execute('u-1', { attemptId: 'a-1', questionId: 'q-1', answer: 'x' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should_ThrowForbidden_When_DeadlinePassed_BR008', async () => {
    repository.findAttemptById.mockResolvedValue({
      id: 'a-1',
      userId: 'u-1',
      status: 'IN_PROGRESS',
      deadlineAt: new Date(FIXED_NOW - 1000), // đã hết giờ
    } as any);
    sessionCache.getDeadline.mockResolvedValue(null);

    await expect(
      useCase.execute('u-1', { attemptId: 'a-1', questionId: 'q-1', answer: 'x' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});