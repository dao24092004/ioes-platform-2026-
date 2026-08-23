import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { AnswerSaveRequestDto } from './answer-save.dto';

/**
 * Request body cho WS event `exam:answer:bulk-save`.
 *
 * Dùng khi reconnect (UC_008 exception 5e): client gửi lại tất cả
 * draft đã có trong IndexedDB để merge với server.
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
 * Request cho WS `exam:join` — student tham gia session sau khi đã có attemptId.
 */
export class ExamJoinRequestDto {
  @ApiProperty({ description: 'ID attempt muốn join' })
  @IsUUID('4')
  @IsNotEmpty()
  attemptId!: string;

  @ApiProperty({
    description: 'JWT token (auth qua handshake hoặc message đầu tiên)',
    required: false,
  })
  @IsOptional()
  @IsString()
  token?: string;
}