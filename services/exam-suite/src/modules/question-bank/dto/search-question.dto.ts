import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  QuestionType,
  Difficulty,
  DIFFICULTY_NUMERIC,
} from '@ioes/common-node';
import { IsGte, MaxLengthEach } from '@ioes/common-node';

/**
 * DTO for full-text + multi-filter search questions.
 *
 * BUG #84 fix: import enums từ @ioes/common-node thay vì re-define
 * (TypeScript treats different enum definitions as distinct types,
 *  dẫn đến cast errors khi cross-service).
 *
 * BUG #83 fix: @IsGte('minDifficulty') đảm bảo maxDifficulty >= minDifficulty.
 */
export class SearchQuestionDto {
  @IsOptional()
  @IsString()
  @MaxLengthEach(200)
  q?: string;

  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @IsOptional()
  @IsUUID('4')
  topicId?: string;

  @IsOptional()
  @IsString()
  @MaxLengthEach(20)
  language?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minDifficulty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsGte('minDifficulty')
  maxDifficulty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  /**
   * Convert minDifficulty number → Difficulty enum value.
   * Helper cho service layer.
   */
  getMinDifficultyEnum(): Difficulty | undefined {
    if (this.minDifficulty === undefined) return undefined;
    const enumValue = Object.entries(DIFFICULTY_NUMERIC).find(
      ([, val]) => val === this.minDifficulty,
    )?.[0] as Difficulty | undefined;
    return enumValue;
  }

  getMaxDifficultyEnum(): Difficulty | undefined {
    if (this.maxDifficulty === undefined) return undefined;
    const enumValue = Object.entries(DIFFICULTY_NUMERIC).find(
      ([, val]) => val === this.maxDifficulty,
    )?.[0] as Difficulty | undefined;
    return enumValue;
  }
}