import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * OutboxEvent - transactional outbox pattern.
 *
 * Events được INSERT vào table này TRONG CÙNG transaction với DB write.
 * Background worker (OutboxWorker) sẽ poll, publish sang Kafka,
 * mark processed - đảm bảo "at-least-once" delivery.
 *
 * Lợi ích so với publish Kafka trực tiếp:
 * - Atomic: write DB + log event đồng thời, không thể lệch nhau
 * - Recoverable: nếu Kafka down, retry từ DB
 * - Observable: dễ debug bằng cách SELECT FROM outbox_events
 *
 * @see docs/02-architecture/adr/ADR-005-outbox-pattern.md
 */
@Entity('outbox_events')
@Index('idx_outbox_status_created', ['status', 'createdAt'])
@Index('idx_outbox_aggregate', ['aggregateType', 'aggregateId'])
@Index('idx_outbox_event_id', ['eventId'], { unique: true })
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Unique event ID - dedupe ở consumer side */
  @Column({ type: 'varchar', length: 64 })
  eventId!: string;

  @Column({ type: 'varchar', length: 64 })
  eventType!: string;

  @Column({ type: 'varchar', length: 16, default: '1.0' })
  eventVersion!: string;

  /** Kafka topic */
  @Column({ type: 'varchar', length: 128 })
  topic!: string;

  /** Aggregate key (vd: question UUID) */
  @Column({ type: 'varchar', length: 64 })
  aggregateId!: string;

  @Column({ type: 'varchar', length: 64 })
  aggregateType!: string;

  /** Service phát ra event */
  @Column({ type: 'varchar', length: 64 })
  source!: string;

  /** Correlation ID cho distributed tracing */
  @Column({ type: 'varchar', length: 64, nullable: true })
  correlationId?: string;

  /** Full EventEnvelope payload as JSONB */
  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  /** Optional headers (vd: tenant, trace-info) */
  @Column({ type: 'jsonb', nullable: true })
  headers?: Record<string, string>;

  /**
   * Status lifecycle:
   * - PENDING: vừa insert, chờ worker publish
   * - PROCESSING: worker đang publish (lock row)
   * - PUBLISHED: publish thành công
   * - FAILED: publish fail nhiều lần, cần manual intervention
   */
  @Column({
    type: 'enum',
    enum: ['PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED'],
    default: 'PENDING',
  })
  status!: 'PENDING' | 'PROCESSING' | 'PUBLISHED' | 'FAILED';

  /** Số lần publish attempt */
  @Column({ type: 'int', default: 0 })
  attempts!: number;

  /** Last error message nếu fail */
  @Column({ type: 'text', nullable: true })
  lastError?: string | null;

  /** Next retry timestamp (exponential backoff) */
  @Column({ type: 'timestamptz', nullable: true })
  nextAttemptAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt?: Date;
}