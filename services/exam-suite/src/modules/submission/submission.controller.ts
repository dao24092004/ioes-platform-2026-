import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
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
import { SubmitExamDto } from '../exam/dto/submit-exam.dto';
import { GradeExamDto } from '../exam/dto/grade-exam.dto';

/**
 * Submission API (BA §10.2):
 * - POST /exams/:examId/submissions              - student submit attempt
 * - POST /exams/:examId/submissions/:attemptId/grade - instructor/admin trigger grade
 */
@ApiTags('submission')
@ApiBearerAuth('bearer')
@ApiHeader({
  name: 'X-Dev-User-Id',
  description: 'Dev-only: UUID của user. Chỉ hoạt động khi DEV_AUTH_BYPASS=true.',
  required: false,
  example: '00000000-0000-4000-8000-000000000001',
})
@Controller('exams/:examId/submissions')
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
    @Body() body: SubmitExamDto,
  ): Promise<
    ApiResponse<{ attemptId: string; submittedAt: string; autoSubmitted: boolean }>
  > {
    return this.submissionService.submit(examId, userId, body);
  }

  @Post(':attemptId/grade')
  @Roles('INSTRUCTOR', 'ADMIN')
  async grade(
    @Param('examId') examId: string,
    @Param('attemptId') attemptId: string,
    @Body() body: GradeExamDto,
    @CurrentUser() user: UserPrincipalDto,
  ): Promise<ApiResponse<{
    score: number;
    maxScore: number;
    percentageScore: number;
    passed: boolean;
    autoGradedCount: number;
    manualGradedCount: number;
    finalGrading: boolean;
  }>> {
    // Note: manualScores từ body sẽ được dùng trong Phase 2 cho manual grading
    void body; // Suppress unused warning
    void examId; // examId chỉ dùng cho route
    return this.submissionService.gradeAttempt(
      attemptId,
      user.userId,
      user.role,
    );
  }
}