import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1, { message: 'Câu hỏi không được để trống' })
  @MaxLength(4000, { message: 'Câu hỏi tối đa 4000 ký tự' })
  question!: string;

  /** Bỏ trống thì tạo phiên mới. */
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  /** Số đoạn truy xuất. Bỏ trống thì dùng mặc định của ml-worker. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;
}
