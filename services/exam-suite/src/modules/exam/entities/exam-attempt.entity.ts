import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
  VersionColumn,
} from 'typeorm';
import { Exam } from './exam.entity';
import { Answer } from './answer.entity';

/**
 * Attempt status (matches PostgreSQL ENUM attempt_status).
 */
export enum AttemptStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * ExamAttempt entity - 1 lần làm bài của 1 user cho 1 exam.
 *
 * Theo BA §10.2:
 * - Status flow: NOT_STARTED → IN_PROGRESS → SUBMITTED → GRADED
 * - time_remaining_seconds cho timer (countdown)
 * - question_ids[] lưu order nếu exam.is_randomized
 * - Unique index (user_id, exam_id) WHERE status IN ('not_started', 'in_progress')
 *   → đảm bảo 1 user chỉ có 1 active attempt cho mỗi exam.
 */
@Entity('exam_attempts')
@Index('idx_attempts_exam', ['examId'])
@Index('idx_attempts_user', ['userId'])
@Index('idx_attempts_status', ['status'])
export class ExamAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  examId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: AttemptStatus,
    default: AttemptStatus.NOT_STARTED,
  })
  status!: AttemptStatus;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  gradedAt?: Date;

  @Column({ type: 'int', nullable: true })
  timeRemainingSeconds?: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  score?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxScore?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentageScore?: number;

  @Column({ type: 'boolean', nullable: true })
  passed?: boolean;

  @Column({ type: 'uuid', array: true, nullable: true })
  questionIds?: string[];

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @VersionColumn({ default: 1 })
  version!: number;

  @ManyToOne(() => Exam, (exam) => exam.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examId' })
  exam?: Exam;

  @OneToMany(() => Answer, (answer) => answer.attempt)
  answers?: Answer[];

  /**
   * Domain: check attempt có đang active không.
   */
  isActive(): boolean {
    return (
      this.status === AttemptStatus.NOT_STARTED ||
      this.status === AttemptStatus.IN_PROGRESS
    );
  }

  /**
   * Domain: check exam expired (cho auto-submit logic).
   */
  isExpired(now: Date = new Date()): boolean {
    if (!this.startedAt || !this.exam?.timeLimitMinutes) return false;
    const expiresAt = new Date(this.startedAt);
    expiresAt.setMinutes(expiresAt.getMinutes() + this.exam.timeLimitMinutes);
    return now > expiresAt;
  }
}
