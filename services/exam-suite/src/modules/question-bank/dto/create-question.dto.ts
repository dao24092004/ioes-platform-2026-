import {
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsArray,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  QuestionType,
  Difficulty,
  QuestionStatus,
} from '@ioes/common-node';
import {
  QuestionTypeOptionsMatch,
  HasCorrectAnswer,
} from './validators/question-type-options.validator';

export class QuestionOptionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  optionText!: string;

  @IsOptional()
  isCorrect?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  points?: number;
}

export class CodingTestCaseDto {
  @IsString()
  @MaxLength(10_000)
  input!: string;

  @IsString()
  @MaxLength(10_000)
  expectedOutput!: string;

  @IsOptional()
  isSample?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  points?: number;
}

/**
 * DTO tạo question mới - validate trước khi vào DB.
 *
 * ValidationPipe(global) sẽ tự động reject nếu fail.
 *
 * BUG #73 fix: có thêm QuestionTypeOptionsMatch decorator để ensure
 * questionType vs options/testCases consistency.
 */
export class CreateQuestionDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  questionText!: string;

  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @IsInt()
  @Min(1)
  @Max(100)
  points!: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  hint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(7200)
  estimatedTimeSeconds?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @ArrayUnique()
  tags?: string[];

  @IsUUID('4')
  topicId!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  @ArrayUnique()
  skillIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  @ArrayUnique()
  prerequisites?: string[];

  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  /** MCQ / Multi-select - chỉ dùng khi questionType = MCQ/MULTIPLE_SELECT/TRUE_FALSE */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  @QuestionTypeOptionsMatch()
  @HasCorrectAnswer()
  options?: QuestionOptionDto[];

  /** Coding - test cases */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CodingTestCaseDto)
  testCases?: CodingTestCaseDto[];
}
