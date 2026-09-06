import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Difficulty, QuestionType } from '@ioes/common-node';

/** Loại câu hỏi sinh được. CODING nằm ngoài phạm vi: cần test case chạy thật. */
export const GENERATABLE_TYPES = [
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.MULTIPLE_SELECT,
  QuestionType.TRUE_FALSE,
  QuestionType.SHORT_ANSWER,
  QuestionType.ESSAY,
] as const;

export class GenerateQuestionsDto {
  @IsString()
  @MinLength(2, { message: 'Chủ đề quá ngắn' })
  @MaxLength(200, { message: 'Chủ đề tối đa 200 ký tự' })
  topic!: string;

  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  /**
   * Trần, không phải chỉ tiêu — học liệu không đủ căn cứ thì trả về ít hơn.
   * Chặn ở 20 vì mỗi câu kéo theo một lượt gọi mô hình để đối chiếu.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  count?: number;

  @IsOptional()
  @IsEnum(['vi', 'en'])
  language?: 'vi' | 'en';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;

  /** Số đoạn học liệu truy xuất. Bỏ trống thì dùng mặc định của ml-worker. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;
}
