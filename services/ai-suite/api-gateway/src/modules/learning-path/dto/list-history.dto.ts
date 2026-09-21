import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListHistoryDto {
  /** Số lộ trình gần nhất. Bỏ trống thì 10. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1)
  @Max(50, { message: 'limit tối đa 50' })
  limit?: number;
}
