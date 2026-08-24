import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO cho mỗi câu trả lời trong submission.
 * - MCQ/MultiSelect: `selectedOptionIds` (UUID[])
 * - True/False: `answerText` ('true' | 'false')
 * - ShortAnswer/Essay: `answerText` (string)
 * - Coding: `answerText` (code string)
 */
export class AnswerSubmissionDto {
  @IsUUID()
  questionId!: string;

  @IsOptional()
  @IsString()
  answerText?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  selectedOptionIds?: string[];

  @IsOptional()
  @IsString()
  flaggedReason?: string;
}

export class SubmitExamDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerSubmissionDto)
  answers?: AnswerSubmissionDto[];

  /**
   * Map<string, AnswerSubmissionDto | string> shape (raw from client).
   * Service sẽ normalize thành Answer[].
   */
  @IsOptional()
  rawAnswers?: Record<string, unknown>;

  /**
   * Auto-submit flag (vd: timeout từ client side).
   * Nếu true → status='EXPIRED' thay vì 'SUBMITTED'.
   */
  @IsOptional()
  isAutoSubmit?: boolean;
}
