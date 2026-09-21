import { Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiResponse, UserId } from '@ioes/common-node';
import { GatewayUserGuard } from '../../common/guards/gateway-user.guard';
import { ListRecommendationsDto } from './dto/list-recommendations.dto';
import {
  RecommendationSet,
  RecommendationsService,
} from './recommendations.service';

/**
 * FR-AI-002 — gợi ý khoá học.
 *
 * Gateway khai `Path=/api/ai/**` kèm `StripPrefix=2`, nên web gọi
 * `/api/ai/recommendations/courses` còn controller này nhận
 * `/recommendations/courses`.
 */
@Controller('recommendations')
@UseGuards(GatewayUserGuard)
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  /**
   * Hạn mức rộng hơn hỏi đáp: không lượt nào gọi mô hình ngôn ngữ, và trang
   * chủ gọi endpoint này mỗi lần mở.
   *
   * `Authorization` phải lấy từ header rồi chuyển tiếp xuống content-service —
   * bên đó kiểm bearer token chứ không tin `X-User-Id`.
   */
  @Get('courses')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async courses(
    @UserId() userId: string,
    @Headers('authorization') authorization: string,
    @Query() query: ListRecommendationsDto,
  ): Promise<ApiResponse<RecommendationSet>> {
    return ApiResponse.success(
      await this.recommendations.forUser(userId, authorization, query.limit),
    );
  }
}
