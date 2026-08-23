import {
  Body,
  Controller,
  ExecutionContext,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  Param,
  Post,
  SetMetadata,
  UseGuards,
  CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse as ApiDocResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiResponse,
  CurrentUser,
  Roles,
  UserPrincipalDto,
} from '@ioes/common-node';
import { StartAttemptRequestDto, StartAttemptResponseDto } from './dto/start-attempt.dto';
import {
  AnswerHttpRequestDto,
  AnswerSaveResponseDto,
} from './dto/answer-save.dto';
import { ExamSessionService } from './exam-session.service';

export const DEV_AUTH_BYPASS_KEY = 'dev_auth_bypass';

/**
 * Dev-only guard: cho phép bypass JWT auth khi `DEV_AUTH_BYPASS=true`.
 *
 * Chỉ áp dụng ở exam-session controller — KHÔNG động vào common-node.
 * Production: set DEV_AUTH_BYPASS=false (mặc định).
 *
 * Khi bypass, user lấy từ header `X-Dev-User-Id` (UUID) thay vì JWT.
 */
@Injectable()
export class DevAuthBypassGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const bypass = process.env.DEV_AUTH_BYPASS === 'true';
    if (!bypass) return false;
    const req = ctx.switchToHttp().getRequest();
    const userId = req.headers['x-dev-user-id'] || '00000000-0000-4000-8000-000000000001';
    req.user = {
      sub: userId,
      email: `${userId}@dev.local`,
      role: 'STUDENT',
    };
    req.userId = userId;
    return true;
  }
}

@ApiTags('exam-session')
@ApiBearerAuth('bearer')
@ApiHeader({
  name: 'X-Dev-User-Id',
  description:
    'Dev-only: UUID của user. Chỉ hoạt động khi DEV_AUTH_BYPASS=true. Bỏ qua khi dùng Bearer token.',
  required: false,
  example: '00000000-0000-4000-8000-000000000001',
})
@Controller('api/v1/exam-attempts')
@UseGuards(DevAuthBypassGuard)
export class ExamSessionController {
  constructor(private readonly examSessionService: ExamSessionService) {}

  /**
   * POST /api/v1/exam-attempts
   * Bắt đầu attempt mới (UC_008 bước 1-5).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('STUDENT')
  @ApiOperation({
    summary: 'Bắt đầu attempt mới',
    description:
      'Khởi tạo exam_attempt cho student. Validate enrollment + khung giờ + BR-010 ' +
      '(proctoring bắt buộc nếu exam > 30 phút). Trả về `wsUrl` + `deadlineEpochMs` ' +
      'để client mở WebSocket.',
  })
  @ApiDocResponse({
    status: 201,
    description: 'Attempt đã tạo thành công.',
    type: StartAttemptResponseDto,
  })
  @ApiDocResponse({ status: 403, description: 'Forbidden — đã có attempt IN_PROGRESS hoặc BR-010 vi phạm.' })
  @ApiDocResponse({ status: 404, description: 'Không tìm thấy exam hoặc chưa enroll.' })
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
  @ApiOperation({
    summary: 'Lấy thông tin attempt',
    description:
      'Trả về exam_attempt theo id. Ẩn existence nếu user khác chủ sở hữu (trả về null).',
  })
  @ApiDocResponse({ status: 200, description: 'Tìm thấy attempt.' })
  @ApiDocResponse({ status: 404, description: 'Attempt không tồn tại hoặc không có quyền.' })
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
  @ApiOperation({
    summary: 'Manual submit attempt',
    description:
      'Student chủ động nộp bài. Sau khi submit, attempt chuyển sang SUBMITTED và ' +
      'publish event `ExamSubmitted` lên Kafka.',
  })
  @ApiDocResponse({ status: 200, description: 'Submit thành công.' })
  @ApiDocResponse({ status: 403, description: 'Không có quyền submit attempt này.' })
  async submit(
    @CurrentUser() user: UserPrincipalDto,
    @Param('id') id: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.examSessionService.submitManually(user.userId, id);
    return ApiResponse.success(result, 'Nộp bài thành công');
  }

  /**
   * POST /api/v1/exam-attempts/:id/answers
   * Auto-save 1 câu trả lời qua REST (mirror của WS event `exam:answer:save`).
   * BR-012: client gửi mỗi 30s để đảm bảo không mất dữ liệu khi WS chập chờn.
   *
   * Body: { questionId, answer, clientTs? }
   * Response: { questionId, savedAt, attemptId }
   */
  @Post(':id/answers')
  @HttpCode(HttpStatus.OK)
  @Roles('STUDENT')
  @ApiOperation({
    summary: 'Auto-save 1 câu trả lời (REST)',
    description:
      'Mirror của WS event `exam:answer:save`. BR-012: client gửi mỗi 30s để ' +
      'đảm bảo không mất dữ liệu khi WebSocket chập chờn. Upsert theo (attemptId, questionId).',
  })
  @ApiDocResponse({
    status: 200,
    description: 'Lưu thành công.',
    type: AnswerSaveResponseDto,
  })
  @ApiDocResponse({ status: 400, description: 'Validation error (questionId/answer trống).' })
  async saveAnswer(
    @CurrentUser() user: UserPrincipalDto,
    @Param('id') id: string,
    @Body() dto: AnswerHttpRequestDto,
  ): Promise<ApiResponse<AnswerSaveResponseDto>> {
    const result = await this.examSessionService.saveAnswer(user.userId, {
      ...dto,
      attemptId: id,
    });
    return ApiResponse.success(
      {
        questionId: dto.questionId,
        savedAt: result.savedAt.toISOString(),
        attemptId: id,
      },
      'Lưu câu trả lời thành công',
    );
  }
}