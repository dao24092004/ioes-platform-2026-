import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiResponse, UserId } from '@ioes/common-node';
import { GatewayUserGuard } from '../../common/guards/gateway-user.guard';
import { GenerateLearningPathDto } from './dto/generate-learning-path.dto';
import { ListHistoryDto } from './dto/list-history.dto';
import {
  LearningPathService,
  LearningPathSummary,
  SavedLearningPath,
} from './learning-path.service';

/**
 * FR-AI-005 — lộ trình học cá nhân hoá.
 *
 * Gateway khai `Path=/api/ai/**` kèm `StripPrefix=2`, nên web gọi
 * `/api/ai/learning-path/...` còn controller này nhận `/learning-path/...`.
 */
@Controller('learning-path')
@UseGuards(GatewayUserGuard)
export class LearningPathController {
  constructor(private readonly learningPath: LearningPathService) {}

  /**
   * Hạn mức chặt nhất trong service: mỗi lượt chạy năm agent, mỗi agent một
   * lượt gọi mô hình. Chặt hơn cả sinh câu hỏi (5 lượt/phút).
   *
   * `Authorization` lấy từ header rồi chuyển tiếp xuống content-service — bên
   * đó kiểm bearer token chứ không tin `X-User-Id`.
   */
  @Post('generate')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async generate(
    @UserId() userId: string,
    @Headers('authorization') authorization: string,
    @Body() dto: GenerateLearningPathDto,
  ): Promise<ApiResponse<SavedLearningPath>> {
    return ApiResponse.success(
      await this.learningPath.generate(userId, authorization, dto),
    );
  }

  /** `data: null` khi người dùng chưa từng sinh lộ trình — không phải lỗi. */
  @Get('me')
  async me(
    @UserId() userId: string,
  ): Promise<ApiResponse<SavedLearningPath | null>> {
    return ApiResponse.success(await this.learningPath.latest(userId));
  }

  @Get('me/history')
  async history(
    @UserId() userId: string,
    @Query() query: ListHistoryDto,
  ): Promise<ApiResponse<LearningPathSummary[]>> {
    return ApiResponse.success(
      await this.learningPath.history(userId, query.limit),
    );
  }

  /**
   * Mở lại một lộ trình cũ từ danh sách lịch sử.
   *
   * Khai SAU `me` và `me/history`: Nest so khớp theo thứ tự khai báo, nên đặt
   * `:id` lên trước sẽ nuốt cả hai đường dẫn cố định kia và `me` biến thành
   * một id không hợp lệ.
   *
   * `ParseUUIDPipe` chặn id rác ngay ở biên thay vì để nó xuống tới câu truy
   * vấn — PostgreSQL ném lỗi kiểu, và lỗi đó nổi lên thành 500 chứ không phải
   * 400 như bản chất của nó.
   */
  @Get(':id')
  async byId(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<SavedLearningPath>> {
    return ApiResponse.success(await this.learningPath.byId(userId, id));
  }
}
