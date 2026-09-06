import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
  VersionColumn,
} from 'typeorm';
import { ExamAttempt } from './exam-attempt.entity';

/**
 * Exam entity - mirror schema V1__init_schema.sql.
 *
 * Theo BA §3.1.3 (Module Exam):
 * - Created by INSTRUCTOR
 * - Time limit, passing score, max attempts
 * - Randomization + proctoring flags
 *
 * Optimistic lock qua @VersionColumn (matches `version` int column).
 */
export enum ExamType {
  PRACTICE = 'practice',
  GRADED = 'graded',
  CERTIFICATION = 'certification',
}

@Entity('exams')
@Index('idx_exams_course', ['courseId'])
@Index('idx_exams_instructor', ['instructorId'])
@Index('idx_exams_type', ['examType'])
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  courseId?: string;

  @Column({ type: 'uuid' })
  instructorId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ExamType,
    default: ExamType.GRADED,
  })
  examType!: ExamType;

  @Column({ type: 'int', nullable: true })
  timeLimitMinutes?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  passingScore?: number;

  @Column({ type: 'int', nullable: true })
  maxAttempts?: number;

  @Column({ type: 'boolean', default: false })
  isRandomized!: boolean;

  @Column({ type: 'boolean', default: true })
  showResults!: boolean;

  @Column({ type: 'boolean', default: false })
  isProctored!: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @VersionColumn({ default: 1 })
  version!: number;

  @OneToMany(() => ExamAttempt, (attempt) => attempt.exam)
  attempts?: ExamAttempt[];

  /**
   * Domain method - check exam available cho user.
   * BA §10.2: chỉ INSTRUCTOR's exams + exam_type='practice' mới start được.
   */
  isAvailableForUser(): boolean {
    if (this.deletedAt) return false;
    // Practice exams always available, certification cần check enrollment (sẽ làm ở service)
    return true;
  }
}
