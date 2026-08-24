import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import {
  ApiResponse,
  StructuredLogger,
} from '@ioes/common-node';
import { ExamAttempt, AttemptStatus } from '../exam/entities/exam-attempt.entity';
import { Answer } from '../exam/entities/answer.entity';
import { AnswerSnapshot } from '../exam/entities/answer-snapshot.entity';
import { Question } from '../question-bank/entities/question.entity';
import { AttemptRepository } from '../exam/repositories/attempt.repository';
import { ExamRepository } from '../exam/repositories/exam.repository';
import { GradingService } from '../exam/grading.service';
import { SubmitExamDto } from '../exam/dto/submit-exam.dto';
import {
  AttemptNotFoundError,
  AttemptNotActiveError,
  NotAttemptOwnerError,
  AttemptNotInGradedStateError,
} from '../exam/errors/exam.errors';
import { ExamEventsPublisher } from '../exam-events/exam-events.publisher';

/**
 * Plain object shape cho answers trong submit payload.
 * Tránh phải import Answer entity (chỉ dùng cho create, không persist trực tiếp).
 */
type AnswerData = {
  questionId: string;
  answerText?: string;
  selectedOptionIds?: string[];
  isFlagged?: boolean;
  flaggedReason?: string;
};

/**
 * Type-safe Answer entity fields cho upsert.
 * Mirror các field trong answer.entity.ts. Dùng ở đây để tránh cascade TS
 * khi TypeORM types chưa resolve được (deps chưa install).
 */
type AnswerFields = {
  id?: string;
  attemptId: string;
  questionId: string;
  answerText?: string;
  selectedOptionIds?: string[];
  isCorrect?: boolean;
  isFlagged?: boolean;
  flaggedReason?: string;
  pointsEarned?: number;
  maxPoints?: number;
  gradedAt?: Date;
  answeredAt?: Date;
  gradingFeedback?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * SubmissionService - submit attempt + auto-grade.
 *
 * Theo BA §3.1.3 + §10.2 (Exam Flow):
 * 1. submit() - lưu answers + mark SUBMITTED + emit ExamSubmitted event
 *    Triggers async grading qua ExamSubmitted event
 *
 * 2. gradeAttempt() - auto-grade MCQ/TrueFalse/ShortAnswer + emit ExamGraded
 *    Essay/Coding cần manual grading (chờ instructor)
 *
 * @see docs/02-architecture/adr/ADR-006-service-integration.md
 */
@Injectable()
export class SubmissionService {
  private readonly logger = new StructuredLogger(SubmissionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly attemptRepo: AttemptRepository,
    private readonly examRepo: ExamRepository,
    private readonly gradingService: GradingService,
    private readonly eventsPublisher: ExamEventsPublisher,
  ) {}

  /**
   * POST /exams/:examId/submissions - submit attempt.
   *
   * Flow:
   * 1. Lock attempt với FOR UPDATE trong transaction (atomic - chống double submit)
   * 2. Verify ownership + active status
   * 3. Bulk fetch existing answers (1 query, không N+1)
   * 4. Upsert answers (Map<questionId, Answer>)
   * 5. Save snapshot via entity (không string)
   * 6. Mark attempt SUBMITTED (or EXPIRED nếu timeout)
   * 7. Emit ExamSubmitted event
   *
   * Security: ownership check inside transaction.
   */
  async submit(
    examId: string,
    userId: string,
    dto: SubmitExamDto,
    correlationId?: string,
  ): Promise<ApiResponse<{ attemptId: string; submittedAt: string; autoSubmitted: boolean }>> {
    return this.dataSource.transaction(async (em) => {
      // Lock active attempt trong transaction (atomic với mọi thay đổi sau)
      const lockedAttempt = await this.attemptRepo.findActiveByUserAndExamForUpdate(
        em,
        examId,
        userId,
      );
      if (!lockedAttempt) {
        throw new AttemptNotFoundError(
          `No active attempt for exam=${examId} user=${userId}`,
        );
      }
      if (lockedAttempt.userId !== userId) {
        throw new NotAttemptOwnerError(lockedAttempt.id, userId);
      }
      if (!lockedAttempt.isActive()) {
        throw new AttemptNotActiveError(lockedAttempt.id, lockedAttempt.status);
      }

      // Determine nếu expired - giờ > startedAt + timeLimit
      const exam = await this.examRepo.findByIdInTx(em, examId);
      const now = new Date();
      const autoSubmitted =
        dto.isAutoSubmit ||
        (exam?.timeLimitMinutes && lockedAttempt.startedAt
          ? now.getTime() - lockedAttempt.startedAt.getTime() >
            exam.timeLimitMinutes * 60 * 1000
          : false);

      // Normalize answers from DTO
      const newAnswers: AnswerData[] = this.normalizeAnswers(
        dto,
        lockedAttempt,
      );
      const questionIds = newAnswers.map((a) => a.questionId);

      // BULK fetch existing answers (1 query thay vì N+1)
      const existingAnswers: AnswerFields[] =
        questionIds.length > 0
          ? await em.find(Answer, {
              where: {
                attemptId: lockedAttempt.id,
                questionId: In(questionIds),
              },
            })
          : [];
      const existingMap = new Map<string, AnswerFields>(
        existingAnswers.map((a) => [a.questionId, a]),
      );

      // Upsert answers via em.create() (proper TypeORM factory)
      const mergedAnswers: AnswerFields[] = [];
      for (const answerData of newAnswers) {
        const existing = existingMap.get(answerData.questionId);
        if (existing) {
          existing.answerText = answerData.answerText;
          existing.selectedOptionIds = answerData.selectedOptionIds;
          existing.isFlagged = answerData.isFlagged ?? false;
          existing.flaggedReason = answerData.flaggedReason;
          existing.answeredAt = new Date();
          mergedAnswers.push(existing);
        } else {
          // Create new entity with all required fields
          const newEntity = em.create(Answer, {
            attemptId: lockedAttempt.id,
            questionId: answerData.questionId,
            answerText: answerData.answerText,
            selectedOptionIds: answerData.selectedOptionIds,
            isFlagged: answerData.isFlagged ?? false,
            flaggedReason: answerData.flaggedReason,
            answeredAt: new Date(),
          }) as AnswerFields;
          mergedAnswers.push(newEntity);
        }
      }

      // Bulk save (1 query INSERT/UPDATE cho tất cả)
      if (mergedAnswers.length > 0) {
        await em.save(Answer, mergedAnswers);
      }

      // Save snapshot via entity (audit trail)
      const snapshot = em.create(AnswerSnapshot, {
        attemptId: lockedAttempt.id,
        answers: newAnswers.map((a) => ({
          questionId: a.questionId,
          answerText: a.answerText,
          selectedOptionIds: a.selectedOptionIds,
        })),
      });
      await em.save(AnswerSnapshot, snapshot);

      // Update attempt status
      const submittedAt = new Date();
      lockedAttempt.status = autoSubmitted
        ? AttemptStatus.EXPIRED
        : AttemptStatus.SUBMITTED;
      lockedAttempt.submittedAt = submittedAt;
      lockedAttempt.timeRemainingSeconds = 0;

      const saved = await em.save(ExamAttempt, lockedAttempt);

      // Emit ExamSubmitted event (atomic với save)
      const answeredCount = newAnswers.length;
      const totalQuestions = lockedAttempt.questionIds?.length ?? 0;
      const durationSeconds = Math.floor(
        (submittedAt.getTime() -
          (lockedAttempt.startedAt?.getTime() ?? submittedAt.getTime())) /
          1000,
      );

      await this.eventsPublisher.publishSubmittedInTx(
        em,
        {
          examId: saved.examId,
          attemptId: saved.id,
          userId: saved.userId,
          submittedAt: submittedAt.toISOString(),
          autoSubmitted,
          answeredCount,
          totalQuestions,
          durationSeconds,
        },
        correlationId,
      );

      this.logger.log(
        `Exam submitted: attemptId=${saved.id} userId=${userId} examId=${examId} autoSubmitted=${autoSubmitted} answered=${answeredCount}/${totalQuestions}`,
      );

      return ApiResponse.success({
        attemptId: saved.id,
        submittedAt: submittedAt.toISOString(),
        autoSubmitted,
      });
    });
  }

  /**
   * Auto-grade attempt - chạy SAU khi submit (gọi từ consumer ExamSubmitted → ai-suite).
   *
   * Hoặc instructor trigger sync grade qua API:
   * POST /exams/:examId/submissions/:attemptId/grade
   *
   * Security:
   * - Chỉ INSTRUCTOR của exam hoặc ADMIN mới trigger được
   * - Re-grade: nếu attempt GRADED rồi, throw error
   */
  async gradeAttempt(
    attemptId: string,
    callerUserId: string,
    callerRole: string,
    correlationId?: string,
  ): Promise<ApiResponse<{
    score: number;
    maxScore: number;
    percentageScore: number;
    passed: boolean;
    autoGradedCount: number;
    manualGradedCount: number;
    finalGrading: boolean;
  }>> {
    return this.dataSource.transaction(async (em) => {
      // Load attempt với exam (no lock - check role trước)
      const attempt = await em.findOne(ExamAttempt, {
        where: { id: attemptId },
        relations: ['exam'],
      });
      if (!attempt) {
        throw new AttemptNotFoundError(attemptId);
      }

      // Authorization: chỉ instructor của exam hoặc admin
      if (callerRole !== 'ADMIN') {
        if (callerRole !== 'INSTRUCTOR') {
          throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }
        if (!attempt.exam || attempt.exam.instructorId !== callerUserId) {
          throw new HttpException(
            'You are not the instructor of this exam',
            HttpStatus.FORBIDDEN,
          );
        }
      }

      // Re-grade protection
      if (attempt.status === AttemptStatus.GRADED) {
        throw new AttemptNotInGradedStateError(attemptId, attempt.status);
      }
      if (
        attempt.status !== AttemptStatus.SUBMITTED &&
        attempt.status !== AttemptStatus.EXPIRED
      ) {
        throw new AttemptNotActiveError(attemptId, attempt.status);
      }

      // Lock attempt cho update
      const lockedAttempt = await this.attemptRepo.findByIdForUpdate(
        em,
        attemptId,
      );
      if (!lockedAttempt) {
        throw new AttemptNotFoundError(attemptId);
      }

      // Load questions + answers
      const questionIds = lockedAttempt.questionIds ?? [];
      if (questionIds.length === 0) {
        throw new HttpException('No questions to grade', HttpStatus.BAD_REQUEST);
      }

      const questions = await em
        .createQueryBuilder(Question, 'q')
        .leftJoinAndSelect('q.options', 'o')
        .where('q.id IN (:...ids)', { ids: questionIds })
        .getMany();

      // Preserve attempt's order (may be randomized)
      const orderedQuestions = questionIds
        .map((id) => questions.find((q) => q.id === id))
        .filter(Boolean) as Question[];

      // BULK fetch answers (1 query)
      const answers: Answer[] =
        questionIds.length > 0
          ? await em.find(Answer, {
              where: {
                attemptId: lockedAttempt.id,
                questionId: In(questionIds),
              },
            })
          : [];
      const answerMap = new Map<string, Answer>(
        answers.map((a) => [a.questionId, a]),
      );

      // Grade each answer
      let autoGradedScore = 0;
      let manualGradedCount = 0;
      let autoGradedCount = 0;
      const answersToUpdate: Answer[] = [];

      for (const q of orderedQuestions) {
        const answer = answerMap.get(q.id);
        const result = this.gradingService.autoGrade(q, {
          answerText: answer?.answerText,
          selectedOptionIds: answer?.selectedOptionIds,
        });

        if (answer) {
          if (!result.requiresManual) {
            answer.isCorrect = result.isCorrect ?? undefined;
            answer.pointsEarned = result.pointsEarned ?? 0;
            answer.maxPoints = q.points;
            answer.gradedAt = new Date();
            answer.gradingFeedback = result.feedback;
            answersToUpdate.push(answer);

            autoGradedScore += result.pointsEarned ?? 0;
            autoGradedCount++;
          } else {
            // Manual grade required - reset maxPoints cho instructor
            answer.maxPoints = q.points;
            answer.gradedAt = undefined;
            answersToUpdate.push(answer);
            manualGradedCount++;
          }
        }
      }

      // BULK save answers
      if (answersToUpdate.length > 0) {
        await em.save(Answer, answersToUpdate);
      }

      const maxScore = orderedQuestions.reduce(
        (sum, q) => sum + q.points,
        0,
      );
      const totalScore = autoGradedScore; // manual chưa chấm
      const passingScore = attempt.exam?.passingScore ?? 0;
      const percentageScore =
        maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      // Determine if final grading (no manual pending)
      const finalGrading = manualGradedCount === 0;

      // Update attempt
      lockedAttempt.score = totalScore;
      lockedAttempt.maxScore = maxScore;
      lockedAttempt.percentageScore = percentageScore;
      lockedAttempt.passed = percentageScore >= passingScore;

      if (finalGrading) {
        lockedAttempt.status = AttemptStatus.GRADED;
        lockedAttempt.gradedAt = new Date();
      }

      const saved = await em.save(ExamAttempt, lockedAttempt);

      // Emit ExamGraded event (atomic với save)
      await this.eventsPublisher.publishGradedInTx(
        em,
        {
          examId: saved.examId,
          attemptId: saved.id,
          userId: saved.userId,
          gradedAt: new Date().toISOString(),
          score: Number(saved.score ?? 0),
          passed: Boolean(saved.passed),
          breakdown: {
            autoGradedScore,
            manualGradedScore: 0,
            autoGradedCount,
            manualGradedCount,
          },
          finalGrading,
        },
        correlationId,
      );

      this.logger.log(
        `Exam graded: attemptId=${saved.id} score=${saved.score}/${saved.maxScore} passed=${saved.passed} final=${finalGrading}`,
      );

      return ApiResponse.success({
        score: Number(saved.score ?? 0),
        maxScore: Number(saved.maxScore ?? 0),
        percentageScore: Number(saved.percentageScore ?? 0),
        passed: Boolean(saved.passed),
        autoGradedCount,
        manualGradedCount,
        finalGrading,
      });
    });
  }

  /**
   * Normalize SubmitExamDto.answers → AnswerData[].
   * Returns plain objects (not entities) for upsert logic.
   */
  private normalizeAnswers(
    dto: SubmitExamDto,
    attempt: ExamAttempt,
  ): AnswerData[] {
    const validQuestionIds = new Set(attempt.questionIds ?? []);
    const result: AnswerData[] = [];

    // Handle answers[] (preferred shape)
    if (dto.answers && dto.answers.length > 0) {
      for (const a of dto.answers) {
        if (!validQuestionIds.has(a.questionId)) continue;
        result.push({
          questionId: a.questionId,
          answerText: a.answerText,
          selectedOptionIds: a.selectedOptionIds,
          isFlagged: !!a.flaggedReason,
          flaggedReason: a.flaggedReason,
        });
      }
      return result;
    }

    // Handle rawAnswers (map shape from client)
    if (dto.rawAnswers) {
      for (const [questionId, value] of Object.entries(dto.rawAnswers)) {
        if (!validQuestionIds.has(questionId)) continue;
        const parsed = this.parseRawAnswer(value);
        result.push({
          questionId,
          answerText: parsed.answerText,
          selectedOptionIds: parsed.selectedOptionIds,
        });
      }
    }

    return result;
  }

  /**
   * Parse raw answer value (could be string, object, array).
   */
  private parseRawAnswer(value: unknown): {
    answerText?: string;
    selectedOptionIds?: string[];
  } {
    if (typeof value === 'string') {
      return { answerText: value };
    }
    if (Array.isArray(value)) {
      return { selectedOptionIds: value as string[] };
    }
    if (typeof value === 'object' && value !== null) {
      const obj = value as { answerText?: string; selectedOptionIds?: string[] };
      return {
        answerText: obj.answerText,
        selectedOptionIds: obj.selectedOptionIds,
      };
    }
    return {};
  }
}
