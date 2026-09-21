import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createLogger } from '@ioes/common-node';
import { CourseContextService } from '../content/course-context.service';
import {
  MlLearningPathResponse,
  MlWorkerClient,
} from '../ml-worker/ml-worker.client';
import { GenerateLearningPathDto } from './dto/generate-learning-path.dto';
import { LearningPath } from './entities/learning-path.entity';

/**
 * Một lộ trình đã lưu, đúng hình dạng web nhận.
 *
 * Trả cả `payload` chứ không phẳng hoá: web cần `steps`, `summary` và
 * `agentTrace` (nút giải thích "vì sao lộ trình này"), mà những thứ đó là
 * nguyên văn phản hồi của ml-worker theo AI_FEATURES_CONTRACT §2.
 */
export interface SavedLearningPath {
  id: string;
  goal: string;
  model: string | null;
  createdAt: string;
  payload: MlLearningPathResponse;
}

/** Một dòng trong danh sách lịch sử. */
export interface LearningPathSummary {
  id: string;
  goal: string;
  createdAt: string;
  stepCount: number;
}

const DEFAULT_HISTORY_LIMIT = 10;

@Injectable()
export class LearningPathService {
  private readonly logger = createLogger('LearningPathService');

  constructor(
    @InjectRepository(LearningPath)
    private readonly paths: Repository<LearningPath>,
    private readonly courseContext: CourseContextService,
    private readonly mlWorker: MlWorkerClient,
  ) {}

  /**
   * Sinh một lộ trình mới rồi lưu lại.
   *
   * Chỉ lưu sau khi ml-worker trả về thành công. ml-worker báo 503 khi mô hình
   * hỏng hoặc hết quota; lúc đó lỗi được ném tiếp lên để web hiện đúng trạng
   * thái, và KHÔNG có bản ghi rỗng nào nằm lại trong lịch sử người dùng.
   */
  async generate(
    userId: string,
    authorization: string,
    dto: GenerateLearningPathDto,
  ): Promise<SavedLearningPath> {
    const context = await this.courseContext.load(authorization);

    const result = await this.mlWorker.generateLearningPath({
      userId,
      goal: dto.goal,
      hoursPerWeek: dto.hoursPerWeek,
      currentSkills: dto.currentSkills ?? [],
      catalog: context.catalog,
      enrolled: context.enrolled,
    });

    // Agent validator bên ml-worker phải loại khoá do mô hình bịa ra. Ghi log
    // khi vẫn lọt để phát hiện sớm — không tự sửa payload ở đây, vì sửa lặng
    // lẽ sẽ che mất lỗi của phía kia.
    const unknown = (result.steps ?? []).filter(
      (step) => step.courseId !== null && !context.coursesById.has(step.courseId),
    );
    if (unknown.length > 0) {
      this.logger.warn(
        `Lộ trình chứa ${unknown.length} courseId không có trong catalogue: ` +
          unknown.map((step) => step.courseId).join(', '),
      );
    }

    const saved = await this.paths.save(
      this.paths.create({
        userId,
        goal: dto.goal,
        payload: result,
        model: result.model ?? null,
      }),
    );

    this.logger.log(
      `Lưu lộ trình ${saved.id} cho userId=${userId}: ` +
        `${result.steps?.length ?? 0} bước, ${result.totalEstimatedHours} giờ`,
    );

    return toSaved(saved);
  }

  /**
   * Lộ trình mới nhất của người dùng, hoặc null khi chưa từng sinh.
   *
   * Null là câu trả lời hợp lệ chứ không phải 404: trang lộ trình cần biết để
   * hiện màn hình mời tạo, và coi 404 là bình thường sẽ che mất 404 thật.
   */
  async latest(userId: string): Promise<SavedLearningPath | null> {
    const row = await this.paths.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return row ? toSaved(row) : null;
  }

  /**
   * Một lộ trình cụ thể của người gọi, dùng khi mở lại bản cũ từ lịch sử.
   *
   * Lọc `userId` ngay trong câu truy vấn và trả 404 — chứ không phải 403 — khi
   * bản ghi thuộc người khác: 403 xác nhận rằng id đó có thật, và ai cũng dò
   * được kho lộ trình bằng cách so hai mã lỗi.
   */
  async byId(userId: string, id: string): Promise<SavedLearningPath> {
    const row = await this.paths.findOne({ where: { id, userId } });
    if (!row) {
      throw new NotFoundException('Không tìm thấy lộ trình học');
    }
    return toSaved(row);
  }

  /** Lịch sử rút gọn, mới nhất trước. */
  async history(userId: string, limit?: number): Promise<LearningPathSummary[]> {
    const rows = await this.paths.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit ?? DEFAULT_HISTORY_LIMIT,
    });

    return rows.map((row) => ({
      id: row.id,
      goal: row.goal,
      createdAt: toIso(row.createdAt),
      // Đọc thẳng payload thay vì gọi row.stepCount(): find() dựng entity thật
      // nên có method, nhưng bản ghi dựng tay trong test thì không.
      stepCount: row.payload?.steps?.length ?? 0,
    }));
  }
}

function toSaved(row: LearningPath): SavedLearningPath {
  return {
    id: row.id,
    goal: row.goal,
    model: row.model ?? null,
    createdAt: toIso(row.createdAt),
    payload: row.payload,
  };
}

/**
 * createdAt là Date khi TypeORM vừa ghi, nhưng driver có thể trả chuỗi tuỳ
 * cấu hình. Chuẩn hoá về ISO-8601 để web không phải đoán.
 */
function toIso(value: Date | string | null | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
