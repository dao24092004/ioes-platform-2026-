import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * Body cho `POST /api/v1/exam-attempts/:id/submit` (manual submit).
 */
export class SubmitAttemptRequestDto {
  @ApiProperty({ description: 'ID attempt cần submit' })
  @IsUUID('4')
  @IsNotEmpty()
  attemptId!: string;
}

/**
 * Response cho submit.
 */
export class SubmitAttemptResponseDto {
  @ApiProperty({ description: 'ID submission vừa tạo' })
  submissionId!: string;

  @ApiProperty({ description: 'Lý do submit (MANUAL | TIMEOUT | AUTO_FLAG)' })
  submissionKind!: string;

  @ApiProperty({ description: 'Attempt đã được flag chưa' })
  flagged!: boolean;
}