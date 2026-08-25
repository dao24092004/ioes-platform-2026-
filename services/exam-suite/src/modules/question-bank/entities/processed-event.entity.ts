import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';

/**
 * ProcessedEvent - tracking table cho idempotent consumer.
 *
 * Mỗi eventId đã xử lý thành công sẽ được INSERT vào đây.
 * UNIQUE constraint trên eventId ngăn duplicate processing.
 *
 * Cleanup: chạy job xóa events cũ hơn 30 ngày (Phase E).
 */
@Entity('processed_events')
@Index('idx_processed_event_id', ['eventId'], { unique: true })
@Index('idx_processed_aggregate', ['aggregateType', 'aggregateId'])
@Index('idx_processed_created', ['processedAt'])
export class ProcessedEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  eventId!: string;

  @Column({ type: 'varchar', length: 64 })
  eventType!: string;

  @Column({ type: 'varchar', length: 64 })
  aggregateId!: string;

  @Column({ type: 'varchar', length: 64 })
  aggregateType!: string;

  @CreateDateColumn()
  processedAt!: Date;
}