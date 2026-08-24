import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * AnswerSnapshot entity - mirror schema answer_snapshots (V1__init_schema.sql).
 *
 * Mỗi submit tạo 1 snapshot - audit trail. UNIQUE constraint trên attempt_id +
 * saved_at đảm bảo sort ổn định. Snapshot giúp:
 * - Recovery: nếu answers table corrupted → restore từ snapshot
 * - Cheating detection: so sánh auto-save vs final-submit
 * - Grading replay: re-grade attempt cũ không cần re-collect answers
 */
@Entity('answer_snapshots')
@Index('idx_answer_snapshots_attempt', ['attemptId'])
@Index('idx_answer_snapshots_saved_at', ['attemptId', 'savedAt'])
export class AnswerSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  attemptId!: string;

  @Column({ type: 'jsonb' })
  answers!: Array<{
    questionId: string;
    answerText?: string;
    selectedOptionIds?: string[];
  }>;

  @CreateDateColumn({ type: 'timestamptz' })
  savedAt!: Date;
}
