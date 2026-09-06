import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

/**
 * 4 DTOs phục vụ auto-save answer (BR-012) cho cả REST và WebSocket.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  #  DTO                          Use                           │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  1. AnswerSaveRequestDto         WS exam:answer:save           │
 * │     (attemptId, questionId, ...)  body có attemptId             │
 * │                                                                  │
 * │  2. AnswerHttpRequestDto         REST POST .../answers         │
 * │     (questionId, answer, clientTs) attemptId từ URL param       │
 * │                                                                  │
 * │  3. AnswerBulkSaveRequestDto     WS exam:answer:bulk-save      │
 * │     (attemptId, answers[])       batch save khi reconnect       │
 * │                                                                  │
 * │  4. AnswerSaveResponseDto        Response cho cả REST + WS     │
 * │     (questionId, savedAt)        acknowledge khi save OK       │
 * └─────────────────────────────────────────────────────────────────┘
 */

/**
 * #1 — Request body cho WS event `exam:answer:save`.
 *      Dùng khi client muốn gửi kèm attemptId trong payload.
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
 * #2 — Request body cho REST `POST /api/v1/exam-attempts/:attemptId/answers`.
 *      attemptId lấy từ URL path param, không cần gửi trong body.
 */
export class AnswerHttpRequestDto {
  @ApiProperty({ description: 'ID câu hỏi' })
  @IsUUID('4')
  @IsNotEmpty()
  questionId!: string;

  @ApiProperty({
    description: 'Nội dung câu trả lời (string cho text/code, string[] cho MCQ)',
    oneOf: [
      { type: 'array', items: { type: 'string' } },
      { type: 'string' },
    ],
  })
  @IsNotEmpty()
  answer!: unknown;

  @ApiProperty({
    description: 'Client timestamp (ISO 8601) — optional, dùng để phát hiện clock skew',
    required: false,
    example: '2026-08-23T10:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  clientTs?: string;
}

/**
 * #3 — Request body cho WS event `exam:answer:bulk-save`.
 *      Dùng khi reconnect (UC_010 exception 5e): client gửi lại tất cả
 *      draft đã có trong IndexedDB để merge với server.
 */
export class AnswerBulkSaveRequestDto {
  @ApiProperty({ description: 'ID attempt' })
  @IsUUID('4')
  @IsNotEmpty()
  attemptId!: string;

  @ApiProperty({
    description: 'Danh sách draft cần sync',
    type: [AnswerSaveRequestDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerSaveRequestDto)
  answers!: AnswerSaveRequestDto[];
}

/**
 * #4 — Response trả về cho cả REST (`POST .../answers`) và WS
 *      (event `exam:answer:saved`).
 */
export class AnswerSaveResponseDto {
  @ApiProperty({ description: 'ID câu hỏi đã save' })
  @IsUUID('4')
  @IsNotEmpty()
  questionId!: string;

  @ApiProperty({
    description: 'Server timestamp lúc save (ISO 8601)',
    example: '2026-08-23T10:00:01.234Z',
  })
  @IsString()
  @IsNotEmpty()
  savedAt!: string;

  @ApiProperty({ description: 'ID attempt tương ứng', required: false })
  @IsOptional()
  @IsUUID('4')
  attemptId?: string;
}
