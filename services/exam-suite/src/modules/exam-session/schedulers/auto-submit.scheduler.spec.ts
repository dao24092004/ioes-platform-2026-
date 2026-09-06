import { Test, TestingModule } from '@nestjs/testing';
import { AutoSubmitScheduler } from './auto-submit.scheduler';
import { ExamSessionRepository } from '../exam-session.repository';
import { ExamSessionService } from '../exam-session.service';

describe('AutoSubmitScheduler', () => {
  let scheduler: AutoSubmitScheduler;
  let repository: jest.Mocked<ExamSessionRepository>;
  let service: jest.Mocked<ExamSessionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoSubmitScheduler,
        {
          provide: ExamSessionRepository,
          useValue: {
            findExpiredInProgressAttempts: jest.fn(),
          },
        },
        {
          provide: ExamSessionService,
          useValue: {
            autoSubmit: jest.fn(),
          },
        },
      ],
    }).compile();

    scheduler = module.get(AutoSubmitScheduler);
    repository = module.get(ExamSessionRepository) as any;
    service = module.get(ExamSessionService) as any;
  });

  it('should_ReturnImmediately_When_NoExpiredAttempts', async () => {
    repository.findExpiredInProgressAttempts.mockResolvedValue([]);

    await scheduler.tick();

    expect(service.autoSubmit).not.toHaveBeenCalled();
  });

  it('should_CallAutoSubmit_WithTimeout_When_FoundExpiredAttempts', async () => {
    const now = new Date();
    repository.findExpiredInProgressAttempts.mockResolvedValue([
      { id: 'a-1', status: 'IN_PROGRESS', deadlineAt: now } as any,
      { id: 'a-2', status: 'IN_PROGRESS', deadlineAt: now } as any,
    ]);
    service.autoSubmit.mockResolvedValue({ submissionId: 'sub-1' } as any);

    await scheduler.tick();

    expect(service.autoSubmit).toHaveBeenCalledTimes(2);
    expect(service.autoSubmit).toHaveBeenNthCalledWith(1, 'a-1', 'TIMEOUT');
    expect(service.autoSubmit).toHaveBeenNthCalledWith(2, 'a-2', 'TIMEOUT');
  });

  it('should_ContinueProcessing_When_OneAttemptFails', async () => {
    repository.findExpiredInProgressAttempts.mockResolvedValue([
      { id: 'a-1' } as any,
      { id: 'a-2' } as any,
      { id: 'a-3' } as any,
    ]);
    service.autoSubmit
      .mockResolvedValueOnce({ submissionId: 'sub-1' } as any)
      .mockRejectedValueOnce(new Error('lock timeout'))
      .mockResolvedValueOnce({ submissionId: 'sub-3' } as any);

    await expect(scheduler.tick()).resolves.toBeUndefined();
    expect(service.autoSubmit).toHaveBeenCalledTimes(3);
  });

  it('should_PassCurrentDate_ToRepository_When_Querying', async () => {
    const before = Date.now();
    repository.findExpiredInProgressAttempts.mockResolvedValue([]);
    service.autoSubmit.mockResolvedValue({} as any);

    await scheduler.tick();
    const after = Date.now();

    expect(repository.findExpiredInProgressAttempts).toHaveBeenCalledTimes(1);
    const passedDate = repository.findExpiredInProgressAttempts.mock.calls[0][0];
    expect(passedDate).toBeInstanceOf(Date);
    expect(passedDate.getTime()).toBeGreaterThanOrEqual(before);
    expect(passedDate.getTime()).toBeLessThanOrEqual(after);
  });

  it('should_NotThrow_When_DatabaseQueryFails', async () => {
    repository.findExpiredInProgressAttempts.mockRejectedValue(
      new Error('connection refused'),
    );

    await expect(scheduler.tick()).resolves.toBeUndefined();
    expect(service.autoSubmit).not.toHaveBeenCalled();
  });

  it('should_NotThrow_When_AutoSubmitThrowsUnknownError', async () => {
    repository.findExpiredInProgressAttempts.mockResolvedValue([
      { id: 'a-1' } as any,
    ]);
    service.autoSubmit.mockRejectedValue('string-error-not-Error');

    await expect(scheduler.tick()).resolves.toBeUndefined();
  });

  it('should_ProcessSequentially_When_MultipleAttemptsFound', async () => {
    const callOrder: string[] = [];
    repository.findExpiredInProgressAttempts.mockResolvedValue([
      { id: 'a-1' } as any,
      { id: 'a-2' } as any,
    ]);
    service.autoSubmit.mockImplementation(async (attemptId: string) => {
      callOrder.push(`start:${attemptId}`);
      await new Promise((r) => setTimeout(r, 10));
      callOrder.push(`end:${attemptId}`);
      return { submissionId: `sub-${attemptId}` } as any;
    });

    await scheduler.tick();

    expect(callOrder).toEqual([
      'start:a-1',
      'end:a-1',
      'start:a-2',
      'end:a-2',
    ]);
  });
});