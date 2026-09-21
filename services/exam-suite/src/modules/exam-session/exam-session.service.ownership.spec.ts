import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExamSessionService } from './exam-session.service';

/**
 * UC_009: instructor chỉ giám sát exam của chính mình; ADMIN/SUPER_ADMIN xem tất cả.
 */
describe('ExamSessionService - instructor ownership (UC_009)', () => {
  const EXAM = { id: 'exam-1', instructorId: 'ins-owner', deletedAt: null };
  const ATTEMPT = {
    id: 'att-1',
    examId: 'exam-1',
    userId: 'stu-1',
    status: 'SUBMITTED',
    score: null,
    maxScore: null,
    flag: false,
    flagReason: null,
    submissionKind: 'MANUAL',
  };

  let repository: {
    listActiveAttempts: jest.Mock;
    findAttemptById: jest.Mock;
    findSubmissionByAttempt: jest.Mock;
  };
  let examRepo: { findById: jest.Mock };
  let service: ExamSessionService;

  beforeEach(() => {
    repository = {
      listActiveAttempts: jest.fn().mockResolvedValue([{ id: 'att-1' }]),
      findAttemptById: jest.fn().mockResolvedValue(ATTEMPT),
      findSubmissionByAttempt: jest.fn().mockResolvedValue(null),
    };
    examRepo = { findById: jest.fn().mockResolvedValue(EXAM) };
    service = new ExamSessionService(
      repository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      examRepo as any,
    );
  });

  describe('listActiveAttempts', () => {
    it('should_return_When_instructorOwnsExam', async () => {
      const list = await service.listActiveAttempts('exam-1', {
        userId: 'ins-owner',
        role: 'INSTRUCTOR',
      });
      expect(list).toHaveLength(1);
      expect(repository.listActiveAttempts).toHaveBeenCalledWith('exam-1');
    });

    it('should_throwForbidden_When_instructorNotOwner', async () => {
      await expect(
        service.listActiveAttempts('exam-1', { userId: 'ins-other', role: 'INSTRUCTOR' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.listActiveAttempts).not.toHaveBeenCalled();
    });

    it('should_throwNotFound_When_examMissing', async () => {
      examRepo.findById.mockResolvedValue(null);
      await expect(
        service.listActiveAttempts('exam-x', { userId: 'ins-owner', role: 'INSTRUCTOR' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each(['ADMIN', 'SUPER_ADMIN'])('should_skipOwnership_When_role%s', async (role) => {
      await service.listActiveAttempts('exam-1', { userId: 'someone', role });
      expect(examRepo.findById).not.toHaveBeenCalled();
      expect(repository.listActiveAttempts).toHaveBeenCalled();
    });

    it('should_throwForbidden_When_student', async () => {
      await expect(
        service.listActiveAttempts('exam-1', { userId: 'stu-1', role: 'STUDENT' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getProctoringReport', () => {
    it('should_returnReport_When_instructorOwnsExam', async () => {
      const report = await service.getProctoringReport('att-1', {
        userId: 'ins-owner',
        role: 'INSTRUCTOR',
      });
      expect(report?.attemptId).toBe('att-1');
      expect(examRepo.findById).toHaveBeenCalledWith('exam-1');
    });

    it('should_throwForbidden_When_instructorNotOwner', async () => {
      await expect(
        service.getProctoringReport('att-1', { userId: 'ins-other', role: 'INSTRUCTOR' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.findSubmissionByAttempt).not.toHaveBeenCalled();
    });

    it('should_returnNull_When_attemptMissing', async () => {
      repository.findAttemptById.mockResolvedValue(null);
      await expect(
        service.getProctoringReport('att-x', { userId: 'ins-owner', role: 'INSTRUCTOR' }),
      ).resolves.toBeNull();
    });
  });
});
