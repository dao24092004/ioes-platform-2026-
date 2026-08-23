import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Generic OutboxEvent entity - dùng cho mọi service.
 *
 * Theo ADR-004 (idempotency + outbox):
 * - Status: PENDING → PROCESSING → PUBLISHED / FAILED
 * - Atomic claim: UPDATE status='PROCESSING' WHERE status='PENDING'
 * - Crash recovery: stuck PROCESSING events reset về PENDING sau timeout
 *
 * Schema phải match với outbox_events table trong Flyway migrations.
 */
@Entity('outbox_events')
@Index(['status', 'nextAttemptAt'])
@Index(['aggregateId'])
@Index(['eventType'])
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  eventId!: string;

  @Column({ type: 'varchar', length: 100 })
  eventType!: string;

  @Column({ type: 'varchar', length: 20 })
  eventVersion!: string;

  @Column({ type: 'varchar', length: 200 })
  topic!: string;

  @Column({ type: 'uuid', nullable: true })
  aggregateId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  aggregateType?: string;

  @Column({ type: 'varchar', length: 100 })
  source!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  headers?: Record<string, string>;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'PENDING',
  })
  status!: 'PENDING' | 'PROCESSING' | 'PUBLISHED' | 'FAILED';

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @Column({ type: 'timestamptz', nullable: true })
  nextAttemptAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  correlationId?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt?: Date;
}

/**
 * ProcessedEvent entity - idempotency tracking cho consumers.
 *
 * Atomic claim pattern (ADR-004):
 * - INSERT ... ON CONFLICT DO NOTHING với eventId UNIQUE
 * - Nếu insert thành công → claim được → xử lý
 * - Nếu conflict → đã xử lý rồi → skip
 */
@Entity('processed_events')
@Index(['aggregateId'])
@Index(['processedAt'])
export class ProcessedEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'uuid', unique: true })
  eventId!: string;

  @Column({ type: 'varchar', length: 100 })
  eventType!: string;

  @Column({ type: 'uuid', nullable: true })
  aggregateId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  aggregateType?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  processedAt!: Date;
}
