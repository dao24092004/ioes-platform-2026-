import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExamAttempt } from './exam-attempt.entity';

/**
 * Answer entity - câu trả lời của user cho 1 câu hỏi trong 1 attempt.
 *
 * Theo BA §10.2 (Exam Flow):
 * - User answer → auto-save với snapshot
 * - Sau khi submit → grading service chấm điểm (points_earned, is_correct)
 * - Essay/coding cần manual grading (is_correct=false cho đến khi graded)
 *
 * UNIQUE(attempt_id, question_id) → 1 user chỉ có 1 answer cho 1 question.
 */
@Entity('answers')
@Index('idx_answers_attempt', ['attemptId'])
@Index('idx_answers_question', ['questionId'])
export class Answer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  attemptId!: string;

  @Column({ type: 'uuid' })
  questionId!: string;

  @Column({ type: 'text', nullable: true })
  answerText?: string;

  @Column({ type: 'uuid', array: true, nullable: true })
  selectedOptionIds?: string[];

  @Column({ type: 'boolean', nullable: true })
  isCorrect?: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  pointsEarned?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxPoints?: number;

  @Column({ type: 'boolean', default: false })
  isFlagged!: boolean;

  @Column({ type: 'text', nullable: true })
  flaggedReason?: string;

  @Column({ type: 'timestamptz', nullable: true })
  answeredAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  gradedAt?: Date;

  @Column({ type: 'text', nullable: true })
  gradingFeedback?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => ExamAttempt, (attempt) => attempt.answers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attemptId' })
  attempt?: ExamAttempt;
}
