import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExamAttemptEntity } from './exam-attempt.entity';

/**
 * Entity `submission` — bản nộp cuối cùng (kết quả chốt).
 *
 * Được tạo khi:
 * - Student submit chủ động (UC_008 manual)
 * - Timer về 0 (UC_008 timeout)
 * - Auto-submit do vi phạm BR-013 (UC_008 auto_flag)
 *
 * Sau khi tạo, exam_session.score + maxScore được copy sang đây
 * để giữ nguyên bản ghi bất biến (audit trail).
 */
@Entity('submission')
export class SubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_submission_attempt', { unique: true })
  @Column({ type: 'uuid' })
  attemptId!: string;

  /**
   * Snapshot toàn bộ câu trả lời cuối cùng (từ answer_draft).
   */
  @Column({ type: 'jsonb' })
  answers!: Record<string, unknown>;

  /**
   * Điểm từ grader tự động (MCQ + coding).
   */
  @Column({ type: 'numeric', precision: 6, scale: 2 })
  autoScore!: number;

  /**
   * Điểm chấm thủ công (essay…) — null nếu không có.
   */
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  manualScore!: number | null;

  /**
   * Điểm cuối cùng = autoScore + manualScore.
   */
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  finalScore!: number | null;

  /**
   * Metadata từ grader (vd: per-question breakdown).
   */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  gradingMeta!: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  gradedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToOne(() => ExamAttemptEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attemptId' })
  attempt?: ExamAttemptEntity;
}