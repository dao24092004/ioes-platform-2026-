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
  UserPrincipalDto,
} from '@ioes/common-node';
import { StartAttemptRequestDto, StartAttemptResponseDto } from './dto/start-attempt.dto';
import {
  AnswerHttpRequestDto,
  AnswerSaveResponseDto,
} from './dto/answer-save.dto';
import { ExamSessionService } from './exam-session.service';

/**
 * Auth: JwtAuthGuard (verify JWT của auth-service) + RolesGuard (enforce @Roles).
 * Role trong token được JwtAuthGuard chuẩn hoá sang UPPERCASE.
 */
@ApiTags('exam-session')
@ApiBearerAuth('bearer')
@Controller('api/v1/exam-attempts')
@UseGuards(JwtAuthGuard, RolesGuard)
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

  /**
   * GET /api/v1/exam-attempts/instructor/exams/:examId/active-attempts
   * [UC_009 bước 2] List tất cả attempt IN_PROGRESS của 1 exam.
   *
   * Instructor chỉ xem được exam của chính mình; ADMIN/SUPER_ADMIN xem tất cả.
   */
  @Get('instructor/exams/:examId/active-attempts')
  @Roles('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: '[UC_009] List attempts đang thi (real-time monitoring)',
    description:
      'Instructor (chủ exam) hoặc Admin xem danh sách attempts đang IN_PROGRESS của 1 exam. ' +
      'Dùng cho màn hình Live Monitor.',
  })
  @ApiDocResponse({ status: 200, description: 'Danh sách attempts.' })
  @ApiDocResponse({ status: 403, description: 'Không phải chủ exam / Admin.' })
  @ApiDocResponse({ status: 404, description: 'Exam không tồn tại.' })
  async listActiveAttempts(
    @Param('examId') examId: string,
    @CurrentUser() user: UserPrincipalDto,
  ): Promise<ApiResponse<any[]>> {
    const list = await this.examSessionService.listActiveAttempts(examId, {
      userId: user.userId,
      role: user.role,
    });
    return ApiResponse.success(list, `Tìm thấy ${list.length} attempt đang thi`);
  }

  /**
   * GET /api/v1/exam-attempts/:id/proctoring-report
   * [UC_009 bước 13] Report chi tiết sau thi.
   *
   * Instructor chỉ xem được attempt thuộc exam của chính mình; ADMIN/SUPER_ADMIN xem tất cả.
   */
  @Get(':id/proctoring-report')
  @Roles('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: '[UC_009] Báo cáo proctoring chi tiết 1 attempt',
    description:
      'Trả về thông tin chi tiết: điểm, flag, lý do flag, danh sách violations ' +
      '(Phase 2), screenRecording URL (Phase 2).',
  })
  @ApiDocResponse({ status: 200, description: 'Report.' })
  @ApiDocResponse({ status: 403, description: 'Không phải chủ exam / Admin.' })
  @ApiDocResponse({ status: 404, description: 'Attempt không tồn tại.' })
  async getProctoringReport(
    @Param('id') id: string,
    @CurrentUser() user: UserPrincipalDto,
  ): Promise<ApiResponse<any>> {
    const report = await this.examSessionService.getProctoringReport(id, {
      userId: user.userId,
      role: user.role,
    });
    if (!report) {
      return ApiResponse.error('Attempt không tồn tại');
    }
    return ApiResponse.success(report, 'Lấy báo cáo thành công');
  }
}
