import { IsObject, IsOptional } from 'class-validator';

/**
 * DTO cho manual grading payload (chỉ dùng cho essay/coding cần instructor chấm).
 * - `manualScores`: map questionId (UUID) → { score, feedback? }
 */
export class GradeExamDto {
  /**
   * Manual scores cho các câu essay/coding.
   * Key: questionId (UUID)
   * Value: { score: số điểm đạt được, 0..points của câu; feedback?: string }
   * Validate chi tiết (câu thuộc attempt, cần chấm tay, khoảng điểm) ở SubmissionService.
   */
  @IsOptional()
  @IsObject()
  manualScores?: Record<string, { score: number; feedback?: string }>;
}
