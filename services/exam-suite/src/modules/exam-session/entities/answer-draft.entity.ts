import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExamAttemptEntity } from './exam-attempt.entity';

/**
 * Entity `answer_draft` — auto-save draft theo BR-012 (mỗi 30 giây).
 *
 * Mỗi (attemptId, questionId) chỉ giữ 1 row — ghi đè khi save lại.
 *
 * Dùng để:
 * 1. Khôi phục bài làm khi student reconnect (exception 5e UC_008)
 * 2. Auto-submit theo draft cuối khi hết giờ
 * 3. Đảm bảo không mất bài khi client crash
 */
@Entity('answer_draft')
@Index('idx_draft_attempt_question', ['attemptId', 'questionId'], { unique: true })
@Index('idx_draft_attempt', ['attemptId'])
export class AnswerDraftEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  attemptId!: string;

  @Column({ type: 'uuid' })
  questionId!: string;

  /**
   * Tuỳ loại câu hỏi:
   * - MCQ: string[] (mảng id lựa chọn)
   * - Coding: string (source code)
   * - Essay: string (text)
   */
  @Column({ type: 'jsonb' })
  answer!: unknown;

  /**
   * Client timestamp (để detect clock skew, không authoritative).
   */
  @Column({ type: 'timestamptz', nullable: true })
  clientTs!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  savedAt!: Date;

  @ManyToOne(() => ExamAttemptEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attemptId' })
  attempt?: ExamAttemptEntity;
}