import { ExamService } from './exam.service';
import { ExamRepository } from './repositories/exam.repository';
import { AttemptRepository } from './repositories/attempt.repository';
import { ExamEventsPublisher } from '../exam-events/exam-events.publisher';
import { DataSource, EntityManager } from 'typeorm';
import { Exam } from './entities/exam.entity';
import { ExamAttempt, AttemptStatus } from './entities/exam-attempt.entity';
import { Question } from '../question-bank/entities/question.entity';
import { QuestionType, Difficulty } from '@ioes/common-node';
import { MaxAttemptsReachedError } from './errors/exam.errors';

/**
 * Test ExamService với mocked repositories.
 * Focus: orchestration logic, không test DB thật (đó là integration test).
 */
describe('ExamService - Start exam flow', () => {
  let service: ExamService;
  let examRepo: jest.Mocked<ExamRepository>;
  let attemptRepo: jest.Mocked<AttemptRepository>;
  let eventsPublisher: jest.Mocked<ExamEventsPublisher>;
  let dataSource: jest.Mocked<DataSource>;

  const sampleExam = {
    id: 'exam-1',
    title: 'Math Test',
    instructorId: 'instr-1',
    examType: 'graded' as any,
    isRandomized: false,
    timeLimitMinutes: 60,
    maxAttempts: 3,
    passingScore: 70,
    showResults: true,
    isProctored: false,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    version: 1,
  } as unknown as Exam;

  beforeEach(() => {
    examRepo = {
      findById: jest.fn(),
      findByIdOrFail: jest.fn(),
      findByIdForUpdate: jest.fn(),
      findByIdInTx: jest.fn(),
      findByInstructor: jest.fn(),
      findPractice: jest.fn(),
      findQuestionsByExamIdInTx: jest.fn(),
      save: jest.fn(),
    } as any;

    attemptRepo = {
      findActiveByUserAndExam: jest.fn(),
      findActiveByUserAndExamForUpdate: jest.fn(),
      findByIdForUpdate: jest.fn(),
      countCompletedAttempts: jest.fn(),
      findByIdWithExam: jest.fn(),
      findAnswersByAttempt: jest.fn(),
      saveAttempt: jest.fn(),
      saveAnswer: jest.fn(),
      saveAnswers: jest.fn(),
      findExpiredActiveAttempts: jest.fn(),
      findAnswersForQuestions: jest.fn(),
    } as any;

    eventsPublisher = {
      publishStartedInTx: jest.fn().mockResolvedValue(undefined),
      publishSubmittedInTx: jest.fn().mockResolvedValue(undefined),
      publishGradedInTx: jest.fn().mockResolvedValue(undefined),
    } as any;

    dataSource = {
      transaction: jest.fn(),
    } as any;

    service = new ExamService(examRepo, attemptRepo, eventsPublisher, dataSource);
  });

  describe('startExam()', () => {
    it('should_throwExamNotFound_When_examMissing', async () => {
      examRepo.findById.mockResolvedValue(null);

      await expect(
        service.startExam('missing-exam', 'user-1'),
      ).rejects.toThrow('Exam not found');
    });

    it('should_throwExamDeleted_When_softDeleted', async () => {
      examRepo.findById.mockResolvedValue({ ...sampleExam, deletedAt: new Date() } as Exam);

      await expect(
        service.startExam('exam-1', 'user-1'),
      ).rejects.toThrow('Exam has been deleted');
    });

    it('should_resumeAttempt_When_activeExists', async () => {
      examRepo.findById.mockResolvedValue(sampleExam);
      const existing: ExamAttempt = {
        id: 'att-1',
        examId: 'exam-1',
        userId: 'user-1',
        status: AttemptStatus.IN_PROGRESS,
        questionIds: ['q1', 'q2', 'q3'],
        startedAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      } as ExamAttempt;
      attemptRepo.findActiveByUserAndExam.mockResolvedValue(existing);

      const result = await service.startExam('exam-1', 'user-1');

      expect(result.success).toBe(true);
      expect((result.data as any).attempt.id).toBe('att-1');
      expect(dataSource.transaction).not.toHaveBeenCalled(); // Resume = no new transaction
    });

    it('should_throwGone_When_resumeExpired', async () => {
      examRepo.findById.mockResolvedValue(sampleExam);
      const expired: ExamAttempt = {
        id: 'att-1',
        examId: 'exam-1',
        userId: 'user-1',
        status: AttemptStatus.IN_PROGRESS,
        questionIds: ['q1'],
        // 2 giờ trước - đã quá time limit (60 min)
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      } as ExamAttempt;
      attemptRepo.findActiveByUserAndExam.mockResolvedValue(expired);

      await expect(service.startExam('exam-1', 'user-1')).rejects.toThrow(
        'Attempt has expired',
      );
    });

    it('should_throwMaxAttempts_When_reached', async () => {
      examRepo.findById.mockResolvedValue(sampleExam);
      attemptRepo.findActiveByUserAndExam.mockResolvedValue(null);
      attemptRepo.countCompletedAttempts.mockResolvedValue(3);

      await expect(
        service.startExam('exam-1', 'user-1'),
      ).rejects.toThrow(MaxAttemptsReachedError);
    });

    it('should_createAttemptAndPublishEvent_When_valid', async () => {
      examRepo.findById.mockResolvedValue(sampleExam);
      attemptRepo.findActiveByUserAndExam.mockResolvedValue(null);
      attemptRepo.countCompletedAttempts.mockResolvedValue(0);

      // Mock transaction callback - using repository method now
      const emMock: any = {
        create: jest.fn().mockImplementation((_Entity, data) => data),
        save: jest.fn().mockImplementation((_Entity, data) =>
          Promise.resolve({ ...data, id: 'att-new' }),
        ),
      };
      examRepo.findByIdForUpdate.mockResolvedValue(sampleExam);
      examRepo.findQuestionsByExamIdInTx.mockResolvedValue([
        {
          id: 'q1',
          questionText: 'Q1',
          questionType: QuestionType.MULTIPLE_CHOICE,
          difficulty: Difficulty.EASY,
          points: 10,
        } as Question,
      ]);
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb(emMock as EntityManager),
      );

      const result = await service.startExam('exam-1', 'user-1', 'trace-1');

      expect(result.success).toBe(true);
      expect(eventsPublisher.publishStartedInTx).toHaveBeenCalledWith(
        emMock,
        expect.objectContaining({
          examId: 'exam-1',
          attemptId: 'att-new',
          userId: 'user-1',
          totalQuestions: 1,
          durationMinutes: 60,
        }),
        'trace-1',
      );
    });
  });

  describe('cancelAttempt()', () => {
    it('should_cancel_When_ownerAndActive', async () => {
      const attempt: ExamAttempt = {
        id: 'att-1',
        examId: 'exam-1',
        userId: 'user-1',
        status: AttemptStatus.IN_PROGRESS,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      } as ExamAttempt;

      const emMock: any = {
        save: jest.fn().mockResolvedValue({ ...attempt, status: AttemptStatus.CANCELLED }),
      };
      attemptRepo.findByIdForUpdate.mockResolvedValue(attempt);
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb(emMock as EntityManager),
      );

      const result = await service.cancelAttempt('att-1', 'user-1');

      expect(result.success).toBe(true);
      expect((result.data as any).status).toBe(AttemptStatus.CANCELLED);
    });

    it('should_throw_When_notOwner', async () => {
      const attempt = { id: 'att-1', userId: 'other-user' } as ExamAttempt;
      attemptRepo.findByIdForUpdate.mockResolvedValue(attempt);
      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({ save: jest.fn() } as any),
      );

      await expect(
        service.cancelAttempt('att-1', 'user-1'),
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('list', () => {
    it('instructor thấy exam của chính mình', async () => {
      (examRepo.findByInstructor as jest.Mock).mockResolvedValue([sampleExam]);
      const res = await service.list('instructor-1', 'INSTRUCTOR');
      expect(examRepo.findByInstructor).toHaveBeenCalledWith('instructor-1');
      expect(res.data).toEqual([sampleExam]);
    });

    it('student thấy danh sách practice exam', async () => {
      (examRepo.findPractice as jest.Mock).mockResolvedValue([sampleExam]);
      const res = await service.list('student-1', 'STUDENT');
      expect(examRepo.findPractice).toHaveBeenCalled();
      expect(examRepo.findByInstructor).not.toHaveBeenCalled();
      expect(res.data).toEqual([sampleExam]);
    });
  });
});
