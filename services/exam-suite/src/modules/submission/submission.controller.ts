import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  UserId,
  ApiResponse,
} from '@ioes/common-node';
import { SubmissionService } from './submission.service';

@Controller('exams/:examId/submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post()
  @Roles('STUDENT')
  async submit(
    @Param('examId') examId: string,
    @UserId() userId: string,
    @Body() body: { answers: unknown },
  ): Promise<ApiResponse<any>> {
    return this.submissionService.submit(examId, userId, body.answers);
  }
}
