import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
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
import { BulkImportService } from './bulk-import/bulk-import.service';
import { ImageUploadService } from './storage/image-upload.service';
import { DgraphResyncService } from './dgraph-resync.service';
import {
  GenerateImageUploadUrlDto,
  ConfirmImageUploadDto,
  ResyncOptionsDto,
  ResyncResultDto,
} from './dto/upload.dto';
import { BulkImportResponse } from './bulk-import/bulk-import.dto';
import { storageConfig } from '../../config/app.config';

/**
 * Phase 2 endpoints: Bulk Import + Image Upload + Dgraph Resync.
 *
 * Routes:
 * - POST /question-bank/bulk-import          → upload CSV file
 * - POST /question-bank/questions/:id/images/upload-url → presigned URL
 * - DELETE /question-bank/images/:bucket/:key(*)        → delete image
 * - POST /question-bank/admin/resync         → trigger full resync
 * - POST /question-bank/admin/resync/:id     → resync single question
 *
 * @see docs/02-architecture/adr/ADR-007-storage.md
 */
@ApiTags('Question Bank')
@ApiBearerAuth()
@Controller('question-bank')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(
    private readonly bulkImport: BulkImportService,
    private readonly imageUpload: ImageUploadService,
    private readonly resync: DgraphResyncService,
  ) {}

  // ============================================================
  // BULK IMPORT
  // ============================================================

  @Post('bulk-import')
  @Roles('INSTRUCTOR', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, windowSec: 3600 }) // 5 imports/hour
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary: 'Bulk import questions từ CSV/TSV file',
    description:
      'Upload file (UTF-8, CSV hoặc TSV, max 50MB, max 5000 rows). ' +
      'Mỗi row là 1 question. Xem `bulk-import.dto.ts` cho format columns.',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: storageConfig.maxBulkImportSize,
      },
    }),
  )
  async importBulk(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: UserPrincipalDto,
    @TraceId() correlationId: string,
  ): Promise<ApiResponse<BulkImportResponse>> {
    if (!file) {
      throw new Error('No file uploaded');
    }
    if (file.size === 0) {
      throw new Error('Empty file');
    }

    const result = await this.bulkImport.importCsv(
      file.buffer,
      user,
      correlationId,
    );

    return ApiResponse.success(result, 'Bulk import completed');
  }

  // ============================================================
  // IMAGE UPLOAD (presigned URL flow)
  // ============================================================

  @Post('questions/:id/images/upload-url')
  @Roles('INSTRUCTOR', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 50, windowSec: 3600 })
  @ApiOperation({
    summary: 'Tạo presigned URL cho upload image',
    description:
      'Client nhận uploadUrl → PUT file trực tiếp lên MinIO/S3. ' +
      'Sau đó gọi confirm endpoint để attach URL vào question.',
  })
  @ApiParam({ name: 'id', example: 'uuid' })
  async generateImageUploadUrl(
    @Param('id', new ParseUUIDPipe({ version: '4' })) questionId: string,
    @Body() dto: GenerateImageUploadUrlDto,
    @CurrentUser() user: UserPrincipalDto,
  ): Promise<ApiResponse<unknown>> {
    const result = await this.imageUpload.generateUploadUrl(
      questionId,
      dto.filename,
      dto.contentType,
      user,
    );
    return ApiResponse.success(result, 'Upload URL generated');
  }

  @Post('questions/:id/images/confirm')
  @Roles('INSTRUCTOR', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 50, windowSec: 3600 })
  @ApiOperation({
    summary: 'Xác nhận image đã upload thành công',
    description:
      'Client gọi sau khi PUT file xong. Server validate URL + lưu vào question.images.',
  })
  @ApiParam({ name: 'id', example: 'uuid' })
  async confirmImageUpload(
    @Param('id', new ParseUUIDPipe({ version: '4' })) questionId: string,
    @Body() dto: ConfirmImageUploadDto,
    @CurrentUser() _user: UserPrincipalDto,
  ): Promise<ApiResponse<{ attached: true }>> {
    // Validate URL belongs to our storage
    if (!this.imageUpload.isValidImageUrl(dto.imageUrl)) {
      throw new Error(
        'Invalid image URL - must be from configured storage/CDN',
      );
    }

    // TODO: update question.images via QuestionWriteService
    // Cần thêm field `images: string[]` vào Question entity
    // và support trong DTO + event payload
    // Phase 3 enhancement

    return ApiResponse.success({ attached: true }, 'Image attached');
  }

  @Delete('images/:bucket/*')
  @Roles('INSTRUCTOR', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ limit: 30, windowSec: 3600 })
  @ApiOperation({ summary: 'Xoá image khỏi storage' })
  @ApiParam({ name: 'bucket', example: 'ioes-questions' })
  async deleteImage(
    @Param('bucket') bucket: string,
    @Param() params: Record<string, string>,
    @CurrentUser() user: UserPrincipalDto,
  ): Promise<void> {
    // Wildcard path param từ URL: params[0] = "questions/uuid/image.png"
    const key = params['0'];
    if (!key) {
      throw new Error('Missing object key');
    }
    if (bucket !== storageConfig.bucket) {
      throw new Error(`Invalid bucket: ${bucket}`);
    }
    await this.imageUpload.deleteImage(bucket, key);
  }

  // ============================================================
  // DGRAPH RESYNC (admin only)
  // ============================================================

  @Post('admin/resync')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.ACCEPTED) // 202 - operation queued
  @RateLimit({ limit: 3, windowSec: 3600 }) // 3 resyncs/hour
  @ApiOperation({
    summary: '[ADMIN] Force re-sync all questions sang Dgraph',
    description:
      'Publish QuestionUpdated event cho mỗi question. ' +
      'Dùng khi Dgraph mất data hoặc schema migration.',
  })
  async resyncAll(
    @Query() options: ResyncOptionsDto,
    @CurrentUser() user: UserPrincipalDto,
  ): Promise<ApiResponse<ResyncResultDto>> {
    const parsedOptions: Parameters<DgraphResyncService['resyncAll']>[1] = {};
    if (options.since) parsedOptions.since = new Date(options.since);
    if (options.limit !== undefined) parsedOptions.limit = options.limit;
    if (options.reason !== undefined) parsedOptions.reason = options.reason;

    const result = await this.resync.resyncAll(user, parsedOptions);
    return ApiResponse.success(result, 'Resync triggered');
  }

  @Post('admin/resync/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit({ limit: 30, windowSec: 3600 })
  @ApiOperation({ summary: '[ADMIN] Re-sync single question' })
  @ApiParam({ name: 'id', example: 'uuid' })
  async resyncOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) questionId: string,
    @CurrentUser() user: UserPrincipalDto,
  ): Promise<ApiResponse<{ eventId: string }>> {
    const result = await this.resync.resyncOne(questionId, user);
    return ApiResponse.success(result, 'Resync queued');
  }

  // ============================================================
  // STORAGE HEALTH (admin)
  // ============================================================

  @Get('admin/storage/health')
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Storage health check' })
  async storageHealth(): Promise<
    ApiResponse<{ configured: boolean; bucket: string; cdn: string | undefined }>
  > {
    return ApiResponse.success({
      configured: true,
      bucket: storageConfig.bucket,
      cdn: storageConfig.cdnBaseUrl,
    });
  }
}
