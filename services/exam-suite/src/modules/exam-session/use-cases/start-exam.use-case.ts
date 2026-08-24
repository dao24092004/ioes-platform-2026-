import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { StartAttemptRequestDto, StartAttemptResponseDto } from '../dto/start-attempt.dto';
import { ExamSessionRepository } from '../exam-session.repository';
import { SessionCacheService, SessionState } from '../session-cache.service';

/**
 * Token của mỗi UseCase để controller / gateway không cần biết business logic.
 * Inject interface `IStartExamUseCase` ở module layer.
 */
export const START_EXAM_USE_CASE = Symbol.for('START_EXAM_USE_CASE');
export interface IStartExamUseCase {
  execute(userId: string, dto: StartAttemptRequestDto): Promise<StartAttemptResponseDto>;
}

/**
 * Token để tra cứu exam metadata từ content-service (qua Gateway).
 * Tách riêng để dễ mock trong test.
 */
export const CONTENT_SERVICE_CLIENT = Symbol('CONTENT_SERVICE_CLIENT');
export interface IContentServiceClient {
  /**
   * Lấy exam metadata.
   * Trả về null nếu không tồn tại hoặc student không enroll.
   */
  getExamForStudent(
    examId: string,
    userId: string,
  ): Promise<ExamMetadata | null>;
}

export interface ExamMetadata {
  id: string;
  title: string;
  durationMs: number;
  openFrom: Date;
  openUntil: Date;
  screenRecordEnabled: boolean;
  proctoringEnabled: boolean;
  maxScore: number;
  enrollmentId: string;
}

/**
 * UseCase: Khởi tạo phiên thi (UC_008 bước 1-6).
 *
 * Flow:
 * 1. Lookup exam metadata + enrollment qua content-service
 * 2. Validate enrollment + khung giờ
 * 3. BR-010: nếu exam >30 phút mà proctoring tắt → 403
 * 4. Kiểm tra student không có attempt IN_PROGRESS cho exam này
 * 5. Tạo exam_attempt + Redis session
 * 6. Trả wsUrl + deadlineEpochMs cho client
 *
 * Không tạo WebSocket ở đây — gateway sẽ handle khi client `exam:join`.
 */
@Injectable()
export class StartExamUseCase implements IStartExamUseCase {
  private readonly logger = new Logger(StartExamUseCase.name);
  private readonly PROCTORING_REQUIRED_DURATION_MS = 30 * 60 * 1000; // BR-010

  constructor(
    private readonly repository: ExamSessionRepository,
    private readonly sessionCache: SessionCacheService,
    @Inject(CONTENT_SERVICE_CLIENT) private readonly contentClient: IContentServiceClient,
    @Inject('WS_BASE_URL') private readonly wsBaseUrl: string,
    @Inject('APP_NAME') private readonly appName: string,
  ) {}

  async execute(
    userId: string,
    dto: StartAttemptRequestDto,
  ): Promise<StartAttemptResponseDto> {
    this.logger.log(`[start-exam] user=${userId} exam=${dto.examId}`);

    // 1. Lấy exam metadata
    const exam = await this.contentClient.getExamForStudent(dto.examId, userId);
    if (!exam) {
      throw new NotFoundException(
        'Không tìm thấy bài thi hoặc bạn chưa đăng ký khóa học',
      );
    }

    // 2. Validate khung giờ
    const now = Date.now();
    if (now < exam.openFrom.getTime()) {
      throw new ForbiddenException('Bài thi chưa đến giờ mở');
    }
    if (now > exam.openUntil.getTime()) {
      throw new ForbiddenException('Bài thi đã đóng');
    }

    // 3. BR-010: Proctoring bắt buộc cho exam > 30 phút
    if (
      exam.durationMs > this.PROCTORING_REQUIRED_DURATION_MS &&
      !exam.proctoringEnabled
    ) {
      throw new ForbiddenException(
        'Bài thi > 30 phút bắt buộc phải bật chế độ giám sát (BR-010)',
      );
    }

    // 4. Không cho tạo attempt trùng
    const existing = await this.repository.findActiveAttempt(userId, dto.examId);
    if (existing) {
      throw new ForbiddenException(
        `Bạn đang có phiên thi #${existing.id} đang mở — hãy tiếp tục hoặc thoát phiên trước`,
      );
    }

    // 5. Tạo attempt + Redis session
    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + exam.durationMs);
    const ttlSec = Math.ceil(exam.durationMs / 1000) + 300; // +5 min buffer

    const attempt = await this.repository.createAttempt({
      examId: exam.id,
      userId,
      enrollmentId: exam.enrollmentId,
      startedAt,
      deadlineAt,
      status: 'IN_PROGRESS',
      metadata: {
        proctoringEnabled: exam.proctoringEnabled,
        screenRecordEnabled: exam.screenRecordEnabled,
        wsApp: this.appName,
      },
    });

    const sessionState: SessionState = {
      attemptId: attempt.id,
      userId,
      examId: exam.id,
      status: 'IN_PROGRESS',
      deadlineEpochMs: deadlineAt.getTime(),
      screenRecordEnabled: exam.screenRecordEnabled,
      proctoringRequired:
        exam.durationMs > this.PROCTORING_REQUIRED_DURATION_MS,
    };
    await this.sessionCache.setSession(sessionState, ttlSec);
    await this.sessionCache.setDeadline(attempt.id, deadlineAt.getTime(), ttlSec);

    this.logger.log(
      `[start-exam] created attempt=${attempt.id} deadline=${deadlineAt.toISOString()}`,
    );

    return {
      attemptId: attempt.id,
      wsUrl: this.wsBaseUrl,
      deadlineEpochMs: deadlineAt.getTime(),
      durationMs: exam.durationMs,
      screenRecordEnabled: exam.screenRecordEnabled,
      proctoringRequired: sessionState.proctoringRequired,
    };
  }
}

/**
 * Helper: generate request id cho correlation ID (dùng cho log).
 */
export function generateRequestId(): string {
  return randomUUID();
}