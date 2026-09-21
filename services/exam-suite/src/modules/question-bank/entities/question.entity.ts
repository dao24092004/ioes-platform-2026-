import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
  VersionColumn,
} from 'typeorm';
import {
  QuestionType,
  Difficulty,
  QuestionStatus,
} from '@ioes/common-node';

@Entity('questions')
@Index('idx_questions_topic', ['topicId'])
@Index('idx_questions_difficulty', ['difficulty'])
@Index('idx_questions_type', ['questionType'])
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  questionText!: string;

  @Column({ type: 'enum', enum: QuestionType })
  questionType!: QuestionType;

  @Column({ type: 'enum', enum: Difficulty })
  difficulty!: Difficulty;

  @Column({ type: 'int', default: 1 })
  points!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  language?: string;

  @Column({ type: 'text', nullable: true })
  hint?: string;

  @Column({ type: 'text', nullable: true })
  explanation?: string;

  @Column({ type: 'int', nullable: true })
  estimatedTimeSeconds?: number;

  // BUG #51/#52 fix: dùng 'text' { array: true } thay vì 'simple-array'
  // để khớp với PostgreSQL TEXT[] column type
  @Column({ type: 'text', array: true, nullable: true })
  tags?: string[];

  /**
   * Section của đề thi mà câu hỏi thuộc về (`exam_sections.id`, do
   * V1__init_schema.sql tạo). Đây là đường DUY NHẤT nối question với exam:
   * ExamRepository.findQuestionsByExamIdInTx() nối
   * `exam_sections s ON s.id = q.sectionId` rồi lọc `s.exam_id = :examId`.
   *
   * Thiếu khai báo này thì TypeORM không có gì để ánh xạ `q.sectionId` trong
   * điều kiện join, để nguyên chuỗi đó vào SQL, và PostgreSQL hạ về chữ
   * thường → `column q.sectionid does not exist`, làm POST /exams/:id/start
   * luôn trả 500.
   *
   * Nullable: câu hỏi của question-bank (ngân hàng câu hỏi dùng chung, tạo
   * qua POST /question-bank/questions) không thuộc đề nào.
   */
  @Column({ type: 'uuid', nullable: true })
  sectionId?: string;

  @Column({ type: 'uuid' })
  topicId!: string;

  @Column({ type: 'uuid', array: true, nullable: true })
  skillIds?: string[];

  @Column({ type: 'uuid', array: true, nullable: true })
  prerequisites?: string[];

  @Column({ type: 'enum', enum: QuestionStatus, default: QuestionStatus.DRAFT })
  status!: QuestionStatus;

  @Column({ type: 'uuid' })
  createdBy!: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;

  /** Optimistic locking */
  @VersionColumn()
  version!: number;

  @OneToMany(() => QuestionOption, (option) => option.question, {
    cascade: true,
    eager: false,
  })
  options?: QuestionOption[];

  @OneToMany(() => CodingTestCase, (tc) => tc.question, {
    cascade: true,
    eager: false,
  })
  testCases?: CodingTestCase[];

  /** Audit fields for event sourcing */
  @Column({ type: 'uuid', nullable: true })
  lastPublishedBy?: string;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date;
}

@Entity('question_options')
export class QuestionOption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Question, (q) => q.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ type: 'uuid' })
  questionId!: string;

  @Column({ type: 'varchar', length: 500 })
  optionText!: string;

  @Column({ type: 'boolean', default: false })
  isCorrect!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'int', nullable: true })
  points?: number;
}

@Entity('coding_test_cases')
export class CodingTestCase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Question, (q) => q.testCases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ type: 'uuid' })
  questionId!: string;

  @Column({ type: 'text' })
  input!: string;

  @Column({ type: 'text' })
  expectedOutput!: string;

  @Column({ type: 'boolean', default: false })
  isSample!: boolean;

  @Column({ type: 'int', nullable: true })
  points?: number;
}
