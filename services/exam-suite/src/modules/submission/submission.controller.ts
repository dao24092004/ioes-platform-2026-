import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as ApiDocResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiResponse,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
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
 *
 * Auth: JwtAuthGuard gắn request.user/userId từ JWT, RolesGuard enforce @Roles.
 */
@ApiTags('submission')
@ApiBearerAuth('bearer')
@Controller('exams/:examId/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  @Roles('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Chấm attempt',
    description:
      'Auto-grade câu trắc nghiệm/đúng-sai/trả lời ngắn. `manualScores` (questionId → ' +
      '{ score, feedback? }, score là số điểm đạt được trong khoảng 0..points của câu) ' +
      'chấm tay các câu essay/coding. Attempt chỉ chuyển GRADED khi không còn câu chờ chấm tay.',
  })
  @ApiDocResponse({ status: 200, description: 'Kết quả chấm.' })
  @ApiDocResponse({ status: 400, description: 'manualScores không hợp lệ hoặc attempt chưa nộp.' })
  @ApiDocResponse({ status: 403, description: 'Không phải giảng viên phụ trách / admin.' })
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
    pendingManualCount: number;
    finalGrading: boolean;
  }>> {
    return this.submissionService.gradeAttempt(
      attemptId,
      user.userId,
      user.role,
      { examId, manualScores: body?.manualScores },
    );
  }
}
