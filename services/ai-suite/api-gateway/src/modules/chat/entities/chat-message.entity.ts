import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatSession } from './chat-session.entity';

export enum ChatMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

/** Một đoạn văn mà tầng RAG truy xuất được, kèm điểm tương đồng. */
export interface RetrievedSource {
  docId: string;
  chunkId: string;
  title: string;
  score: number;
}

/**
 * Một lượt trong hội thoại (US-017).
 *
 * Khoá chính sinh phía PostgreSQL bằng uuid_generate_v7().
 */
@Entity('chat_messages')
@Index(['sessionId'])
export class ChatMessage {
  // Khai default để TypeORM biết PostgreSQL sinh khoá và thêm RETURNING vào
  // câu INSERT. Thiếu default thì save() trả về entity với id undefined, và
  // bản ghi con tham chiếu tới nó sẽ vi phạm ràng buộc NOT NULL.
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => ChatSession, (session) => session.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session!: ChatSession;

  @Column({
    type: 'enum',
    enum: ChatMessageRole,
    enumName: 'chat_message_role',
  })
  role!: ChatMessageRole;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  sources!: RetrievedSource[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  model!: string | null;

  @Column({ name: 'prompt_tokens', type: 'int', nullable: true })
  promptTokens!: number | null;

  @Column({ name: 'completion_tokens', type: 'int', nullable: true })
  completionTokens!: number | null;

  /**
   * Tổng token của lần gọi, gồm cả token suy luận ẩn.
   *
   * KHÔNG bằng promptTokens + completionTokens: Gemini tính riêng phần suy
   * luận vào tổng. Đo thực tế thấy 17 + 168 nhưng tổng là 736. Mọi tính toán
   * hạn mức phải dựa vào cột này.
   */
  @Column({ name: 'total_tokens', type: 'int', nullable: true })
  totalTokens!: number | null;

  @Column({ name: 'latency_ms', type: 'int', nullable: true })
  latencyMs!: number | null;

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

  /** Số token ẩn mà mô hình dùng để suy luận, không nằm trong câu trả lời. */
  reasoningTokens(): number {
    if (this.totalTokens === null) {
      return 0;
    }
    return Math.max(
      0,
      this.totalTokens - (this.promptTokens ?? 0) - (this.completionTokens ?? 0),
    );
  }
}
