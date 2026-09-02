import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
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
import {
  AdminExamRow,
  AdminExamStats,
  GradingQueueItem,
} from './dto/admin-exam.dto';
import { GradingQueueStats } from './repositories/attempt.repository';

/**
 * REST API cho exam flow (BA §10.2).
 *
 * Endpoints:
 * - GET    /exams                     - list exams visible cho user
 * - GET    /exams/admin/overview      - bảng giám sát của admin (kèm số liệu)
 * - GET    /exams/admin/stats         - cụm số tổng cho trang quản trị
 * - GET    /exams/grading/queue       - bài chờ chấm
 * - GET    /exams/grading/stats       - số liệu hàng đợi chấm
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

  /**
   * Bốn route dưới đây phải đứng TRƯỚC `@Get(':id')`: Nest so khớp theo thứ tự
   * khai báo, nên nếu để sau thì `:id` nuốt luôn 'admin' và 'grading' rồi ném
   * lỗi exam-not-found.
   */
  @Get('admin/overview')
  @Roles('ADMIN')
  async adminOverview(): Promise<ApiResponse<AdminExamRow[]>> {
    return this.examService.adminOverview();
  }

  @Get('admin/stats')
  @Roles('ADMIN')
  async adminStats(): Promise<ApiResponse<AdminExamStats>> {
    return this.examService.adminStats();
  }

  /**
   * Giảng viên chỉ thấy bài nộp cho đề của chính mình; admin thấy toàn bộ.
   * Phạm vi do service quyết định từ role, không nhận từ query param.
   */
  @Get('grading/queue')
  @Roles('INSTRUCTOR', 'ADMIN')
  async gradingQueue(
    @CurrentUser() user: UserPrincipalDto,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<ApiResponse<GradingQueueItem[]>> {
    return this.examService.gradingQueue(user.role, user.userId, limit);
  }

  @Get('grading/stats')
  @Roles('INSTRUCTOR', 'ADMIN')
  async gradingStats(
    @CurrentUser() user: UserPrincipalDto,
  ): Promise<ApiResponse<GradingQueueStats>> {
    return this.examService.gradingStats(user.role, user.userId);
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
