import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { QuestionType } from '@ioes/common-node';
import { SubmissionService } from './submission.service';
import { GradingService } from '../exam/grading.service';
import { AttemptStatus } from '../exam/entities/exam-attempt.entity';

/**
 * gradeAttempt(): quyền + chấm tay qua manualScores.
 * q1 = MCQ 2 điểm (auto), q2 = essay 3 điểm (chấm tay).
 */
describe('SubmissionService.gradeAttempt', () => {
  const questions = [
    {
      id: 'q1',
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 2,
      options: [
        { id: 'o1', isCorrect: true, optionText: 'A' },
        { id: 'o2', isCorrect: false, optionText: 'B' },
      ],
    },
    { id: 'q2', questionType: QuestionType.ESSAY, points: 3, options: [] },
  ];

  let attempt: any;
  let answers: any[];
  let em: any;
  let eventsPublisher: { publishGradedInTx: jest.Mock };
  let service: SubmissionService;

  beforeEach(() => {
    attempt = {
      id: 'att-1',
      examId: 'exam-1',
      userId: 'stu-1',
      status: AttemptStatus.SUBMITTED,
      questionIds: ['q1', 'q2'],
      exam: { instructorId: 'ins-1', passingScore: 50 },
    };
    answers = [
      { questionId: 'q1', selectedOptionIds: ['o1'] },
      { questionId: 'q2', answerText: 'my essay' },
    ];
    const qb: any = {
      leftJoinAndSelect: () => qb,
      where: () => qb,
      getMany: jest.fn().mockResolvedValue(questions),
    };
    em = {
      findOne: jest.fn().mockImplementation(async () => attempt),
      find: jest.fn().mockImplementation(async () => answers),
      save: jest.fn().mockImplementation(async (_entity: unknown, value: unknown) => value),
      createQueryBuilder: jest.fn(() => qb),
    };
    const dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown) => cb(em)) };
    const attemptRepo = { findByIdForUpdate: jest.fn().mockImplementation(async () => attempt) };
    eventsPublisher = { publishGradedInTx: jest.fn().mockResolvedValue(undefined) };
    service = new SubmissionService(
      dataSource as any,
      attemptRepo as any,
      {} as any,
      new GradingService(),
      eventsPublisher as any,
    );
  });

  const expectHttpStatus = async (p: Promise<unknown>, status: number) => {
    const err = await p.then(
      () => undefined,
      (e) => e,
    );
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(status);
  };

  it('should_leaveManualPending_When_noManualScores', async () => {
    const res = await service.gradeAttempt('att-1', 'ins-1', 'INSTRUCTOR', { examId: 'exam-1' });
    expect(res.data).toEqual(
      expect.objectContaining({
        score: 2,
        maxScore: 5,
        autoGradedCount: 1,
        manualGradedCount: 0,
        pendingManualCount: 1,
        finalGrading: false,
      }),
    );
    expect(attempt.status).toBe(AttemptStatus.SUBMITTED);
  });

  it('should_applyManualScores_And_finalize_When_allManualGraded', async () => {
    const res = await service.gradeAttempt('att-1', 'ins-1', 'INSTRUCTOR', {
      examId: 'exam-1',
      manualScores: { q2: { score: 2.5, feedback: 'good' } },
    });
    expect(res.data).toEqual(
      expect.objectContaining({
        score: 4.5,
        manualGradedCount: 1,
        pendingManualCount: 0,
        finalGrading: true,
      }),
    );
    expect(attempt.status).toBe(AttemptStatus.GRADED);
    expect(answers[1]).toEqual(
      expect.objectContaining({ pointsEarned: 2.5, gradingFeedback: 'good', maxPoints: 3 }),
    );
    expect(eventsPublisher.publishGradedInTx.mock.calls[0][1].breakdown).toEqual(
      expect.objectContaining({ autoGradedScore: 2, manualGradedScore: 2.5 }),
    );
  });

  it('should_keepPreviousManualGrade_When_regradedWithoutScores', async () => {
    answers[1] = { ...answers[1], pointsEarned: 1, gradedAt: new Date() };
    const res = await service.gradeAttempt('att-1', 'ins-1', 'INSTRUCTOR');
    expect(res.data).toEqual(
      expect.objectContaining({ score: 3, pendingManualCount: 0, finalGrading: true }),
    );
  });

  it('should_throw400_When_scoreAboveQuestionPoints', async () => {
    await expectHttpStatus(
      service.gradeAttempt('att-1', 'ins-1', 'INSTRUCTOR', { manualScores: { q2: { score: 4 } } }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('should_throw400_When_manualScoreForAutoGradedQuestion', async () => {
    await expectHttpStatus(
      service.gradeAttempt('att-1', 'ins-1', 'INSTRUCTOR', { manualScores: { q1: { score: 1 } } }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('should_throw400_When_questionNotInAttempt', async () => {
    await expectHttpStatus(
      service.gradeAttempt('att-1', 'ins-1', 'INSTRUCTOR', { manualScores: { qX: { score: 1 } } }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('should_throw403_When_instructorNotOwner', async () => {
    await expectHttpStatus(
      service.gradeAttempt('att-1', 'ins-2', 'INSTRUCTOR'),
      HttpStatus.FORBIDDEN,
    );
  });

  it('should_allow_When_superAdmin', async () => {
    const res = await service.gradeAttempt('att-1', 'root', 'SUPER_ADMIN');
    expect(res.success).toBe(true);
  });

  it('should_throw404_When_attemptBelongsToOtherExam', async () => {
    await expect(
      service.gradeAttempt('att-1', 'ins-1', 'INSTRUCTOR', { examId: 'exam-2' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
