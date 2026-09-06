import { GradingService } from './grading.service';
import { Question, QuestionOption } from '../question-bank/entities/question.entity';
import { QuestionType, Difficulty } from '@ioes/common-node';

/**
 * Helper tạo Question với options cho test.
 */
function makeQuestion(
  type: QuestionType,
  options: Array<{ id: string; isCorrect: boolean; optionText?: string }>,
  extra: Partial<Question> = {},
): Question {
  const q = new Question();
  q.id = 'q1';
  q.questionType = type;
  q.questionText = 'Test question';
  q.difficulty = Difficulty.MEDIUM;
  q.points = 10;
  q.explanation = undefined;
  q.options = options.map(
    (o) =>
      Object.assign(new QuestionOption(), {
        id: o.id,
        questionId: 'q1',
        isCorrect: o.isCorrect,
        optionText: o.optionText ?? `Option ${o.id}`,
        sortOrder: 0,
      }),
  );
  Object.assign(q, extra);
  return q;
}

describe('GradingService - Auto-grade', () => {
  let service: GradingService;

  beforeEach(() => {
    service = new GradingService();
  });

  describe('MCQ (MULTIPLE_CHOICE)', () => {
    it('should_gradeCorrect_When_correctOptionSelected', () => {
      const q = makeQuestion(QuestionType.MULTIPLE_CHOICE, [
        { id: 'opt1', isCorrect: false },
        { id: 'opt2', isCorrect: true },
      ]);

      const result = service.autoGrade(q, { selectedOptionIds: ['opt2'] });

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(10);
      expect(result.requiresManual).toBe(false);
    });

    it('should_gradeIncorrect_When_wrongOptionSelected', () => {
      const q = makeQuestion(QuestionType.MULTIPLE_CHOICE, [
        { id: 'opt1', isCorrect: false },
        { id: 'opt2', isCorrect: true },
      ]);

      const result = service.autoGrade(q, { selectedOptionIds: ['opt1'] });

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });

    it('should_gradeIncorrect_When_noSelection', () => {
      const q = makeQuestion(QuestionType.MULTIPLE_CHOICE, [
        { id: 'opt1', isCorrect: false },
        { id: 'opt2', isCorrect: true },
      ]);

      const result = service.autoGrade(q, {});

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });
  });

  describe('MultiSelect (MULTIPLE_SELECT)', () => {
    it('should_gradeCorrect_When_allCorrectOptionsSelected', () => {
      const q = makeQuestion(QuestionType.MULTIPLE_SELECT, [
        { id: 'a', isCorrect: true },
        { id: 'b', isCorrect: true },
        { id: 'c', isCorrect: false },
      ]);

      const result = service.autoGrade(q, { selectedOptionIds: ['a', 'b'] });

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(10);
    });

    it('should_gradeIncorrect_When_missingOne', () => {
      const q = makeQuestion(QuestionType.MULTIPLE_SELECT, [
        { id: 'a', isCorrect: true },
        { id: 'b', isCorrect: true },
        { id: 'c', isCorrect: false },
      ]);

      const result = service.autoGrade(q, { selectedOptionIds: ['a'] });

      expect(result.isCorrect).toBe(false);
    });

    it('should_gradeIncorrect_When_extraSelected', () => {
      const q = makeQuestion(QuestionType.MULTIPLE_SELECT, [
        { id: 'a', isCorrect: true },
        { id: 'c', isCorrect: false },
      ]);

      const result = service.autoGrade(q, { selectedOptionIds: ['a', 'c'] });

      expect(result.isCorrect).toBe(false);
    });

    it('should_gradeCorrect_When_orderDiffers', () => {
      const q = makeQuestion(QuestionType.MULTIPLE_SELECT, [
        { id: 'a', isCorrect: true },
        { id: 'b', isCorrect: true },
      ]);

      const result = service.autoGrade(q, { selectedOptionIds: ['b', 'a'] });

      expect(result.isCorrect).toBe(true);
    });
  });

  describe('True/False', () => {
    it('should_gradeCorrect_When_answerTrue', () => {
      const q = makeQuestion(QuestionType.TRUE_FALSE, [
        { id: 't', isCorrect: true, optionText: 'True' },
        { id: 'f', isCorrect: false, optionText: 'False' },
      ]);

      const result = service.autoGrade(q, { answerText: 'true' });

      expect(result.isCorrect).toBe(true);
    });

    it('should_gradeCorrect_When_viAnswer', () => {
      const q = makeQuestion(QuestionType.TRUE_FALSE, [
        { id: 'd', isCorrect: true, optionText: 'Đúng' },
        { id: 's', isCorrect: false, optionText: 'Sai' },
      ]);

      const result = service.autoGrade(q, { answerText: 'Đúng' });

      expect(result.isCorrect).toBe(true);
    });

    it('should_gradeIncorrect_When_wrongValue', () => {
      const q = makeQuestion(QuestionType.TRUE_FALSE, [
        { id: 't', isCorrect: true, optionText: 'True' },
        { id: 'f', isCorrect: false, optionText: 'False' },
      ]);

      const result = service.autoGrade(q, { answerText: 'false' });

      expect(result.isCorrect).toBe(false);
    });
  });

  describe('ShortAnswer', () => {
    it('should_gradeCorrect_When_matchesAcceptedAnswer', () => {
      const q = makeQuestion(QuestionType.SHORT_ANSWER, [], {
        explanation: JSON.stringify({ correctAnswers: ['Paris', 'paris'] }),
      });

      const result = service.autoGrade(q, { answerText: 'PARIS' });

      expect(result.isCorrect).toBe(true);
    });

    it('should_gradeIncorrect_When_noMatch', () => {
      const q = makeQuestion(QuestionType.SHORT_ANSWER, [], {
        explanation: JSON.stringify({ correctAnswers: ['Paris'] }),
      });

      const result = service.autoGrade(q, { answerText: 'London' });

      expect(result.isCorrect).toBe(false);
    });

    it('should_requireManual_When_noAcceptedAnswers', () => {
      const q = makeQuestion(QuestionType.SHORT_ANSWER, [], {
        explanation: undefined,
      });

      const result = service.autoGrade(q, { answerText: 'Paris' });

      expect(result.requiresManual).toBe(true);
    });
  });

  describe('Manual grading', () => {
    it('should_requireManual_When_essay', () => {
      const q = makeQuestion(QuestionType.ESSAY, []);

      const result = service.autoGrade(q, { answerText: 'Long essay...' });

      expect(result.requiresManual).toBe(true);
      expect(result.isCorrect).toBe(null);
    });

    it('should_requireManual_When_coding', () => {
      const q = makeQuestion(QuestionType.CODING, []);

      const result = service.autoGrade(q, { answerText: 'console.log()' });

      expect(result.requiresManual).toBe(true);
    });
  });

  describe('summarize()', () => {
    it('should_calculateCorrectTotals_When_mixAutoAndManual', () => {
      const mcq = makeQuestion(QuestionType.MULTIPLE_CHOICE, [
        { id: 'a', isCorrect: true },
      ]);
      const essay = makeQuestion(QuestionType.ESSAY, []);

      const grades = [
        { question: mcq, result: service.autoGrade(mcq, { selectedOptionIds: ['a'] }) },
        { question: essay, result: service.autoGrade(essay, { answerText: 'x' }) },
      ];

      const summary = service.summarize(grades);

      expect(summary.autoGradedCount).toBe(1);
      expect(summary.manualGradedCount).toBe(1);
      expect(summary.autoGradedScore).toBe(10);
      expect(summary.maxScore).toBe(20);
    });
  });
});
