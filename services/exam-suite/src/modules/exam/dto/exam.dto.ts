import {
  IsString,
  IsInt,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  Min,
  Max,
  Length,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExamType } from '../entities/exam.entity';
import { AttemptStatus } from '../entities/exam-attempt.entity';

// ============================================
// CREATE EXAM (instructor only)
// ============================================

export class CreateExamDto {
  @IsString()
  @Length(1, 255)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;

  @IsEnum(ExamType)
  examType!: ExamType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  timeLimitMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;

  @IsOptional()
  @IsBoolean()
  isRandomized?: boolean;

  @IsOptional()
  @IsBoolean()
  isProctored?: boolean;

  @IsOptional()
  @IsUUID('4')
  courseId?: string;
}

// ============================================
// ANSWER submission (student)
// ============================================

export class SubmitAnswerDto {
  @IsUUID('4')
  questionId!: string;

  @IsOptional()
  @IsString()
  answerText?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  selectedOptionIds?: string[];
}

export class SubmitExamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers!: SubmitAnswerDto[];

  /** Optional metadata (vd: IP, userAgent, browserFingerprint). */
  @IsOptional()
  metadata?: Record<string, unknown>;
}

// ============================================
// GRADE attempt (instructor / auto-grader)
// ============================================

export class GradeAnswerDto {
  @IsUUID('4')
  answerId!: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pointsEarned?: number;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  gradingFeedback?: string;
}

export class GradeAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeAnswerDto)
  grades!: GradeAnswerDto[];

  /** Set false nếu chỉ grade 1 phần (chờ manual). Default: true = final grading. */
  @IsOptional()
  @IsBoolean()
  finalGrading?: boolean;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class ExamResponseDto {
  id!: string;
  courseId?: string;
  instructorId!: string;
  title!: string;
  description?: string;
  examType!: ExamType;
  timeLimitMinutes?: number;
  passingScore?: number;
  maxAttempts?: number;
  isRandomized!: boolean;
  isProctored!: boolean;
  version!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AttemptResponseDto {
  id!: string;
  examId!: string;
  userId!: string;
  status!: AttemptStatus;
  startedAt?: Date;
  submittedAt?: Date;
  gradedAt?: Date;
  timeRemainingSeconds?: number;
  score?: number;
  maxScore?: number;
  percentageScore?: number;
  passed?: boolean;
  questionIds?: string[];
  version!: number;
}
