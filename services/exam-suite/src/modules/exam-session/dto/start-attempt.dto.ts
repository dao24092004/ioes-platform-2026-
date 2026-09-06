import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * Request body cho `POST /api/v1/exam-attempts`.
 *
 * Student yêu cầu bắt đầu attempt cho 1 exam.
 *
 * Validation flow:
 * 1. Kiểm tra Student đã enroll exam này (qua content-service)
 * 2. Kiểm tra trong khung thời gian cho phép
 * 3. BR-010: nếu exam >30 phút mà proctoring không bật → 403
 * 4. Tạo exam_attempt + khởi tạo WebSocket session
 */
export class StartAttemptRequestDto {
  @ApiProperty({
    description: 'ID của exam muốn bắt đầu',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'examId must be a valid UUID' })
  @IsNotEmpty()
  examId!: string;
}

/**
 * Response body cho `POST /api/v1/exam-attempts`.
 *
 * Client dùng `wsUrl` + `wsToken` để mở WebSocket kết nối.
 * `deadlineEpochMs` là server authoritative — Client không được tính timer.
 */
export class StartAttemptResponseDto {
  @ApiProperty({ description: 'ID của attempt vừa tạo' })
  attemptId!: string;

  @ApiProperty({ description: 'WebSocket URL để kết nối (vd: ws://exam-suite:9005)' })
  wsUrl!: string;

  @ApiProperty({
    description: 'Deadline tuyệt đối (epoch milliseconds, server time)',
    example: 1724409599000,
  })
  deadlineEpochMs!: number;

  @ApiProperty({ description: 'Thời lượng exam (ms)' })
  durationMs!: number;

  @ApiProperty({
    description: 'Exam có yêu cầu ghi màn hình (FR-PROC-007 optional)',
  })
  screenRecordEnabled!: boolean;

  @ApiProperty({
    description: 'Exam có yêu cầu proctoring (BẮT BUỘC nếu duration > 30 phút — BR-010)',
  })
  proctoringRequired!: boolean;
}