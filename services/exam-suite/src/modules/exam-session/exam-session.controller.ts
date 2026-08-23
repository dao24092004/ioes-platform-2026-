import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiResponse,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  UserPrincipalDto,
} from '@ioes/common-node';
import { StartAttemptRequestDto } from './dto/start-attempt.dto';
import { ExamSessionService } from './exam-session.service';

@Controller('api/v1/exam-attempts')
@UseGuards(JwtAuthGuard)
export class ExamSessionController {
  constructor(private readonly examSessionService: ExamSessionService) {}

  /**
   * POST /api/v1/exam-attempts
   * Bắt đầu attempt mới (UC_008 bước 1-5).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('STUDENT')
  async start(
    @CurrentUser() user: UserPrincipalDto,
    @Body() dto: StartAttemptRequestDto,
  ): Promise<ApiResponse<any>> {
    const result = await this.examSessionService.startAttempt(user.userId, dto);
    return ApiResponse.success(result, 'Bắt đầu phiên thi thành công');
  }

  /**
   * GET /api/v1/exam-attempts/:id
   * Lấy thông tin attempt.
   */
  @Get(':id')
  @Roles('STUDENT', 'INSTRUCTOR')
  async getOne(
    @CurrentUser() user: UserPrincipalDto,
    @Param('id') id: string,
  ): Promise<ApiResponse<any>> {
    const attempt = await this.examSessionService.getAttempt(user.userId, id);
    if (!attempt) {
      return ApiResponse.error('Attempt không tồn tại hoặc không có quyền');
    }
    return ApiResponse.success(attempt);
  }

  /**
   * POST /api/v1/exam-attempts/:id/submit
   * Manual submit (UC_008 bước 14a).
   */
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @Roles('STUDENT')
  async submit(
    @CurrentUser() user: UserPrincipalDto,
    @Param('id') id: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.examSessionService.submitManually(user.userId, id);
    return ApiResponse.success(result, 'Nộp bài thành công');
  }
}