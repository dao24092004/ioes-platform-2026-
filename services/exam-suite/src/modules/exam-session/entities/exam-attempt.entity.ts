import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Trạng thái phiên thi.
 *
 * - IN_PROGRESS : Student đang làm bài
 * - SUBMITTED   : Đã nộp (chủ động hoặc auto-submit do vi phạm)
 * - GRADED      : Đã auto-grade xong
 * - EXPIRED     : Hết giờ mà không submit
 */
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'EXPIRED';

/**
 * Lý do submit.
 *
 * - MANUAL         : Student chủ động nộp
 * - TIMEOUT        : Hết giờ (timer về 0)
 * - AUTO_FLAG      : Auto-submit do vi phạm BR-013 (>3 clusters)
 * - SYSTEM         : Hệ thống (admin force-submit, chưa dùng)
 */
export type SubmissionKind = 'MANUAL' | 'TIMEOUT' | 'AUTO_FLAG' | 'SYSTEM';

/**
 * Entity `exam_attempt` — 1 row cho mỗi lần attempt của Student vào một exam.
 *
 * Phục vụ UC_008 (thi trực tuyến), là bảng lõi của exam-suite.
 *
 * Business rules liên quan:
 * - BR-008: timer không pause, deadline cố định
 * - BR-010: nếu exam >30 phút mà proctoring không bật → từ chối ở start-exam use-case
 * - BR-013: violation > 3 clusters → flag=true, submission_kind=AUTO_FLAG
 */
@Entity('exam_attempt')
@Index('idx_attempt_user', ['userId'])
@Index('idx_attempt_exam_status', ['examId', 'status'])
@Index('idx_attempt_status_deadline', ['status', 'deadlineAt'])
export class ExamAttemptEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  examId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  enrollmentId!: string;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  /**
   * Deadline tuyệt đối (startedAt + exam.duration). Server authoritative.
   */
  @Column({ type: 'timestamptz' })
  deadlineAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  submissionKind!: SubmissionKind | null;

  @Column({ type: 'varchar', length: 16, default: 'IN_PROGRESS' })
  status!: AttemptStatus;

  /**
   * BR-013: tự động set true nếu vi phạm vượt ngưỡng.
   * Không ảnh hưởng điểm — Instructor review.
   */
  @Column({ type: 'boolean', default: false })
  flag!: boolean;

  @Column({ type: 'text', nullable: true })
  flagReason!: string | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  score!: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  maxScore!: number | null;

  /**
   * Metadata bổ sung: exam duration, screen record enabled, browser info…
   */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  /**
   * Helper: kiểm tra phiên thi còn hoạt động không.
   */
  isInProgress(): boolean {
    return this.status === 'IN_PROGRESS' && this.deadlineAt.getTime() > Date.now();
  }

  /**
   * Helper: kiểm tra đã kết thúc (submit, grade, hoặc expire).
   */
  isFinished(): boolean {
    return this.status !== 'IN_PROGRESS';
  }
}