import { PartialType } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString } from 'class-validator';
import { CreateQuestionDto } from './create-question.dto';

/**
 * DTO cập nhật question - tất cả fields optional.
 * `etag` dùng cho optimistic-lock (If-Match header).
 */
export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {
  @IsOptional()
  @IsString()
  etag?: string;
}

/**
 * Path param wrapper.
 */
export class QuestionIdParamDto {
  @IsUUID('4')
  id!: string;
}
