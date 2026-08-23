import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Param,
  Post,
  SetMetadata,
  UseGuards,
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
  UserId,
  UserPrincipalDto,
} from '@ioes/common-node';
import { SubmissionService } from './submission.service';

/**
 * Dev-only auth bypass. Mirrors ExamSessionController.DevAuthBypassGuard
 * so submission endpoints can be exercised locally without the real JWT
 * pipeline. Drop in production.
 */
@Injectable()
export class DevAuthBypassGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const bypass = process.env.DEV_AUTH_BYPASS === 'true';
    if (!bypass) return false;
    const req = ctx.switchToHttp().getRequest();
    const userId = req.headers['x-dev-user-id'] || '00000000-0000-4000-8000-000000000001';
    req.user = { sub: userId, email: `${userId}@dev.local`, role: 'STUDENT' };
    req.userId = userId;
    return true;
  }
}

@ApiTags('submission')
@ApiBearerAuth('bearer')
@ApiHeader({
  name: 'X-Dev-User-Id',
  description: 'Dev-only: UUID của user. Chỉ hoạt động khi DEV_AUTH_BYPASS=true.',
  required: false,
  example: '00000000-0000-4000-8000-000000000001',
})
@Controller('exams/:examId/submissions')
@UseGuards(DevAuthBypassGuard)
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post()
  @Roles('STUDENT')
  @ApiOperation({
    summary: 'Tạo submission cho exam',
    description:
      'Nhận payload `{ answers: unknown }` và lưu vào submission table. ' +
      'Trả về `ApiResponse` chứa submission record.',
  })
  @ApiDocResponse({ status: 201, description: 'Submission đã được tạo.' })
  @ApiDocResponse({ status: 400, description: 'Validation error — body không đúng shape.' })
  @ApiDocResponse({ status: 403, description: 'Không có quyền nộp bài thi này.' })
  async submit(
    @Param('examId') examId: string,
    @UserId() userId: string,
    @Body() body: { answers: unknown },
  ): Promise<ApiResponse<any>> {
    return this.submissionService.submit(examId, userId, body.answers);
  }
}