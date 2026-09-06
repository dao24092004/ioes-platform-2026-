import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  QuestionType,
  Difficulty,
  QuestionStatus,
} from '@ioes/common-node';

/**
 * DTO cho 1 row trong bulk import (Excel/CSV).
 * Mapping từ header columns:
 *
 * | Column             | Required | Type     | Notes                            |
 * |--------------------|----------|----------|----------------------------------|
 * | question_text      | Yes      | string   | 10-2000 chars                    |
 * | question_type      | Yes      | enum     | multiple_choice/multiple_select/ |
 * |                    |          |          | true_false/short_answer/essay/   |
 * |                    |          |          | coding                           |
 * | difficulty         | Yes      | enum     | very_easy/easy/medium/hard/      |
 * |                    |          |          | very_hard                        |
 * | points             | Yes      | int      | 1-100                            |
 * | topic_id           | Yes      | UUID     |                                  |
 * | language           | No       | string   |                                  |
 * | hint               | No       | string   |                                  |
 * | explanation        | No       | string   |                                  |
 * | estimated_seconds   | No       | int      | 10-7200                          |
 * | tags               | No       | csv      | tag1,tag2,tag3                   |
 * | options            | No       | csv      | "Option A|false,Option B|true"   |
 * |                    |          |          | (text|is_correct)                |
 * | correct_answers    | No       | csv      | cho short_answer                 |
 * | test_cases         | No       | csv      | coding only:                     |
 * |                    |          |          | "input|expected|points|sample"   |
 *
 * Format CSV/TSV row → parse → validate → CreateQuestionDto.
 */
export class BulkImportRowDto {
  @IsString()
  @MaxLength(2000)
  questionText!: string;

  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  points!: number;

  @IsString()
  topicId!: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  hint?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  estimatedTimeSeconds?: number;

  @IsOptional()
  tags?: string[];

  /** Parsed options: array of {optionText, isCorrect, sortOrder, points} */
  @IsOptional()
  options?: Array<{
    optionText: string;
    isCorrect?: boolean;
    sortOrder?: number;
    points?: number;
  }>;

  @IsOptional()
  correctAnswers?: string[];

  @IsOptional()
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    isSample?: boolean;
    points?: number;
  }>;

  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;
}

/**
 * Response cho bulk import operation.
 */
export interface BulkImportResponse {
  /** Total rows trong file */
  totalRows: number;
  /** Rows thành công */
  successCount: number;
  /** Rows failed (với row number + error) */
  failedCount: number;
  /** IDs của questions đã tạo */
  createdIds: string[];
  /** Lỗi theo row number (1-based) */
  errors: Array<{
    rowNumber: number;
    fieldErrors: string[];
    raw?: Record<string, string>;
  }>;
  /** Thời gian xử lý (ms) */
  durationMs: number;
}
