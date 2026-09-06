import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';

export enum ChatSessionStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

/**
 * Phiên hội thoại giữa học viên và trợ lý AI (US-017).
 *
 * Khoá chính do PostgreSQL sinh bằng uuid_generate_v7() — xem
 * database/migrations/ai/V1__init_schema.sql. Không dùng
 * @PrimaryGeneratedColumn('uuid') vì decorator đó sinh UUID v4, trái
 * PROJECT_RULES §4.3.
 */
@Entity('chat_sessions')
@Index(['userId'])
@Index(['status'])
export class ChatSession {
  // Khai default để TypeORM biết PostgreSQL sinh khoá và thêm RETURNING vào
  // câu INSERT. Thiếu default thì save() trả về entity với id undefined, và
  // bản ghi con tham chiếu tới nó sẽ vi phạm ràng buộc NOT NULL.
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  /** users.id bên auth-service. Không đặt khoá ngoại xuyên database. */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({
    type: 'enum',
    enum: ChatSessionStatus,
    enumName: 'chat_session_status',
    default: ChatSessionStatus.ACTIVE,
  })
  status!: ChatSessionStatus;

  @Column({ name: 'message_count', type: 'int', default: 0 })
  messageCount!: number;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt!: Date | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @OneToMany(() => ChatMessage, (message) => message.session)
  messages!: ChatMessage[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  isArchived(): boolean {
    return this.status === ChatSessionStatus.ARCHIVED;
  }

  archive(): void {
    this.status = ChatSessionStatus.ARCHIVED;
  }
}
