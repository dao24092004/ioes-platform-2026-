import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ApiResponse,
  StructuredLogger,
} from '@ioes/common-node';
import { Exam } from './entities/exam.entity';
import { ExamAttempt, AttemptStatus } from './entities/exam-attempt.entity';
import { Question } from '../question-bank/entities/question.entity';
import { ExamRepository } from './repositories/exam.repository';
import { AttemptRepository } from './repositories/attempt.repository';
import {
  ExamNotFoundError,
  ExamDeletedError,
  MaxAttemptsReachedError,
  NoQuestionsError,
} from './errors/exam.errors';
import { ExamEventsPublisher } from '../exam-events/exam-events.publisher';

/**
 * ExamService - business logic chính cho exam flow.
 *
 * Theo BA §3.1.3 + §10.2 (Exam Flow):
 * 1. list() - danh sách exam cho student/instructor
 * 2. startExam() - tạo attempt + snapshot questions + emit ExamStarted event
 * 3. resumeExam() - lấy attempt active của user
 * 4. getAttemptForUser() - chi tiết attempt (cho client polling)
 *
 * Phase 2 (separate submission service):
 * - submitExam() - lưu answers + emit ExamSubmitted
 * - gradeAttempt() - auto-grade + emit ExamGraded
 *
 * @see docs/02-architecture/adr/ADR-004-idempotency-atomic-claim-outbox.md
 * @see docs/02-architecture/adr/ADR-006-service-integration.md
 */
@Injectable()
export class ExamService {
  private readonly logger = new StructuredLogger(ExamService.name);

  constructor(
    private readonly examRepo: ExamRepository,
    private readonly attemptRepo: AttemptRepository,
    private readonly eventsPublisher: ExamEventsPublisher,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * List exams visible cho user.
   * - Student: tất cả exams của courses đã enroll (TODO: filter qua content-service)
   * - Instructor: exams do chính họ tạo
   * - Admin: tất cả
   */
  async list(userId: string, role: string): Promise<ApiResponse<Exam[]>> {
    if (role === 'INSTRUCTOR') {
      const exams = await this.examRepo.findByInstructor(userId);
      return ApiResponse.success(exams);
    }
    // TODO: content-service enrollment check
    // Tạm thời: trả về list practice exams
    return ApiResponse.success([]);
  }

  /**
   * GET /exams/:id - lấy chi tiết exam (không bao gồm đáp án đúng).
   */
  async getById(id: string): Promise<ApiResponse<Exam>> {
    const exam = await this.examRepo.findById(id);
    if (!exam) throw new ExamNotFoundError(id);
    if (exam.deletedAt) throw new ExamDeletedError(id);
    return ApiResponse.success(exam);
  }

  /**
   * POST /exams/:id/start - bắt đầu làm bài.
   *
   * Flow:
   * 1. Validate exam (exists + not deleted)
   * 2. Check max attempts
   * 3. Check existing active attempt → return nếu có (resume)
   * 4. Lock exam (SELECT FOR UPDATE) trong transaction
   * 5. Query questions theo exam (join exam_sections → questions)
   * 6. Snapshot questions vào attempt.questionIds (immutable)
   * 7. Tạo ExamAttempt status=IN_PROGRESS
   * 8. Emit ExamStarted event (outbox, atomic)
   * 9. Return attempt
   */
  async startExam(
    examId: string,
    userId: string,
    correlationId?: string,
  ): Promise<ApiResponse<{ attempt: ExamAttempt; totalQuestions: number }>> {
    // Pre-check (no transaction) - fail-fast nếu exam invalid
    const exam = await this.examRepo.findById(examId);
    if (!exam) throw new ExamNotFoundError(examId);
    if (exam.deletedAt) throw new ExamDeletedError(examId);

    // Resume: nếu đã có active attempt → trả về
    const existing = await this.attemptRepo.findActiveByUserAndExam(
      examId,
      userId,
    );
    if (existing) {
      // Check expired - nếu quá thời gian thì auto-submit
      const isExpired =
        existing.startedAt && exam.timeLimitMinutes
          ? Date.now() - existing.startedAt.getTime() >
            exam.timeLimitMinutes * 60 * 1000
          : false;

      if (isExpired) {
        this.logger.warn(
          `Resume expired attempt: attemptId=${existing.id} userId=${userId} examId=${examId}`,
        );
        // Auto-submit expired attempt (inline, không cần consumer)
        // Note: trả về expired indicator, client phải refresh attempt status
        throw new HttpException(
          'Attempt has expired - redirect to results',
          HttpStatus.GONE,
        );
      }

      this.logger.log(
        `Resume attempt: attemptId=${existing.id} userId=${userId} examId=${examId}`,
      );
      const total = existing.questionIds?.length ?? 0;
      return ApiResponse.success({ attempt: existing, totalQuestions: total });
    }

    // Check max attempts
    if (exam.maxAttempts) {
      const completed = await this.attemptRepo.countCompletedAttempts(
        examId,
        userId,
      );
      if (completed >= exam.maxAttempts) {
        throw new MaxAttemptsReachedError(examId, userId, exam.maxAttempts);
      }
    }

    // Transactional block: lock exam + create attempt + outbox event
    const result = await this.dataSource.transaction(async (em) => {
      // Lock exam row
      const lockedExam = await this.examRepo.findByIdForUpdate(em, examId);
      if (!lockedExam) throw new ExamNotFoundError(examId);
      if (lockedExam.deletedAt) throw new ExamDeletedError(examId);

      // Query questions via repository method (trong transaction)
      const questions = await this.examRepo.findQuestionsByExamIdInTx(
        em,
        examId,
      );

      if (questions.length === 0) {
        throw new NoQuestionsError(examId);
      }

      // Randomize question order nếu isRandomized
      let questionIds = questions.map((q) => q.id);
      if (lockedExam.isRandomized) {
        questionIds = this.shuffle(questionIds);
      }

      // Tạo attempt
      const attempt = em.create(ExamAttempt, {
        examId,
        userId,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: new Date(),
        questionIds,
        maxScore: questions.reduce((sum, q) => sum + q.points, 0),
        timeRemainingSeconds: lockedExam.timeLimitMinutes
          ? lockedExam.timeLimitMinutes * 60
          : undefined,
      });

      const saved = await em.save(ExamAttempt, attempt);

      // Emit ExamStarted event - ATOMIC với attempt save
      await this.eventsPublisher.publishStartedInTx(
        em,
        {
          examId: saved.examId,
          examTitle: lockedExam.title,
          attemptId: saved.id,
          userId: saved.userId,
          startedAt: saved.startedAt!.toISOString(),
          expiresAt: this.computeExpiresAt(
            saved.startedAt!,
            lockedExam.timeLimitMinutes,
          ).toISOString(),
          durationMinutes: lockedExam.timeLimitMinutes ?? 0,
          totalQuestions: questionIds.length,
        },
        correlationId,
      );

      this.logger.log(
        `Exam started: attemptId=${saved.id} userId=${userId} examId=${examId} questions=${questionIds.length}`,
      );

      return { attempt: saved, totalQuestions: questionIds.length };
    });

    return ApiResponse.success(result);
  }

  /**
   * GET /attempts/:id - lấy attempt detail (cho client polling).
   * Trả về thông tin attempt + câu hỏi (không bao gồm đáp án đúng cho student).
   *
   * Security:
   * - Student: chỉ xem được attempt của chính mình, KHÔNG thấy isCorrect
   * - Instructor: xem được attempt của student trong exam của mình
   * - Admin: xem tất cả
   */
  async getAttemptForUser(
    attemptId: string,
    userId: string,
    userRole: string,
  ): Promise<
    ApiResponse<{
      attempt: ExamAttempt;
      questions: Question[];
      /** True nếu response bao gồm isCorrect (instructor/admin) */
      includeCorrectAnswers: boolean;
    }>
  > {
    const attempt = await this.attemptRepo.findByIdWithExam(attemptId);
    if (!attempt) {
      throw new HttpException('Attempt not found', HttpStatus.NOT_FOUND);
    }

    const isOwner = attempt.userId === userId;
    const isAdmin = userRole === 'ADMIN';

    // Instructor: chỉ xem nếu attempt.exam.instructorId === userId
    let isInstructorOfExam = false;
    if (userRole === 'INSTRUCTOR' && attempt.exam) {
      isInstructorOfExam = attempt.exam.instructorId === userId;
    }

    if (!isOwner && !isAdmin && !isInstructorOfExam) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    // Student xem attempt của mình → KHÔNG trả isCorrect
    // Instructor/Admin xem attempt của student → CÓ trả isCorrect
    const includeCorrectAnswers = !isOwner || isAdmin || isInstructorOfExam;

    const questions = attempt.questionIds?.length
      ? await this.dataSource.manager
          .createQueryBuilder(Question, 'q')
          .leftJoinAndSelect('q.options', 'o')
          .where('q.id IN (:...ids)', { ids: attempt.questionIds })
          .getMany()
      : [];

    // Preserve attempt's question order (randomized)
    const ordered = attempt.questionIds
      ? (attempt.questionIds
          .map((id) => questions.find((q) => q.id === id))
          .filter(Boolean) as Question[])
      : questions;

    // SECURITY: strip isCorrect khỏi options nếu student xem attempt của mình
    if (!includeCorrectAnswers) {
      for (const q of ordered) {
        if (q.options) {
          q.options = (q.options.map((o) => ({
            ...o,
            isCorrect: undefined,
          })) as unknown) as typeof q.options;
        }
      }
    }

    return ApiResponse.success({
      attempt,
      questions: ordered,
      includeCorrectAnswers,
    });
  }

  /**
   * GET /attempts - list attempts của user hiện tại.
   */
  async listAttemptsByUser(userId: string): Promise<ApiResponse<ExamAttempt[]>> {
    const attempts = await this.dataSource.manager.find(ExamAttempt, {
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return ApiResponse.success(attempts);
  }

  /**
   * Cancel attempt - student chủ động huỷ (chỉ trước khi submit).
   */
  async cancelAttempt(attemptId: string, userId: string): Promise<ApiResponse<ExamAttempt>> {
    return this.dataSource.transaction(async (em) => {
      const attempt = await this.attemptRepo.findByIdForUpdate(em, attemptId);
      if (!attempt) {
        throw new HttpException('Attempt not found', HttpStatus.NOT_FOUND);
      }
      if (attempt.userId !== userId) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
      if (!attempt.isActive()) {
        throw new HttpException(
          `Cannot cancel attempt in status=${attempt.status}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      attempt.status = AttemptStatus.CANCELLED;
      return ApiResponse.success(await em.save(ExamAttempt, attempt));
    });
  }

  private computeExpiresAt(startedAt: Date, minutes?: number): Date {
    if (!minutes) {
      // No time limit - use far future
      const d = new Date(startedAt);
      d.setFullYear(d.getFullYear() + 1);
      return d;
    }
    const d = new Date(startedAt);
    d.setMinutes(d.getMinutes() + minutes);
    return d;
  }

  private shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
