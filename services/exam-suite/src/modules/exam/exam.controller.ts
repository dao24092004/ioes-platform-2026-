import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  ApiResponse,
  UserPrincipalDto,
} from '@ioes/common-node';
import { ExamService } from './exam.service';
import { Exam } from './entities/exam.entity';
import { ExamAttempt } from './entities/exam-attempt.entity';
import { Question } from '../question-bank/entities/question.entity';

/**
 * REST API cho exam flow (BA §10.2).
 *
 * Endpoints:
 * - GET    /exams                     - list exams visible cho user
 * - GET    /exams/:id                 - chi tiết exam
 * - POST   /exams/:id/start           - start attempt (student)
 * - GET    /attempts                  - list attempts của current user
 * - GET    /attempts/:id              - chi tiết attempt (cho polling)
 * - POST   /attempts/:id/cancel       - cancel attempt
 */
@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Get()
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
  async list(
    @CurrentUser() user: UserPrincipalDto,
  ): Promise<ApiResponse<Exam[]>> {
    return this.examService.list(user.userId, user.role);
  }

  @Get(':id')
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
  async getById(@Param('id') id: string): Promise<ApiResponse<Exam>> {
    return this.examService.getById(id);
  }

  @Post(':id/start')
  @Roles('STUDENT')
  async start(
    @Param('id') id: string,
    @CurrentUser() user: UserPrincipalDto,
  ): Promise<
    ApiResponse<{ attempt: ExamAttempt; totalQuestions: number }>
  > {
    const correlationId =
      (user as unknown as { correlationId?: string }).correlationId;
    return this.examService.startExam(id, user.userId, correlationId);
  }
}

@Controller('attempts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttemptController {
  constructor(private readonly examService: ExamService) {}

  @Get()
  @Roles('STUDENT', 'INSTRUCTOR')
  async list(
    @CurrentUser() user: UserPrincipalDto,
  ): Promise<ApiResponse<ExamAttempt[]>> {
    // Instructor: list all attempts cho exams của mình (filter ở service Phase 2)
    // Student: chỉ attempts của mình
    if (user.role === 'STUDENT') {
      return this.examService.listAttemptsByUser(user.userId);
    }
    return this.examService.listAttemptsByUser(user.userId);
  }

  @Get(':id')
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
  async getById(
    @Param('id') id: string,
    @CurrentUser() user: UserPrincipalDto,
  ): Promise<
    ApiResponse<{
      attempt: ExamAttempt;
      questions: Question[];
      includeCorrectAnswers: boolean;
    }>
  > {
    return this.examService.getAttemptForUser(id, user.userId, user.role);
  }

  @Post(':id/cancel')
  @Roles('STUDENT')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: UserPrincipalDto,
  ): Promise<ApiResponse<ExamAttempt>> {
    return this.examService.cancelAttempt(id, user.userId);
  }
}
