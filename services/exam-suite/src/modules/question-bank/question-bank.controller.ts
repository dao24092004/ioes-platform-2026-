import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  ApiResponse,
  CurrentUser,
  TraceId,
  UserPrincipalDto,
  RateLimit,
} from '@ioes/common-node';
import { QuestionBankService } from './question-bank.service';
import { QuestionWriteService } from './question-write.service';
import { SearchQuestionDto } from './dto/search-question.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import {
  QuestionDto,
  SearchQuestionResponseDto,
  PracticePathDto,
  TopicDto,
} from './dto/question.dto';

@ApiTags('Question Bank')
@ApiBearerAuth()
@Controller('question-bank')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestionBankController {
  constructor(
    private readonly readService: QuestionBankService,
    private readonly writeService: QuestionWriteService,
  ) {}

  // ========================================================================
  // READ endpoints (Dgraph)
  // ========================================================================

  @Get('questions/search')
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
  @RateLimit({ limit: 30, windowSec: 60 }) // 30 reqs/min
  @ApiOperation({
    summary: 'Tìm kiếm câu hỏi (full-text + filter)',
  })
  @ApiOkResponse({ type: SearchQuestionResponseDto })
  async search(
    @Query() dto: SearchQuestionDto,
  ): Promise<ApiResponse<SearchQuestionResponseDto>> {
    const result = await this.readService.searchQuestions(dto);
    return ApiResponse.success(result);
  }

  @Get('questions/:id')
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
  @RateLimit({ limit: 100, windowSec: 60 })
  @ApiOperation({ summary: 'Chi tiết câu hỏi' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiNotFoundResponse({ description: 'Question not found' })
  async getQuestion(
    // BUG #62 fix: validate UUID format
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ApiResponse<QuestionDto | null>> {
    const result = await this.readService.getQuestion(id);
    return ApiResponse.success(result);
  }

  @Get('questions/:id/similar')
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
  @RateLimit({ limit: 60, windowSec: 60 })
  @ApiOperation({ summary: 'Câu hỏi tương tự' })
  @ApiQuery({ name: 'limit', example: 5, required: false })
  async similar(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('limit') limit?: number,
  ): Promise<ApiResponse<QuestionDto[]>> {
    const result = await this.readService.getSimilarQuestions(
      id,
      limit ? Math.min(20, Math.max(1, limit)) : 5,
    );
    return ApiResponse.success(result);
  }

  @Get('topics')
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
  @RateLimit({ limit: 60, windowSec: 60 })
  @ApiOperation({ summary: 'Danh sách chủ đề (cây 2 cấp)' })
  async listTopics(): Promise<ApiResponse<TopicDto[]>> {
    const result = await this.readService.getTopicTree();
    return ApiResponse.success(result);
  }

  @Get('topics/:topicId/practice')
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
  @RateLimit({ limit: 30, windowSec: 60 })
  @ApiOperation({ summary: 'Practice path cho 1 chủ đề' })
  @ApiParam({ name: 'topicId', example: 'uuid' })
  async practice(
    @Param('topicId', new ParseUUIDPipe({ version: '4' })) topicId: string,
  ): Promise<ApiResponse<PracticePathDto | null>> {
    const result = await this.readService.getPracticePath(topicId);
    return ApiResponse.success(result);
  }

  // ========================================================================
  // WRITE endpoints (PostgreSQL + Kafka event)
  // ========================================================================

  @Post('questions')
  @Roles('INSTRUCTOR', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo câu hỏi mới',
    description:
      'Tạo question trong PostgreSQL + publish `QuestionCreated` event để sync Dgraph.',
  })
  @ApiCreatedResponse({ description: 'Question created' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({ description: 'Duplicate question' })
  async create(
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: UserPrincipalDto,
    @TraceId() correlationId: string,
  ): Promise<ApiResponse<{ id: string }>> {
    const created = await this.writeService.create(dto, user, correlationId);
    return ApiResponse.success({ id: created.id }, 'Question created');
  }

  @Patch('questions/:id')
  @Roles('INSTRUCTOR', 'ADMIN')
  @ApiOperation({
    summary: 'Cập nhật câu hỏi',
    description: 'Optimistic lock qua `If-Match` header (version number).',
  })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Question not found' })
  @ApiConflictResponse({ description: 'Version conflict' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateQuestionDto,
    @Headers('if-match') ifMatch: string | undefined,
    @CurrentUser() user: UserPrincipalDto,
    @TraceId() correlationId: string,
  ): Promise<ApiResponse<{ id: string; version: number }>> {
    // BUG #65 fix: etag chỉ từ header, ignore body.etag
    const updateDto = { ...dto, etag: ifMatch };
    const updated = await this.writeService.update(
      id,
      updateDto,
      user,
      correlationId,
    );
    return ApiResponse.success(
      { id: updated.id, version: updated.version },
      'Question updated',
    );
  }

  @Delete('questions/:id')
  @Roles('INSTRUCTOR', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ limit: 20, windowSec: 60 })
  @ApiOperation({
    summary: 'Soft delete câu hỏi',
    description: 'Set deletedAt, không xoá cứng (giữ audit trail).',
  })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiNoContentResponse({ description: 'Soft-deleted' })
  @ApiNotFoundResponse({ description: 'Question not found' })
  async delete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: UserPrincipalDto,
    @TraceId() correlationId: string,
  ): Promise<void> {
    await this.writeService.softDelete(id, user, correlationId);
  }

  @Post('questions/:id/publish')
  @Roles('INSTRUCTOR', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, windowSec: 60 })
  @ApiOperation({
    summary: 'Publish câu hỏi',
    description: 'Đổi status → PUBLISHED + publish event để regenerate learning path.',
  })
  @ApiParam({ name: 'id', example: 'uuid' })
  async publish(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: UserPrincipalDto,
    @TraceId() correlationId: string,
  ): Promise<ApiResponse<{ id: string; status: string }>> {
    const published = await this.writeService.publish(id, user, correlationId);
    return ApiResponse.success(
      { id: published.id, status: published.status },
      'Question published',
    );
  }
}
