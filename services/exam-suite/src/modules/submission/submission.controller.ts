import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  UserId,
  ApiResponse,
  CurrentUser,
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
@Controller('exams/:examId/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post()
  @Roles('STUDENT')
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
