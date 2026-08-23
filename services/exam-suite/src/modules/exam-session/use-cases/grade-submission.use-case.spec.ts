import { GradeSubmissionUseCase } from './grade-submission.use-case';

/**
 * Unit tests cho GradeSubmissionUseCase.
 *
 * Phase 1 chỉ grade MCQ (multi-choice). Coding/Essay skip.
 *
 * Convention: should_X_When_Y
 */
describe('GradeSubmissionUseCase', () => {
  let useCase: GradeSubmissionUseCase;
  let repository: any;
  let kafkaPublisher: any;
  let contentClient: any;

  const MOCK_SUBMISSION = {
    id: 'sub-1',
    attemptId: 'attempt-1',
    answers: {
      q1: 'A',
      q2: ['X', 'Y'],
    },
  };

  const MOCK_ATTEMPT = {
    id: 'attempt-1',
    examId: 'exam-1',
    userId: 'user-1',
    flag: false,
    submissionKind: 'MANUAL',
  };

  const MOCK_QUESTIONS = [
    { id: 'q1', type: 'MCQ', points: 5, correctAnswers: 'A' },
    { id: 'q2', type: 'MCQ', points: 5, correctAnswers: ['X', 'Y'] },
  ];

  beforeEach(() => {
    repository = {
      findSubmissionByAttempt: jest.fn(),
      findAttemptById: jest.fn(),
      updateSubmissionGrading: jest.fn(),
      updateAttemptScore: jest.fn(),
    };
    kafkaPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    contentClient = {
      getQuestionsForExam: jest.fn(),
    };
    useCase = new GradeSubmissionUseCase(repository, kafkaPublisher, contentClient);
  });

  it('should_gradeFullScore_When_allAnswersCorrect', async () => {
    repository.findSubmissionByAttempt.mockResolvedValue(MOCK_SUBMISSION);
    repository.findAttemptById.mockResolvedValue(MOCK_ATTEMPT);
    contentClient.getQuestionsForExam.mockResolvedValue(MOCK_QUESTIONS);
    repository.updateSubmissionGrading.mockResolvedValue(undefined);
    repository.updateAttemptScore.mockResolvedValue(undefined);

    const result = await useCase.execute('attempt-1');

    expect(result.score).toBe(10);
    expect(result.maxScore).toBe(10);
    expect(result.breakdown).toHaveLength(2);
    expect(result.breakdown[0]).toEqual({ questionId: 'q1', correct: true, points: 5 });
    expect(result.breakdown[1]).toEqual({ questionId: 'q2', correct: true, points: 5 });
  });

  it('should_gradeZero_When_allAnswersWrong', async () => {
    repository.findSubmissionByAttempt.mockResolvedValue({
      ...MOCK_SUBMISSION,
      answers: { q1: 'B', q2: ['Z'] },
    });
    repository.findAttemptById.mockResolvedValue(MOCK_ATTEMPT);
    contentClient.getQuestionsForExam.mockResolvedValue(MOCK_QUESTIONS);

    const result = await useCase.execute('attempt-1');

    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(10);
    expect(result.breakdown.every((b) => !b.correct)).toBe(true);
  });

  it('should_gradePartialScore_When_someAnswersCorrect', async () => {
    repository.findSubmissionByAttempt.mockResolvedValue({
      ...MOCK_SUBMISSION,
      answers: { q1: 'A', q2: ['Z'] }, // q1 đúng, q2 sai
    });
    repository.findAttemptById.mockResolvedValue(MOCK_ATTEMPT);
    contentClient.getQuestionsForExam.mockResolvedValue(MOCK_QUESTIONS);

    const result = await useCase.execute('attempt-1');

    expect(result.score).toBe(5);
    expect(result.maxScore).toBe(10);
  });

  it('should_gradeMultiChoiceBySet_When_orderDiffers', async () => {
    // MCQ đa: ['X', 'Y'] vs answer ['Y', 'X'] → đúng (set compare)
    repository.findSubmissionByAttempt.mockResolvedValue({
      ...MOCK_SUBMISSION,
      answers: { q1: 'A', q2: ['Y', 'X'] },
    });
    repository.findAttemptById.mockResolvedValue(MOCK_ATTEMPT);
    contentClient.getQuestionsForExam.mockResolvedValue(MOCK_QUESTIONS);

    const result = await useCase.execute('attempt-1');

    expect(result.score).toBe(10); // cả 2 đúng
  });

  it('should_gradeMultiChoiceFalse_When_incompleteSelection', async () => {
    // MCQ đa: ['X', 'Y'] vs answer ['X'] → sai (thiếu Y)
    repository.findSubmissionByAttempt.mockResolvedValue({
      ...MOCK_SUBMISSION,
      answers: { q1: 'A', q2: ['X'] },
    });
    repository.findAttemptById.mockResolvedValue(MOCK_ATTEMPT);
    contentClient.getQuestionsForExam.mockResolvedValue(MOCK_QUESTIONS);

    const result = await useCase.execute('attempt-1');

    expect(result.score).toBe(5); // chỉ q1 đúng
  });

  it('should_skipCodingAndEssay_When_grading', async () => {
    repository.findSubmissionByAttempt.mockResolvedValue(MOCK_SUBMISSION);
    repository.findAttemptById.mockResolvedValue(MOCK_ATTEMPT);
    contentClient.getQuestionsForExam.mockResolvedValue([
      { id: 'q1', type: 'MCQ', points: 5, correctAnswers: 'A' },
      { id: 'q2', type: 'CODING', points: 10 }, // no correctAnswers
      { id: 'q3', type: 'ESSAY', points: 5 }, // no correctAnswers
    ]);

    const result = await useCase.execute('attempt-1');

    expect(result.score).toBe(5); // chỉ MCQ
    expect(result.maxScore).toBe(20); // MCQ + CODING + ESSAY
    expect(result.breakdown[1]).toEqual({ questionId: 'q2', correct: false, points: 0 });
    expect(result.breakdown[2]).toEqual({ questionId: 'q3', correct: false, points: 0 });
  });

  it('should_throw_When_submissionNotFound', async () => {
    repository.findSubmissionByAttempt.mockResolvedValue(null);

    await expect(useCase.execute('attempt-1')).rejects.toThrow(/not found/);
  });

  it('should_returnZeroScore_When_noQuestions', async () => {
    repository.findSubmissionByAttempt.mockResolvedValue(MOCK_SUBMISSION);
    repository.findAttemptById.mockResolvedValue(MOCK_ATTEMPT);
    contentClient.getQuestionsForExam.mockResolvedValue([]);

    const result = await useCase.execute('attempt-1');

    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(0);
  });

  it('should_publishKafkaExamGraded_When_graded', async () => {
    repository.findSubmissionByAttempt.mockResolvedValue(MOCK_SUBMISSION);
    repository.findAttemptById.mockResolvedValue(MOCK_ATTEMPT);
    contentClient.getQuestionsForExam.mockResolvedValue(MOCK_QUESTIONS);

    await useCase.execute('attempt-1');

    expect(kafkaPublisher.publish).toHaveBeenCalledWith(
      'exam.submission.graded',
      'ExamGraded',
      expect.objectContaining({
        submissionId: 'sub-1',
        score: 10,
        maxScore: 10,
      }),
    );
  });

  it('should_persistScoreAndUpdateAttemptStatus_When_graded', async () => {
    repository.findSubmissionByAttempt.mockResolvedValue(MOCK_SUBMISSION);
    repository.findAttemptById.mockResolvedValue(MOCK_ATTEMPT);
    contentClient.getQuestionsForExam.mockResolvedValue(MOCK_QUESTIONS);

    await useCase.execute('attempt-1');

    expect(repository.updateSubmissionGrading).toHaveBeenCalledWith(
      'sub-1',
      expect.objectContaining({
        autoScore: 10,
        finalScore: 10,
        gradedAt: expect.any(Date),
      }),
    );
    expect(repository.updateAttemptScore).toHaveBeenCalledWith(
      'attempt-1',
      expect.objectContaining({
        score: 10,
        maxScore: 10,
        status: 'GRADED',
      }),
    );
  });
});