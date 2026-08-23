import { Injectable, Logger } from '@nestjs/common';
import { ExamSessionRepository } from '../exam-session.repository';
import { KafkaPublisherService } from '../../../common/kafka-publisher.service';
import { KAFKA_TOPICS } from '@ioes/common-node';

export const GRADE_SUBMISSION_USE_CASE = Symbol.for('GRADE_SUBMISSION_USE_CASE');
export interface IGradeSubmissionUseCase {
  /**
   * Auto-grade 1 submission.
   * Phase 1: chỉ MCQ (multi-choice). Phase sau: + coding qua judge0 + essay qua instructor.
   */
  execute(attemptId: string): Promise<{
    submissionId: string;
    score: number;
    maxScore: number;
    breakdown: Array<{ questionId: string; correct: boolean; points: number }>;
  }>;
}

/**
 * Question metadata lấy từ content-service (qua gateway).
 */
export interface QuestionMetadata {
  id: string;
  type: 'MCQ' | 'CODING' | 'ESSAY';
  points: number;
  /**
   * Chỉ MCQ mới có correctAnswers.
   * MCQ đơn: string (1 đáp án).
   * MCQ đa: string[] (nhiều đáp án đúng).
   */
  correctAnswers?: string | string[];
}

/**
 * UseCase: Auto-grade submission (UC_008 step 15).
 *
 * Phase 1: chỉ MCQ.
 * Phase 2 (sau): + coding (gọi judge0) + essay (instructor chấm thủ công).
 *
 * Flow:
 * 1. Lấy submission (đã có answers snapshot)
 * 2. Lấy questions + correctAnswers từ content-service (qua gateway hoặc mock)
 * 3. So sánh answer vs correctAnswers, tính điểm từng câu
 * 4. Cộng điểm → autoScore + finalScore
 * 5. Update submission.autoScore, submission.finalScore, submission.gradedAt
 * 6. Update attempt.score, attempt.maxScore, attempt.status = 'GRADED'
 * 7. Publish Kafka event `EXAM_GRADED` (GradingCompleted)
 */
@Injectable()
export class GradeSubmissionUseCase implements IGradeSubmissionUseCase {
  private readonly logger = new Logger(GradeSubmissionUseCase.name);

  constructor(
    private readonly repository: ExamSessionRepository,
    private readonly kafkaPublisher: KafkaPublisherService,
    private readonly contentClient: IContentClientForGrading,
  ) {}

  async execute(attemptId: string) {
    // 1. Lấy submission + attempt
    const submission = await this.repository.findSubmissionByAttempt(attemptId);
    if (!submission) {
      throw new Error(`Submission not found for attempt ${attemptId}`);
    }
    const attempt = await this.repository.findAttemptById(attemptId);
    if (!attempt) {
      throw new Error(`Attempt not found ${attemptId}`);
    }

    // 2. Lấy questions
    const questions = await this.contentClient.getQuestionsForExam(attempt.examId);
    if (!questions || questions.length === 0) {
      this.logger.warn(`[grade-submission] no questions examId=${attempt.examId}`);
      return {
        submissionId: submission.id,
        score: 0,
        maxScore: 0,
        breakdown: [],
      };
    }

    // 3. Grade từng câu (chỉ MCQ phase 1)
    const breakdown: Array<{ questionId: string; correct: boolean; points: number }> = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const q of questions) {
      maxScore += q.points;
      const studentAnswer = submission.answers[q.id];

      if (q.type !== 'MCQ') {
        // Phase 1: skip CODING/ESSAY
        breakdown.push({ questionId: q.id, correct: false, points: 0 });
        continue;
      }

      const correct = this.isMcqCorrect(studentAnswer, q.correctAnswers);
      const points = correct ? q.points : 0;
      totalScore += points;
      breakdown.push({ questionId: q.id, correct, points });
    }

    // 4. Persist
    await this.repository.updateSubmissionGrading(submission.id, {
      autoScore: totalScore,
      finalScore: totalScore, // Phase 1: chưa có manual score
      gradedAt: new Date(),
      gradingMeta: { breakdown, maxScore },
    });
    await this.repository.updateAttemptScore(attemptId, {
      score: totalScore,
      maxScore,
      status: 'GRADED',
    });

    // 5. Publish Kafka event (GradingCompleted)
    void this.kafkaPublisher
      .publish(KAFKA_TOPICS.EXAM_GRADED, 'ExamGraded', {
        submissionId: submission.id,
        attemptId,
        examId: attempt.examId,
        userId: attempt.userId,
        score: totalScore,
        maxScore,
        flagged: attempt.flag,
        autoFlagged: attempt.submissionKind === 'AUTO_FLAG',
      })
      .catch((err) =>
        this.logger.error(`Failed to publish ExamGraded: ${err}`),
      );

    this.logger.log(
      `[grade-submission] attempt=${attemptId} score=${totalScore}/${maxScore}`,
    );

    return {
      submissionId: submission.id,
      score: totalScore,
      maxScore,
      breakdown,
    };
  }

  /**
   * So sánh answer vs correctAnswers.
   * - MCQ đơn: string === string
   * - MCQ đa: so sánh 2 set (không quan tâm thứ tự)
   */
  private isMcqCorrect(studentAnswer: unknown, correct: string | string[] | undefined): boolean {
    if (correct === undefined) return false;
    if (typeof studentAnswer !== 'string' && !Array.isArray(studentAnswer)) return false;

    if (typeof correct === 'string') {
      // Single-choice
      return typeof studentAnswer === 'string' && studentAnswer === correct;
    }

    // Multi-choice
    if (!Array.isArray(studentAnswer)) return false;
    if (studentAnswer.length !== correct.length) return false;
    const correctSet = new Set(correct);
    return studentAnswer.every((a) => correctSet.has(a));
  }
}

/**
 * Interface cho content client trong grading.
 * Tách riêng để dễ mock.
 */
export interface IContentClientForGrading {
  getQuestionsForExam(examId: string): Promise<QuestionMetadata[] | null>;
}

/**
 * Mock content client cho grading (dev).
 * Trả về 1 question MCQ đơn giản cho mọi examId.
 */
@Injectable()
export class MockGradingContentClient implements IContentClientForGrading {
  async getQuestionsForExam(examId: string): Promise<QuestionMetadata[] | null> {
    return [
      { id: 'q1', type: 'MCQ', points: 5, correctAnswers: 'A' },
        { id: 'q2', type: 'MCQ', points: 5, correctAnswers: ['X', 'Y'] },
    ];
  }
}