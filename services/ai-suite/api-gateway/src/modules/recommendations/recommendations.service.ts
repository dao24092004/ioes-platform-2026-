import { Injectable } from '@nestjs/common';
import { createLogger, getCacheStore } from '@ioes/common-node';
import { recommendationsConfig } from '../../config/app.config';
import { ContentCourse } from '../content/content.client';
import { CourseContextService } from '../content/course-context.service';
import {
  MlRecommendationReasonCode,
  MlWorkerClient,
} from '../ml-worker/ml-worker.client';

/**
 * Một gợi ý đã ghép đủ thông tin khoá học.
 *
 * Tên trường chốt trong AI_FEATURES_CONTRACT §1 (phần ai-gateway). ml-worker
 * chỉ trả `courseId` + điểm + lý do; phần còn lại ghép từ catalogue để web
 * dựng thẻ khoá học ngay, không phải gọi thêm một vòng cho từng id.
 */
export interface RecommendedCourse {
  courseId: string;
  title: string;
  thumbnailUrl: string | null;
  categoryId: string | null;
  level: number | null;
  durationHours: number | null;
  price: number | null;
  currency: string;
  score: number;
  reason: string;
  reasonCode: MlRecommendationReasonCode;
}

export interface RecommendationSet {
  items: RecommendedCourse[];
  strategy: string;
  generatedAt: string;
}

/** content-service để trống `currency` với khoá miễn phí. */
const DEFAULT_CURRENCY = 'VND';

@Injectable()
export class RecommendationsService {
  private readonly logger = createLogger('RecommendationsService');

  constructor(
    private readonly courseContext: CourseContextService,
    private readonly mlWorker: MlWorkerClient,
  ) {}

  /**
   * Gợi ý khoá học cho một người dùng.
   *
   * Có cache vì một lượt gợi ý kéo theo ba lời gọi mạng (catalogue, ghi danh,
   * ml-worker) mà trang chủ lại gọi mỗi lần điều hướng tới. TTL ngắn
   * (RECOMMENDATIONS_CACHE_TTL_SECONDS) để khoá vừa ghi danh vẫn sớm được
   * loại khỏi danh sách. Cache theo cả `limit`: xin 6 rồi xin 12 là hai kết
   * quả khác nhau, dùng chung khoá sẽ trả thiếu.
   */
  async forUser(
    userId: string,
    authorization: string,
    limit?: number,
  ): Promise<RecommendationSet> {
    const effectiveLimit = limit ?? recommendationsConfig.defaultLimit;
    const cache = getCacheStore();
    const cacheKey = `recommendations:courses:${userId}:${effectiveLimit}`;

    const cached = await cache.get<RecommendationSet>(cacheKey);
    if (cached) {
      return cached;
    }

    const context = await this.courseContext.load(authorization);

    // Catalogue rỗng thì không có gì để gợi ý. Gọi ml-worker cũng chỉ nhận về
    // mảng rỗng, nên bỏ hẳn lượt gọi đó.
    if (context.catalog.length === 0) {
      this.logger.warn('Catalogue rỗng, không gọi ml-worker');
      return { items: [], strategy: 'empty-catalog', generatedAt: nowIso() };
    }

    const result = await this.mlWorker.recommendCourses({
      userId,
      limit: effectiveLimit,
      enrolled: context.enrolled,
      catalog: context.catalog,
    });

    const items: RecommendedCourse[] = [];
    for (const item of result.items) {
      const course = context.coursesById.get(item.courseId);
      // Bỏ id không có trong catalogue thay vì trả thẻ rỗng: hoặc mô hình bịa
      // ra id, hoặc khoá vừa bị gỡ xuất bản — cả hai đều không hiển thị được.
      if (!course) {
        this.logger.warn(
          `ml-worker gợi ý courseId=${item.courseId} không có trong catalogue, bỏ qua`,
        );
        continue;
      }
      items.push(merge(item.courseId, course, item));
    }

    const payload: RecommendationSet = {
      items,
      strategy: result.strategy,
      generatedAt: nowIso(),
    };

    await cache.set(cacheKey, payload, recommendationsConfig.cacheTtlSeconds);

    this.logger.log(
      `Gợi ý userId=${userId} limit=${effectiveLimit}: ` +
        `ml-worker trả ${result.items.length}, ghép được ${items.length}`,
    );

    return payload;
  }
}

function merge(
  courseId: string,
  course: ContentCourse,
  item: { score: number; reason: string; reasonCode: MlRecommendationReasonCode },
): RecommendedCourse {
  return {
    courseId,
    title: course.title,
    thumbnailUrl: course.thumbnailUrl ?? null,
    categoryId: course.categoryId ?? null,
    level: course.difficultyLevel ?? null,
    durationHours: course.durationHours ?? null,
    price:
      course.price === null || course.price === undefined
        ? null
        : Number(course.price),
    currency: course.currency ?? DEFAULT_CURRENCY,
    score: item.score,
    reason: item.reason,
    reasonCode: item.reasonCode,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}
