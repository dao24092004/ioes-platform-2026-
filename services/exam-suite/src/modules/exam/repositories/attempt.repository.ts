import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ExamAttempt, AttemptStatus } from '../entities/exam-attempt.entity';
import { Answer } from '../entities/answer.entity';

/** Số liệu tổng hợp của một exam, dùng cho bảng admin oversight. */
export interface ExamAttemptAggregate {
  examId: string;
  participants: number;
  gradedAttempts: number;
  avgScore: number | null;
}

/** Số liệu toàn nền tảng cho ô thống kê ở trang admin. */
export interface PlatformAttemptStats {
  totalAttempts: number;
  inProgress: number;
  submitted: number;
  graded: number;
  passed: number;
  avgScore: number | null;
}

/** Số liệu hàng đợi chấm bài. */
export interface GradingQueueStats {
  pending: number;
  graded: number;
  oldestPendingSubmittedAt: Date | null;
}

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
   * Số người dự thi và điểm trung bình của từng exam.
   *
   * `participants` đếm số user khác nhau đã từng có attempt, không phải số
   * attempt — một người thi lại ba lần vẫn là một người. `avgScore` chỉ tính
   * trên attempt đã chấm, nên đề chưa ai thi xong trả về null thay vì 0 (0 là
   * một điểm số thật, null nghĩa là chưa có gì để trung bình).
   */
  async aggregateByExam(examIds: string[]): Promise<ExamAttemptAggregate[]> {
    if (examIds.length === 0) {
      return [];
    }

    const rows = await this.repo
      .createQueryBuilder('a')
      .select('a.exam_id', 'examId')
      .addSelect('COUNT(DISTINCT a.user_id)', 'participants')
      .addSelect(
        `COUNT(*) FILTER (WHERE a.status = :graded)`,
        'gradedAttempts',
      )
      .addSelect(
        `AVG(a.percentage_score) FILTER (WHERE a.status = :graded)`,
        'avgScore',
      )
      .where('a.exam_id IN (:...examIds)', { examIds })
      .setParameter('graded', AttemptStatus.GRADED)
      .groupBy('a.exam_id')
      .getRawMany<{
        examId: string;
        participants: string;
        gradedAttempts: string;
        avgScore: string | null;
      }>();

    return rows.map((row) => ({
      examId: row.examId,
      participants: Number(row.participants),
      gradedAttempts: Number(row.gradedAttempts),
      avgScore: row.avgScore === null ? null : Number(row.avgScore),
    }));
  }

  /**
   * Đếm attempt theo trạng thái trên toàn nền tảng, cộng điểm trung bình và
   * số lượt đạt. Một truy vấn duy nhất thay vì một COUNT cho mỗi ô.
   */
  async platformAttemptStats(): Promise<PlatformAttemptStats> {
    const row = await this.repo
      .createQueryBuilder('a')
      .select('COUNT(*)', 'totalAttempts')
      .addSelect(`COUNT(*) FILTER (WHERE a.status = :inProgress)`, 'inProgress')
      .addSelect(`COUNT(*) FILTER (WHERE a.status = :submitted)`, 'submitted')
      .addSelect(`COUNT(*) FILTER (WHERE a.status = :graded)`, 'graded')
      .addSelect(`COUNT(*) FILTER (WHERE a.passed IS TRUE)`, 'passed')
      .addSelect(
        `AVG(a.percentage_score) FILTER (WHERE a.status = :graded)`,
        'avgScore',
      )
      .setParameters({
        inProgress: AttemptStatus.IN_PROGRESS,
        submitted: AttemptStatus.SUBMITTED,
        graded: AttemptStatus.GRADED,
      })
      .getRawOne<{
        totalAttempts: string;
        inProgress: string;
        submitted: string;
        graded: string;
        passed: string;
        avgScore: string | null;
      }>();

    if (!row) {
      return {
        totalAttempts: 0,
        inProgress: 0,
        submitted: 0,
        graded: 0,
        passed: 0,
        avgScore: null,
      };
    }

    return {
      totalAttempts: Number(row.totalAttempts),
      inProgress: Number(row.inProgress),
      submitted: Number(row.submitted),
      graded: Number(row.graded),
      passed: Number(row.passed),
      avgScore: row.avgScore === null ? null : Number(row.avgScore),
    };
  }

  /**
   * Hàng đợi chấm bài: attempt đã nộp nhưng chưa chấm, cũ nhất trước.
   *
   * Xếp theo `submittedAt` tăng dần để bài chờ lâu nhất được chấm trước.
   *
   * `instructorId` bắt buộc phải truyền khi người gọi là giảng viên: hàng đợi
   * này hiển thị trên trang chấm bài của giảng viên, mà bài nộp cho đề của
   * người khác thì họ không được thấy. Bỏ trống chỉ dành cho admin.
   */
  findGradingQueue(limit = 50, instructorId?: string): Promise<ExamAttempt[]> {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.status = :submitted', { submitted: AttemptStatus.SUBMITTED })
      .orderBy('a.submitted_at', 'ASC')
      .take(limit);

    if (instructorId) {
      qb.innerJoin('exams', 'e', 'e.id = a.exam_id').andWhere(
        'e.instructor_id = :instructorId',
        { instructorId },
      );
    }

    return qb.getMany();
  }

  /**
   * Đếm bài chờ chấm, bài đã chấm, và thời điểm nộp của bài chờ lâu nhất.
   *
   * Nhận cùng phạm vi giảng viên như {@link findGradingQueue}, để con số trên
   * đầu trang khớp với danh sách bên dưới thay vì đếm cả nền tảng.
   */
  async gradingQueueStats(instructorId?: string): Promise<GradingQueueStats> {
    const qb = this.repo
      .createQueryBuilder('a')
      .select(`COUNT(*) FILTER (WHERE a.status = :submitted)`, 'pending')
      .addSelect(`COUNT(*) FILTER (WHERE a.status = :graded)`, 'graded')
      .addSelect(
        `MIN(a.submitted_at) FILTER (WHERE a.status = :submitted)`,
        'oldestPendingSubmittedAt',
      )
      .setParameters({
        submitted: AttemptStatus.SUBMITTED,
        graded: AttemptStatus.GRADED,
      });

    if (instructorId) {
      qb.innerJoin('exams', 'e', 'e.id = a.exam_id').andWhere(
        'e.instructor_id = :instructorId',
        { instructorId },
      );
    }

    const row = await qb.getRawOne<{
      pending: string;
      graded: string;
      oldestPendingSubmittedAt: Date | null;
    }>();

    if (!row) {
      return { pending: 0, graded: 0, oldestPendingSubmittedAt: null };
    }

    return {
      pending: Number(row.pending),
      graded: Number(row.graded),
      oldestPendingSubmittedAt: row.oldestPendingSubmittedAt ?? null,
    };
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
