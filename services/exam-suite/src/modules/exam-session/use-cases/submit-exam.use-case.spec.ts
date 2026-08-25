import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SubmitExamUseCase } from './submit-exam.use-case';
import { ExamSessionRepository } from '../exam-session.repository';
import { SessionCacheService } from '../session-cache.service';

describe('SubmitExamUseCase', () => {
  let useCase: SubmitExamUseCase;
  let repository: jest.Mocked<ExamSessionRepository>;
  let sessionCache: jest.Mocked<SessionCacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitExamUseCase,
        {
          provide: ExamSessionRepository,
          useValue: {
            findSubmissionByAttempt: jest.fn(),
            findAttemptById: jest.fn(),
            withTransaction: jest.fn(),
            createSubmission: jest.fn(),
            updateAttemptSubmission: jest.fn(),
            getAnswersSnapshot: jest.fn(),
          },
        },
        {
          provide: SessionCacheService,
          useValue: {
            acquireSubmitLock: jest.fn(),
            releaseSubmitLock: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(SubmitExamUseCase);
    repository = module.get(ExamSessionRepository) as any;
    sessionCache = module.get(SessionCacheService) as any;
  });

  it('should_ReturnExisting_When_AlreadySubmitted_Idempotent', async () => {
    repository.findSubmissionByAttempt.mockResolvedValue({ id: 'sub-existing' } as any);
    repository.findAttemptById.mockResolvedValue({
      submissionKind: 'MANUAL',
      flag: false,
    } as any);

    const result = await useCase.execute('u-1', 'a-1', 'MANUAL');
    expect(result.submissionId).toBe('sub-existing');
  });

  it('should_ThrowNotFound_When_AttemptNotFound', async () => {
    repository.findSubmissionByAttempt.mockResolvedValue(null);
    repository.findAttemptById.mockResolvedValue(null);

    await expect(useCase.execute('u-1', 'a-x', 'MANUAL')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should_ThrowForbidden_When_ManualSubmitOnOtherUserAttempt', async () => {
    repository.findSubmissionByAttempt.mockResolvedValue(null);
    repository.findAttemptById.mockResolvedValue({
      id: 'a-1',
      userId: 'u-other',
      status: 'IN_PROGRESS',
      flag: false,
    } as any);

    await expect(useCase.execute('u-1', 'a-1', 'MANUAL')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('should_NotCheckOwnership_When_AutoFlag_BR013', async () => {
    repository.findSubmissionByAttempt.mockResolvedValue(null);
    repository.findAttemptById
      .mockResolvedValueOnce({
        id: 'a-1',
        userId: 'u-1',
        status: 'IN_PROGRESS',
        flag: true,
        flagReason: 'VIOLATION_THRESHOLD',
      } as any)
      .mockResolvedValueOnce({
        id: 'a-1',
        userId: 'u-1',
        status: 'IN_PROGRESS',
        flag: true,
      } as any);
    sessionCache.acquireSubmitLock.mockResolvedValue(true);
    repository.withTransaction.mockImplementation(async (work) => {
      const m = { getRepository: () => ({}) } as any;
      return work(m);
    });
    repository.createSubmission.mockResolvedValue({ id: 'sub-1' } as any);
    repository.getAnswersSnapshot.mockResolvedValue({});

    const result = await useCase.execute('system', 'a-1', 'AUTO_FLAG');
    expect(result.submissionId).toBe('sub-1');
    expect(result.flagged).toBe(true);
  });

  it('should_ThrowConflict_When_LockNotAcquired', async () => {
    repository.findSubmissionByAttempt.mockResolvedValue(null);
    repository.findAttemptById.mockResolvedValue({
      id: 'a-1',
      userId: 'u-1',
      status: 'IN_PROGRESS',
    } as any);
    sessionCache.acquireSubmitLock.mockResolvedValue(false);

    await expect(useCase.execute('u-1', 'a-1', 'MANUAL')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('should_ReleaseLock_InFinallyBlock', async () => {
    repository.findSubmissionByAttempt.mockResolvedValue(null);
    repository.findAttemptById
      .mockResolvedValueOnce({
        id: 'a-1',
        userId: 'u-1',
        status: 'IN_PROGRESS',
        flag: false,
      } as any)
      .mockResolvedValueOnce({
        id: 'a-1',
        userId: 'u-1',
        status: 'EXPIRED', // đã submit bởi tiến trình khác
        flag: false,
      } as any);
    sessionCache.acquireSubmitLock.mockResolvedValue(true);
    repository.withTransaction.mockImplementation(async (work) => {
      const m = { getRepository: () => ({}) } as any;
      return work(m);
    });

    await expect(useCase.execute('u-1', 'a-1', 'MANUAL')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(sessionCache.releaseSubmitLock).toHaveBeenCalled();
  });
});