import { Injectable } from '@nestjs/common';
import { StructuredLogger, QuestionType } from '@ioes/common-node';
import { Question, QuestionOption } from '../question-bank/entities/question.entity';
import { Answer } from './entities/answer.entity';

/**
 * GradingService - pure logic auto-grade (không DB, không network).
 *
 * Theo BA §3.1.3 + §10.2 (Exam Flow):
 * - MULTIPLE_CHOICE: exact match selectedOptionIds với correctOptions
 * - MULTIPLE_SELECT: so sánh set (order không quan trọng)
 * - TRUE_FALSE: exact match answerText ('true' | 'false')
 * - SHORT_ANSWER: case-insensitive trim match
 * - ESSAY: chờ manual grading (return null, isCorrect=null)
 * - CODING: chờ manual grading hoặc ai-suite auto-grade (return null)
 *
 * @example
 * ```ts
 * // Trong SubmissionService.gradeAttempt():
 * const result = this.gradingService.autoGrade(question, answer);
 * if (result.isCorrect !== null) {
 *   answer.isCorrect = result.isCorrect;
 *   answer.pointsEarned = result.pointsEarned;
 * }
 * ```
 */
export interface GradingResult {
  /** null nếu cần manual grading */
  isCorrect: boolean | null;
  /** Số điểm đạt được (null nếu manual) */
  pointsEarned: number | null;
  /** Có cần manual grading không */
  requiresManual: boolean;
  /** Feedback (cho short_answer matching logic) */
  feedback?: string;
}

export interface AnswerInput {
  answerText?: string;
  selectedOptionIds?: string[];
}

@Injectable()
export class GradingService {
  private readonly logger = new StructuredLogger(GradingService.name);

  /**
   * Auto-grade 1 câu trả lời.
   *
   * @param question Question entity (PHẢI có options loaded cho MCQ/MultiSelect)
   * @param answer Answer của user
   * @returns GradingResult
   */
  autoGrade(question: Question, answer: AnswerInput): GradingResult {
    if (!question.options && this.requiresOptions(question.questionType)) {
      throw new Error(
        `Question ${question.id} (${question.questionType}) requires options but none loaded`,
      );
    }

    switch (question.questionType) {
      case QuestionType.MULTIPLE_CHOICE:
        return this.gradeMultipleChoice(question, answer);
      case QuestionType.MULTIPLE_SELECT:
        return this.gradeMultipleSelect(question, answer);
      case QuestionType.TRUE_FALSE:
        return this.gradeTrueFalse(question, answer);
      case QuestionType.SHORT_ANSWER:
        return this.gradeShortAnswer(question, answer);
      case QuestionType.ESSAY:
      case QuestionType.CODING:
      default:
        return this.requiresManual();
    }
  }

  /**
   * Grade multiple choice (1 đáp án đúng).
   * - Lấy tất cả options có isCorrect=true
   * - User chỉ được chọn đúng 1 option đúng
   */
  private gradeMultipleChoice(
    question: Question,
    answer: AnswerInput,
  ): GradingResult {
    const correctOptions =
      question.options?.filter((o) => o.isCorrect).map((o) => o.id) ?? [];
    const selectedIds = answer.selectedOptionIds ?? [];

    if (correctOptions.length !== 1) {
      this.logger.warn(
        `MCQ ${question.id} has ${correctOptions.length} correct options (expected 1) - grading as multi-select`,
      );
      return this.gradeMultipleSelect(question, answer);
    }

    const isCorrect =
      selectedIds.length === 1 && selectedIds[0] === correctOptions[0];

    return {
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      requiresManual: false,
      feedback: isCorrect ? 'Correct' : `Expected option ${correctOptions[0]}`,
    };
  }

  /**
   * Grade multiple select - so sánh SET (order không quan trọng).
   */
  private gradeMultipleSelect(
    question: Question,
    answer: AnswerInput,
  ): GradingResult {
    const correctOptions = new Set(
      question.options?.filter((o) => o.isCorrect).map((o) => o.id) ?? [],
    );
    const selectedIds = new Set(answer.selectedOptionIds ?? []);

    const isCorrect =
      correctOptions.size === selectedIds.size &&
      [...correctOptions].every((id) => selectedIds.has(id));

    return {
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      requiresManual: false,
      feedback: isCorrect
        ? 'Correct'
        : `Expected ${correctOptions.size} options, got ${selectedIds.size}`,
    };
  }

  /**
   * Grade true/false - exact match với answerText ('true' hoặc 'false').
   */
  private gradeTrueFalse(
    question: Question,
    answer: AnswerInput,
  ): GradingResult {
    const userAnswer = (answer.answerText ?? '').toLowerCase().trim();
    const correctOption = question.options?.find((o) => o.isCorrect);
    const correctValue = correctOption
      ? this.optionTextToBoolean(correctOption.optionText)
      : null;

    if (correctValue === null) {
      this.logger.warn(`TrueFalse ${question.id} has no correct option - skipping`);
      return this.requiresManual();
    }

    const userValue =
      userAnswer === 'true' || userAnswer === 't' || userAnswer === '1'
        ? true
        : userAnswer === 'false' || userAnswer === 'f' || userAnswer === '0'
          ? false
          : null;

    if (userValue === null) {
      return {
        isCorrect: false,
        pointsEarned: 0,
        requiresManual: false,
        feedback: 'Invalid true/false answer',
      };
    }

    const isCorrect = userValue === correctValue;
    return {
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      requiresManual: false,
      feedback: isCorrect
        ? 'Correct'
        : `Expected ${correctValue}, got ${userValue}`,
    };
  }

  /**
   * Grade short answer - case-insensitive, trimmed match với các accepted values.
   * Accepted values có thể là nhiều (synonyms) - lưu trong question.explanation (JSONB).
   *
   * Convention: question.explanation chứa JSON `{"correctAnswers": ["Paris", "London"]}`
   * cho short_answer questions.
   */
  private gradeShortAnswer(
    question: Question,
    answer: AnswerInput,
  ): GradingResult {
    const userAnswer = (answer.answerText ?? '').toLowerCase().trim();

    // Try parse explanation as JSON metadata
    let accepted: string[] = [];
    if (question.explanation) {
      try {
        const parsed = JSON.parse(question.explanation) as {
          correctAnswers?: string[];
        };
        accepted = parsed.correctAnswers ?? [];
      } catch {
        // Not JSON - use plain text as single accepted answer
        accepted = [question.explanation];
      }
    }

    if (accepted.length === 0) {
      this.logger.warn(
        `ShortAnswer ${question.id} has no accepted answers - manual grade required`,
      );
      return this.requiresManual();
    }

    const isCorrect = accepted.some(
      (a) => a.toLowerCase().trim() === userAnswer,
    );

    return {
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      requiresManual: false,
      feedback: isCorrect ? 'Correct' : 'Answer does not match',
    };
  }

  private requiresManual(): GradingResult {
    return {
      isCorrect: null,
      pointsEarned: null,
      requiresManual: true,
      feedback: 'Requires manual grading',
    };
  }

  private requiresOptions(type: QuestionType): boolean {
    return (
      type === QuestionType.MULTIPLE_CHOICE ||
      type === QuestionType.MULTIPLE_SELECT ||
      type === QuestionType.TRUE_FALSE
    );
  }

  /**
   * Convert optionText 'true'/'false' → boolean.
   */
  private optionTextToBoolean(text: string): boolean | null {
    const t = text.toLowerCase().trim();
    if (t === 'true' || t === 'đúng') return true;
    if (t === 'false' || t === 'sai') return false;
    return null;
  }

  /**
   * Tính tổng điểm + phân loại auto vs manual grade.
   * Dùng để build ExamGraded event payload.
   */
  summarize(
    grades: Array<{ question: Question; result: GradingResult }>,
  ): {
    autoGradedScore: number;
    manualGradedScore: number;
    autoGradedCount: number;
    manualGradedCount: number;
    totalScore: number;
    maxScore: number;
  } {
    let autoGradedScore = 0;
    let manualGradedScore = 0;
    let autoGradedCount = 0;
    let manualGradedCount = 0;
    let maxScore = 0;

    for (const { question, result } of grades) {
      maxScore += question.points;
      if (result.requiresManual) {
        manualGradedCount++;
        manualGradedScore += result.pointsEarned ?? 0;
      } else {
        autoGradedCount++;
        autoGradedScore += result.pointsEarned ?? 0;
      }
    }

    return {
      autoGradedScore,
      manualGradedScore,
      autoGradedCount,
      manualGradedCount,
      totalScore: autoGradedScore + manualGradedScore,
      maxScore,
    };
  }
}
