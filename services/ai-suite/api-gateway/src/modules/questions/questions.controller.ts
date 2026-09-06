import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiResponse, UserId } from '@ioes/common-node';
import { GatewayUserGuard } from '../../common/guards/gateway-user.guard';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { GeneratedQuestionSet, QuestionsService } from './questions.service';

/**
 * Sinh câu hỏi kiểm tra từ học liệu.
 *
 * Gateway khai `Path=/api/ai/**` kèm `StripPrefix=2`, nên client gọi
 * `/api/ai/questions/generate` còn controller này nhận `/questions/generate`.
 *
 * Không lưu gì ở đây. Giảng viên duyệt xong thì gọi
 * `POST /api/exams/question-bank/questions` của exam-suite — ngân hàng đề
 * thuộc Epic 3, ai-suite chỉ soạn.
 */
@Controller('questions')
@UseGuards(GatewayUserGuard)
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  /**
   * Chặt hơn hỏi đáp (10/phút): mỗi lượt sinh N câu, mà mỗi câu lại kéo thêm
   * một lượt gọi mô hình để đối chiếu — xin 10 câu là 11 lần gọi.
   */
  @Post('generate')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async generate(
    @UserId() userId: string,
    @Body() dto: GenerateQuestionsDto,
  ): Promise<ApiResponse<GeneratedQuestionSet>> {
    return ApiResponse.success(await this.questions.generate(userId, dto));
  }
}
