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
  ApiResponse,
  CurrentUser,
  Roles,
  UserPrincipalDto,
} from '@ioes/common-node';
import { StartAttemptRequestDto } from './dto/start-attempt.dto';
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