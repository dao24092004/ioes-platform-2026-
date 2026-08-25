import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Request tạo presigned URL cho image upload.
 */
export class GenerateImageUploadUrlDto {
  @ApiProperty({ example: 'screenshot.png' })
  @IsString()
  @MaxLength(255)
  filename!: string;

  @ApiProperty({
    example: 'image/png',
    enum: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'],
  })
  @IsEnum(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'] as const)
  contentType!: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' | 'image/svg+xml';
}

/**
 * Request body sau khi client upload xong (confirm + attach URL vào question).
 */
export class ConfirmImageUploadDto {
  @ApiProperty({ example: 'https://cdn.ioes.com/questions/uuid/image.png' })
  @IsString()
  @MaxLength(2000)
  imageUrl!: string;

  @ApiProperty({ example: 'diagram', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  caption?: string;
}

/**
 * Response cho resync operation.
 */
export class ResyncResultDto {
  @ApiProperty()
  totalQuestions!: number;

  @ApiProperty()
  batchCount!: number;

  @ApiProperty()
  durationMs!: number;

  @ApiProperty()
  startedAt!: Date;

  @ApiProperty()
  completedAt!: Date;

  @ApiProperty()
  triggeredBy!: string;

  @ApiProperty({ required: false })
  reason?: string;
}

/**
 * Query params cho resync.
 */
export class ResyncOptionsDto {
  @ApiProperty({ required: false, description: 'ISO date - only resync questions updated after this' })
  @IsOptional()
  @IsString()
  since?: string;

  @ApiProperty({ required: false, description: 'Limit total questions' })
  @IsOptional()
  limit?: number;

  @ApiProperty({ required: false, description: 'Reason for audit log' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
