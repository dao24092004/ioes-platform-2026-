/**
 * Domain enums cho Question Bank - dùng chung giữa các service.
 *
 * Values phải khớp PostgreSQL ENUM type định nghĩa trong Flyway migrations.
 *
 * **Quy ước**: tất cả enum values dùng LOWERCASE_SNAKE_CASE để match PostgreSQL ENUM
 * được define trong V1__init_schema.sql (lowercase values cho PostgreSQL ENUMs).
 *
 * BUG #48 fix: trước đây dùng UPPERCASE → INSERT fail với
 * `invalid input value for enum question_type: "MULTIPLE_CHOICE"`.
 */
export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  MULTIPLE_SELECT = 'multiple_select',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
  CODING = 'coding',
}

export enum Difficulty {
  VERY_EASY = 'very_easy',
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  VERY_HARD = 'very_hard',
}

export enum QuestionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * Numeric difficulty value cho filter dạng number range.
 * Dùng trong search DTO (minDifficulty/maxDifficulty).
 */
export const DIFFICULTY_NUMERIC: Record<Difficulty, number> = {
  [Difficulty.VERY_EASY]: 1,
  [Difficulty.EASY]: 2,
  [Difficulty.MEDIUM]: 3,
  [Difficulty.HARD]: 4,
  [Difficulty.VERY_HARD]: 5,
};

/**
 * Inverse mapping để convert number → Difficulty enum.
 */
export const DIFFICULTY_FROM_NUMERIC: Record<number, Difficulty> = {
  1: Difficulty.VERY_EASY,
  2: Difficulty.EASY,
  3: Difficulty.MEDIUM,
  4: Difficulty.HARD,
  5: Difficulty.VERY_HARD,
};