import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  UserPrincipalDto,
  createLogger,
} from '@ioes/common-node';
import { StorageService, PresignedUploadResult } from './storage.service';
import { storageConfig } from '../../../config/app.config';

/**
 * ImageUploadService - upload/delete image cho questions.
 *
 * Flow:
 * 1. Client gọi POST /question-bank/questions/:id/images/upload-url
 *    → server trả presigned URL + publicUrl
 * 2. Client PUT file trực tiếp lên presigned URL (MinIO/S3)
 * 3. Client gọi POST /question-bank/questions/:id/images/confirm
 *    với publicUrl → server validate + lưu URL vào question.images
 * 4. Khi question update → publish event → Dgraph sync URLs
 *
 * **Content-Type whitelist**: PNG, JPEG, WebP, GIF, SVG
 * **Max size**: 10MB (configurable)
 *
 * @see docs/02-architecture/adr/ADR-007-storage.md
 */
@Injectable()
export class ImageUploadService {
  private readonly logger = createLogger(ImageUploadService.name);

  /** Allowed image content types */
  private readonly allowedContentTypes = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ]);

  constructor(private readonly storage: StorageService) {}

  /**
   * Tạo presigned URL cho client direct upload.
   *
   * @param questionId - UUID question (làm folder prefix)
   * @param filename - file name client muốn upload
   * @param contentType - MIME type
   */
  async generateUploadUrl(
    questionId: string,
    filename: string,
    contentType: string,
    user: UserPrincipalDto,
  ): Promise<PresignedUploadResult> {
    if (!this.allowedContentTypes.has(contentType)) {
      throw new BadRequestException(
        `Content type not allowed: ${contentType}. Allowed: ${Array.from(this.allowedContentTypes).join(', ')}`,
      );
    }
    if (!filename || filename.length > 255) {
      throw new BadRequestException('Invalid filename (max 255 chars)');
    }

    const keyPrefix = `questions/${questionId}/images`;

    const result = await this.storage.generatePresignedUploadUrl(
      keyPrefix,
      filename,
      contentType,
      {
        bucket: storageConfig.bucket,
        expiresIn: storageConfig.presignedTtl,
        maxSize: storageConfig.maxImageSize,
        metadata: {
          'uploaded-by': user.userId,
          'uploaded-at': new Date().toISOString(),
          'question-id': questionId,
        },
      },
    );

    this.logger.info(
      `Generated upload URL for question=${questionId} user=${user.userId} key=${result.key}`,
    );

    return result;
  }

  /**
   * Verify image đã được upload (HEAD object).
   * Sau khi client PUT xong, gọi endpoint này để xác nhận.
   *
   * @returns object size + last modified
   */
  async verifyUpload(
    bucket: string,
    key: string,
  ): Promise<{ exists: boolean; size?: number; lastModified?: Date }> {
    const obj = await this.storage.downloadObject(bucket, key);
    if (!obj) {
      return { exists: false };
    }
    return {
      exists: true,
      size: obj.buffer.length,
      lastModified: new Date(),
    };
  }

  /**
   * Xoá image (cleanup khi xoá question hoặc thay image).
   */
  async deleteImage(bucket: string, key: string): Promise<boolean> {
    const deleted = await this.storage.deleteObject(bucket, key);
    this.logger.info(`Deleted image bucket=${bucket} key=${key}`);
    return deleted;
  }

  /**
   * Validate URL pattern để chống injection.
   * Chỉ accept URLs thuộc CDN của chúng ta hoặc storage endpoint.
   */
  isValidImageUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const endpoint = storageConfig.endpoint ?? 'http://localhost:9000';
      const allowed = [
        new URL(endpoint).host,
        storageConfig.cdnBaseUrl
          ? new URL(storageConfig.cdnBaseUrl).host
          : null,
      ].filter((h): h is string => h !== null);
      return allowed.includes(parsed.host);
    } catch {
      return false;
    }
  }
}
