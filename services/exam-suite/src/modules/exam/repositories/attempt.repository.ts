import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ExamAttempt, AttemptStatus } from '../entities/exam-attempt.entity';
import { Answer } from '../entities/answer.entity';

/**
 * Custom repository cho ExamAttempt + Answer.
 * - Tách logic query phức tạp (resume, max attempts, active lookup)
 * - Hỗ trợ pessimistic locking khi cần
 */
@Injectable()
export class AttemptRepository {
  constructor(
    @InjectRepository(ExamAttempt)
    private readonly repo: Repository<ExamAttempt>,
    @InjectRepository(Answer)
    private readonly answerRepo: Repository<Answer>,
  ) {}

  /**
   * Tìm active attempt của user cho exam (status IN ('not_started', 'in_progress')).
   * Dùng cho resume logic.
   */
  findActiveByUserAndExam(
    examId: string,
    userId: string,
  ): Promise<ExamAttempt | null> {
    return this.repo
      .createQueryBuilder('a')
      .where('a.examId = :examId', { examId })
      .andWhere('a.userId = :userId', { userId })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [AttemptStatus.NOT_STARTED, AttemptStatus.IN_PROGRESS],
      })
      .getOne();
  }

  /**
   * Tìm active attempt với pessimistic write lock - dùng trong transaction submit().
   * Tránh TOCTOU race condition.
   */
  async findActiveByUserAndExamForUpdate(
    em: EntityManager,
    examId: string,
    userId: string,
  ): Promise<ExamAttempt | null> {
    return em
      .createQueryBuilder(ExamAttempt, 'a')
      .setLock('pessimistic_write')
      .where('a.examId = :examId', { examId })
      .andWhere('a.userId = :userId', { userId })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [AttemptStatus.NOT_STARTED, AttemptStatus.IN_PROGRESS],
      })
      .getOne();
  }

  /**
   * Tìm attempts expired (cho cron job auto-submit).
   */
  findExpiredActiveAttempts(now: Date, limit = 100): Promise<ExamAttempt[]> {
    return this.repo
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.exam', 'e')
      .where('a.status = :status', { status: AttemptStatus.IN_PROGRESS })
      .andWhere('a.startedAt IS NOT NULL')
      .andWhere('e.timeLimitMinutes IS NOT NULL')
      .andWhere(
        "(a.startedAt + (e.timeLimitMinutes || ' minutes')::interval) <= :now",
        { now },
      )
      .take(limit)
      .getMany();
  }

  /**
   * Đếm số attempts đã SUBMITTED+ (history, bao gồm cả EXPIRED).
   * Dùng check maxAttempts.
   */
  countCompletedAttempts(examId: string, userId: string): Promise<number> {
    return this.repo
      .createQueryBuilder('a')
      .where('a.examId = :examId', { examId })
      .andWhere('a.userId = :userId', { userId })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [
          AttemptStatus.SUBMITTED,
          AttemptStatus.GRADED,
          AttemptStatus.EXPIRED,
        ],
      })
      .getCount();
  }

  /**
   * Find by ID với eager load exam (cần timeLimitMinutes).
   */
  findByIdWithExam(id: string): Promise<ExamAttempt | null> {
    return this.repo.findOne({ where: { id }, relations: ['exam'] });
  }

  /**
   * Find by ID với pessimistic write lock (trong transaction).
   */
  async findByIdForUpdate(
    em: EntityManager,
    id: string,
  ): Promise<ExamAttempt | null> {
    return em
      .createQueryBuilder(ExamAttempt, 'a')
      .setLock('pessimistic_write')
      .where('a.id = :id', { id })
      .getOne();
  }

  /**
   * Tìm answers của attempt (eager load).
   */
  findAnswersByAttempt(attemptId: string): Promise<Answer[]> {
    return this.answerRepo.find({ where: { attemptId } });
  }

  /**
   * Lưu attempt trong transaction.
   */
  saveAttempt(em: EntityManager, attempt: ExamAttempt): Promise<ExamAttempt> {
    return em.save(ExamAttempt, attempt);
  }

  /**
   * Lưu answer trong transaction (upsert).
   */
  saveAnswer(em: EntityManager, answer: Answer): Promise<Answer> {
    return em.save(Answer, answer);
  }

  /**
   * Bulk save answers trong transaction (tránh N+1 query).
   * Dùng cho submit() - save nhiều answers cùng lúc.
   */
  saveAnswers(em: EntityManager, answers: Answer[]): Promise<Answer[]> {
    return em.save(Answer, answers);
  }

  /**
   * Bulk find answers by (attemptId, questionId[]) - tránh N+1 query.
   */
  async findAnswersForQuestions(
    attemptId: string,
    questionIds: string[],
  ): Promise<Answer[]> {
    if (questionIds.length === 0) return [];
    return this.answerRepo
      .createQueryBuilder('a')
      .where('a.attemptId = :attemptId', { attemptId })
      .andWhere('a.questionId IN (:...questionIds)', { questionIds })
      .getMany();
  }
}
