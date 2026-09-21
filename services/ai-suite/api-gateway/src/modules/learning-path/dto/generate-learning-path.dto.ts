import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class GenerateLearningPathDto {
  @IsString()
  @MinLength(3, { message: 'Mục tiêu học tập quá ngắn' })
  @MaxLength(500, { message: 'Mục tiêu học tập tối đa 500 ký tự' })
  goal!: string;

  /**
   * Trần 80 giờ/tuần: hơn mức đó là người dùng gõ nhầm, và con số vô lý sẽ
   * kéo theo một lộ trình vô lý mà agent validator không có cách nào sửa.
   */
  @Type(() => Number)
  @IsInt({ message: 'Số giờ mỗi tuần phải là số nguyên' })
  @Min(1)
  @Max(80, { message: 'Số giờ mỗi tuần tối đa 80' })
  hoursPerWeek!: number;

  /** Kỹ năng người học đã có. Bỏ trống thì coi như bắt đầu từ đầu. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, { message: 'Tối đa 50 kỹ năng' })
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  currentSkills?: string[];
}
