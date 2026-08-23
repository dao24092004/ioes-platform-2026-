import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, LessThan, Repository } from 'typeorm';
import { ExamAttemptEntity } from './entities/exam-attempt.entity';
import { AnswerDraftEntity } from './entities/answer-draft.entity';
import { SubmissionEntity } from './entities/submission.entity';

/**
 * Repository cho `exam-session` module.
 *
 * Tất cả thao tác DB phải đi qua đây — domain/use-case không được
 * inject trực tiếp TypeORM Repository (tuân thủ Hexagonal-ish style).
 *
 * Mỗi method là pure data-access, không có business logic.
 * Business logic thuộc về use-case layer.
 */
@Injectable()
export class ExamSessionRepository {
  constructor(
    @InjectRepository(ExamAttemptEntity)
    private readonly attemptRepo: Repository<ExamAttemptEntity>,
    @InjectRepository(AnswerDraftEntity)
    private readonly draftRepo: Repository<AnswerDraftEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo: Repository<SubmissionEntity>,
  ) {}

  // ========== exam_attempt ==========

  /**
   * Tạo mới exam_attempt.
   */
  async createAttempt(
    data: Partial<ExamAttemptEntity>,
    manager?: EntityManager,
  ): Promise<ExamAttemptEntity> {
    const repo = manager ? manager.getRepository(ExamAttemptEntity) : this.attemptRepo;
    return repo.save(repo.create(data));
  }

  /**
   * Tìm attempt theo id.
   */
  async findAttemptById(id: string): Promise<ExamAttemptEntity | null> {
    return this.attemptRepo.findOne({ where: { id } });
  }

  /**
   * Tìm attempt đang IN_PROGRESS của user cho 1 exam.
   * Tránh tạo attempt trùng.
   */
  async findActiveAttempt(userId: string, examId: string): Promise<ExamAttemptEntity | null> {
    return this.attemptRepo.findOne({
      where: { userId, examId, status: 'IN_PROGRESS' },
      order: { startedAt: 'DESC' },
    });
  }

  /**
   * Tìm tất cả attempt đang IN_PROGRESS và đã quá deadline
   * (dùng cho timer.scheduler quét cron mỗi 5s).
   */
  async findExpiredInProgressAttempts(now: Date): Promise<ExamAttemptEntity[]> {
    return this.attemptRepo.find({
      where: { status: 'IN_PROGRESS', deadlineAt: LessThan(now) },
      take: 100,
    });
  }

  /**
   * Cập nhật status + submission info cho attempt.
   * Dùng khi manual submit / auto-submit.
   */
  async updateAttemptSubmission(
    id: string,
    update: {
      status: ExamAttemptEntity['status'];
      submittedAt: Date;
      submissionKind: ExamAttemptEntity['submissionKind'];
      flag?: boolean;
      flagReason?: string | null;
    },
  ): Promise<void> {
    await this.attemptRepo.update(id, update);
  }

  /**
   * Lưu các attempt cùng exam + status filter (dùng cho UC_009 list active).
   */
  async listActiveAttempts(examId: string): Promise<ExamAttemptEntity[]> {
    return this.attemptRepo.find({
      where: { examId, status: 'IN_PROGRESS' },
      order: { startedAt: 'ASC' },
    });
  }

  // ========== answer_draft ==========

  /**
   * Upsert draft theo (attemptId, questionId).
   * BR-012: chỉ giữ 1 row / (attempt, question).
   */
  async upsertDraft(
    data: {
      attemptId: string;
      questionId: string;
      answer: unknown;
      clientTs?: Date | null;
    },
    manager?: EntityManager,
  ): Promise<AnswerDraftEntity> {
    const repo = manager ? manager.getRepository(AnswerDraftEntity) : this.draftRepo;
    const existing = await repo.findOne({
      where: { attemptId: data.attemptId, questionId: data.questionId },
    });
    if (existing) {
      existing.answer = data.answer;
      existing.clientTs = data.clientTs ?? null;
      return repo.save(existing);
    }
    return repo.save(repo.create(data));
  }

  /**
   * Lấy tất cả draft của 1 attempt — dùng cho reconnect + auto-submit.
   */
  async findDraftsByAttempt(attemptId: string): Promise<AnswerDraftEntity[]> {
    return this.draftRepo.find({ where: { attemptId } });
  }

  /**
   * Convert drafts → JSON snapshot (cho submission).
   */
  async getAnswersSnapshot(attemptId: string): Promise<Record<string, unknown>> {
    const drafts = await this.findDraftsByAttempt(attemptId);
    const out: Record<string, unknown> = {};
    for (const d of drafts) {
      out[d.questionId] = d.answer;
    }
    return out;
  }

  // ========== submission ==========

  /**
   * Tạo submission record.
   */
  async createSubmission(
    data: Partial<SubmissionEntity>,
    manager?: EntityManager,
  ): Promise<SubmissionEntity> {
    const repo = manager ? manager.getRepository(SubmissionEntity) : this.submissionRepo;
    return repo.save(repo.create(data));
  }

  /**
   * Tìm submission theo attemptId.
   */
  async findSubmissionByAttempt(attemptId: string): Promise<SubmissionEntity | null> {
    return this.submissionRepo.findOne({ where: { attemptId } });
  }

  // ========== transaction helper ==========

  /**
   * Chạy 1 transaction. Dùng cho manual submit + auto-submit
   * cần update attempt + insert submission + publish event atomic.
   */
  async withTransaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.attemptRepo.manager.transaction(work);
  }
}