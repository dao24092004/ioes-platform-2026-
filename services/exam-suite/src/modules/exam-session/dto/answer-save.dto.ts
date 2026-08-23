import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Request body cho WS event `exam:answer:save`.
 *
 * Auto-save 1 câu trả lời theo BR-012 (client gửi mỗi 30 giây).
 *
 * `answer` có thể là:
 * - string[] cho MCQ (multi-choice)
 * - string cho Coding (source code)
 * - string cho Essay
 *
 * Server upsert theo (attemptId, questionId) — không tạo row mới.
 */
export class AnswerSaveRequestDto {
  @ApiProperty({ description: 'ID attempt' })
  @IsUUID('4')
  @IsNotEmpty()
  attemptId!: string;

  @ApiProperty({ description: 'ID câu hỏi' })
  @IsUUID('4')
  @IsNotEmpty()
  questionId!: string;

  @ApiProperty({
    description: 'Nội dung câu trả lời (tuỳ loại câu hỏi)',
    oneOf: [
      { type: 'array', items: { type: 'string' } },
      { type: 'string' },
    ],
  })
  @IsNotEmpty()
  answer!: unknown;

  @ApiProperty({
    description: 'Client timestamp (ISO 8601) — để detect clock skew',
    required: false,
  })
  @IsOptional()
  @IsString()
  clientTs?: string;
}

/**
 * Response cho `exam:answer:saved`.
 */
export class AnswerSaveResponseDto {
  @ApiProperty({ description: 'ID câu hỏi đã save' })
  questionId!: string;

  @ApiProperty({ description: 'Server timestamp lúc save' })
  savedAt!: string;
}