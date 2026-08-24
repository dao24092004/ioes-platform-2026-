import { IsObject, IsOptional } from 'class-validator';

/**
 * DTO cho manual grading payload (chỉ dùng cho essay/coding cần instructor chấm).
 * - `manualScores`: map questionId (UUID) → score (0-100)
 */
export class GradeExamDto {
  /**
   * Manual scores cho các câu essay/coding.
   * Key: questionId (UUID)
   * Value: { score: number (0-100), feedback?: string }
   */
  @IsOptional()
  @IsObject()
  manualScores?: Record<string, { score: number; feedback?: string }>;
}
