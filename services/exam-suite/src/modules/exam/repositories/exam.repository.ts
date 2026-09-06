import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, IsNull } from 'typeorm';
import { Exam, ExamType } from '../entities/exam.entity';
import { Question } from '../../question-bank/entities/question.entity';

/**
 * Custom repository cho Exam.
 * - Tách logic query ra khỏi Service để dễ test
 * - Hỗ trợ pessimistic locking (startExam cần SELECT FOR UPDATE)
 */
@Injectable()
export class ExamRepository {
  constructor(
    @InjectRepository(Exam)
    private readonly repo: Repository<Exam>,
  ) {}

  /**
   * Find by ID (basic). Trả về Exam hoặc null.
   */
  findById(id: string): Promise<Exam | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Find by ID với pessimistic write lock.
   * Dùng trong transaction startExam() để chống race condition.
   *
   * Caller PHẢI đang trong transaction (truyền em).
   */
  async findByIdForUpdate(em: EntityManager, id: string): Promise<Exam | null> {
    return em
      .createQueryBuilder(Exam, 'e')
      .setLock('pessimistic_write')
      .where('e.id = :id', { id })
      .andWhere('e.deletedAt IS NULL')
      .getOne();
  }

  /**
   * Find by ID, throw nếu không tồn tại hoặc đã bị xoá.
   */
  async findByIdOrFail(id: string): Promise<Exam> {
    const exam = await this.repo.findOne({ where: { id } });
    if (!exam) {
      throw new Error(`Exam not found: ${id}`);
    }
    return exam;
  }

  /**
   * Find by ID in transaction (tham gia transaction, không lock).
   * Dùng khi đã lock ở step trước, chỉ cần load relation.
   */
  async findByIdInTx(em: EntityManager, id: string): Promise<Exam | null> {
    return em.findOne(Exam, { where: { id } });
  }

  /**
   * List exams by instructor (for instructor dashboard).
   */
  findByInstructor(instructorId: string): Promise<Exam[]> {
    return this.repo.find({
      where: { instructorId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * List exam dạng practice cho học viên.
   *
   * Chưa lọc theo lớp đã ghi danh: việc đó cần content-service, mà service
   * đó chưa chạy được. Practice là tập an toàn nhất để mở cho học viên
   * trong lúc chờ.
   */
  findPractice(): Promise<Exam[]> {
    return this.repo.find({
      where: { examType: ExamType.PRACTICE, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * Lưu exam (insert/update) - dùng trong transaction.
   */
  save(em: EntityManager, exam: Exam): Promise<Exam> {
    return em.save(Exam, exam);
  }

  /**
   * Query questions theo exam (join sections) trong transaction.
   * Dùng cho startExam - snapshot question IDs.
   */
  async findQuestionsByExamIdInTx(
    em: EntityManager,
    examId: string,
  ): Promise<Question[]> {
    return em
      .createQueryBuilder(Question, 'q')
      .innerJoin('exam_sections', 's', 's.id = q.sectionId')
      .where('s.exam_id = :examId', { examId })
      .andWhere('q.deleted_at IS NULL')
      .andWhere('q.status = :status', { status: 'published' })
      .orderBy('q.difficulty', 'ASC')
      .getMany();
  }
}
