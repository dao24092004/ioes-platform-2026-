import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { MlLearningPathResponse } from '../../ml-worker/ml-worker.client';

/**
 * Một lộ trình học đã sinh (FR-AI-005).
 *
 * Lưu nguyên `payload` mà ml-worker trả về thay vì tách `steps` ra bảng con:
 * lộ trình là ảnh chụp tại một thời điểm, chỉ đọc lại chứ không sửa từng bước,
 * và hình dạng bên trong còn đổi khi các agent tiến hoá. Tách bảng lúc này chỉ
 * đổi lấy một lược đồ phải migrate theo mỗi lần đổi prompt.
 *
 * Khoá chính do PostgreSQL sinh bằng uuid_generate_v7() — xem
 * database/migrations/ai/V2__learning_paths.sql. Không dùng
 * @PrimaryGeneratedColumn('uuid') vì decorator đó sinh UUID v4, trái
 * PROJECT_RULES §4.3.
 */
@Entity('learning_paths')
@Index(['userId', 'createdAt'])
export class LearningPath {
  // Khai default để TypeORM biết PostgreSQL sinh khoá và thêm RETURNING vào
  // câu INSERT. Thiếu default thì save() trả về entity với id undefined.
  @PrimaryColumn({ type: 'uuid', default: () => 'uuid_generate_v7()' })
  id!: string;

  /** users.id bên auth-service. Không đặt khoá ngoại xuyên database. */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'text' })
  goal!: string;

  /** Nguyên văn phản hồi của ml-worker, gồm steps, agentTrace và tổng số giờ. */
  @Column({ type: 'jsonb' })
  payload!: MlLearningPathResponse;

  /** Tên mô hình đã sinh lộ trình, để truy vết khi kết quả khác nhau giữa các bản. */
  @Column({ type: 'text', nullable: true })
  model!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /** Số bước, dùng cho danh sách lịch sử — đọc từ payload nên không cần cột riêng. */
  stepCount(): number {
    return this.payload?.steps?.length ?? 0;
  }
}
