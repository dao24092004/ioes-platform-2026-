import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListRecommendationsDto {
  /**
   * Số khoá muốn nhận. Bỏ trống thì dùng mặc định trong cấu hình (6).
   *
   * Cần `@Type(() => Number)` vì query string luôn là chuỗi và ValidationPipe
   * toàn cục không bật `enableImplicitConversion` — thiếu nó thì `@IsInt` rớt
   * ngay cả với `?limit=6`.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1)
  @Max(24, { message: 'limit tối đa 24' })
  limit?: number;
}
