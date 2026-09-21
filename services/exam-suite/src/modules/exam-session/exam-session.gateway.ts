import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { validate as isUuid } from 'uuid';
import { ExamSessionService } from './exam-session.service';
import { ExamSessionRepository } from './exam-session.repository';
import { AnswerSaveRequestDto } from './dto/answer-save.dto';
import { AnswerBulkSaveRequestDto } from './dto/reconnect.dto';
import { ExamJoinRequestDto } from './dto/reconnect.dto';
import { SessionCacheService } from './session-cache.service';
import { FrameProcessorService } from './services/frame-processor.service';
import { ViolationCounterService } from './services/violation-counter.service';
import { verifyAccessToken } from '../../common/auth/jwt-auth.config';

/**
 * Khung hình client gửi lên (`proctoring:frame`).
 *
 * `frameBase64` là base64 trần — web đã cắt tiền tố `data:image/jpeg;base64,`
 * trước khi gửi, và HttpProctorClient cắt lại lần nữa ở ranh giới service.
 */
export interface ProctoringFramePayload {
  attemptId: string;
  frameBase64: string;
  capturedAt?: string;
  /** Số thứ tự khung trong phiên — ml-worker dùng để ghép chuỗi thời gian. */
  sequenceId?: number;
}

/**
 * WebSocket Gateway cho Student khi đang thi (UC_008).
 *
 * Namespace: `/exam-session`
 *
 * Events (client → server):
 * - `exam:join` — tham gia phiên
 * - `exam:answer:save` — auto-save 1 câu (BR-012)
 * - `exam:answer:bulk-save` — batch save (reconnect)
 * - `exam:submit` — manual submit
 *
 * Events (server → client):
 * - `exam:session-info` — session metadata sau khi join
 * - `exam:timer` — timer push mỗi 1 giây (server authoritative)
 * - `exam:answer:saved` — xác nhận save
 * - `exam:auto-submitted` — bị auto-submit
 * - `proctoring:status` — trạng thái giám thị mỗi khung (điểm chú ý, có mặt
 *   hay không, hướng nhìn, số vi phạm/ngưỡng)
 * - `proctoring:violation` — mở một đợt vi phạm mới
 * - `proctoring:flagged` — attempt bị gắn cờ (BR-011, attention < 40)
 * - `proctoring:auto-submitted` — vượt ngưỡng BR-013, đã nộp tự động
 * - `exam:error` — lỗi
 *
 * Auth: JWT qua handshake (`auth.token`, `?token=` hoặc header `Authorization: Bearer`).
 * Token được verify chữ ký + exp + iss (cùng cấu hình với JwtAuthGuard);
 * không hợp lệ → emit `exam:error` UNAUTHORIZED rồi ngắt kết nối.
 * Timer push bắt đầu sau khi `exam:join` thành công.
 */
@WebSocketGateway({
  namespace: '/exam-session',
  cors: {
    origin: (process.env.WS_CORS_ORIGINS ?? 'http://localhost:3000').split(','),
    credentials: true,
  },
})
export class ExamSessionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ExamSessionGateway.name);

  @WebSocketServer()
  server!: Namespace;

  /** Track timer interval theo socket id → clear khi rời */
  private readonly timerIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly examSessionService: ExamSessionService,
    private readonly repository: ExamSessionRepository,
    private readonly sessionCache: SessionCacheService,
    private readonly frameProcessor: FrameProcessorService,
    private readonly violationCounter: ViolationCounterService,
  ) {}

  afterInit(): void {
    this.logger.log('WebSocket gateway initialized: /exam-session');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.emit('exam:error', { code: 'UNAUTHORIZED', message: 'Missing token' });
        client.disconnect(true);
        return;
      }
      let principal: ReturnType<typeof verifyAccessToken>;
      try {
        principal = verifyAccessToken(token);
      } catch (err) {
        this.logger.warn(
          `[ws] rejected sid=${client.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        client.emit('exam:error', { code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
        client.disconnect(true);
        return;
      }
      // Attach principal for later handlers
      (client.data as any).userId = principal.userId;
      (client.data as any).role = principal.role;
      this.logger.log(`[ws] connected sid=${client.id} user=${principal.userId}`);
    } catch (err) {
      this.logger.error(`[ws] connection error: ${err}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    // Clear timer nếu có
    const interval = this.timerIntervals.get(client.id);
    if (interval) {
      clearInterval(interval);
      this.timerIntervals.delete(client.id);
    }
    this.logger.log(`[ws] disconnected sid=${client.id}`);
  }

  // ========== Client → Server ==========

  @SubscribeMessage('exam:join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ExamJoinRequestDto,
  ) {
    if (!payload?.attemptId || !isUuid(payload.attemptId)) {
      throw new WsException({ code: 'INVALID_INPUT', message: 'attemptId không hợp lệ' });
    }

    const userId = (client.data as any).userId as string;

    try {
      const state = await this.examSessionService.reconnect(userId, payload.attemptId);
      // Join room = attemptId để broadcast tới room
      await client.join(`attempt:${payload.attemptId}`);

      // Track ws session
      const ttl = Math.ceil(state.remainingMs / 1000) + 300;
      await this.sessionCache.setStudentWsSession(
        payload.attemptId,
        client.id,
        ttl,
      );

      // Gửi session info
      client.emit('exam:session-info', {
        attemptId: state.attemptId,
        deadlineEpochMs: state.deadlineEpochMs,
        remainingMs: state.remainingMs,
        drafts: state.drafts,
      });

      // Bắt đầu timer push 1Hz (server authoritative)
      this.startTimerPush(client, payload.attemptId, state.deadlineEpochMs);

      return { success: true, attemptId: payload.attemptId };
    } catch (err: any) {
      client.emit('exam:error', {
        code: err?.name ?? 'JOIN_FAILED',
        message: err?.message ?? 'Không thể tham gia phiên',
      });
      return { success: false };
    }
  }

  @SubscribeMessage('exam:answer:save')
  async onSaveAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AnswerSaveRequestDto,
  ) {
    const userId = (client.data as any).userId as string;
    try {
      const result = await this.examSessionService.saveAnswer(userId, payload);
      client.emit('exam:answer:saved', {
        questionId: payload.questionId,
        savedAt: result.savedAt.toISOString(),
      });
      return { success: true };
    } catch (err: any) {
      client.emit('exam:error', {
        code: err?.name ?? 'SAVE_FAILED',
        message: err?.message ?? 'Không thể lưu',
      });
      return { success: false };
    }
  }

  @SubscribeMessage('exam:answer:bulk-save')
  async onBulkSave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AnswerBulkSaveRequestDto,
  ) {
    const userId = (client.data as any).userId as string;
    try {
      const result = await this.examSessionService.bulkSaveAnswers(userId, payload);
      return { success: true, ...result };
    } catch (err: any) {
      client.emit('exam:error', {
        code: 'BULK_SAVE_FAILED',
        message: err?.message ?? 'Không thể lưu hàng loạt',
      });
      return { success: false };
    }
  }

  @SubscribeMessage('exam:submit')
  async onSubmit(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { attemptId: string },
  ) {
    const userId = (client.data as any).userId as string;
    try {
      const result = await this.examSessionService.submitManually(userId, payload.attemptId);
      // Clear timer
      const interval = this.timerIntervals.get(client.id);
      if (interval) {
        clearInterval(interval);
        this.timerIntervals.delete(client.id);
      }
      client.emit('exam:graded', {
        attemptId: payload.attemptId,
        submissionId: result.submissionId,
      });
      return { success: true, ...result };
    } catch (err: any) {
      client.emit('exam:error', {
        code: 'SUBMIT_FAILED',
        message: err?.message ?? 'Không thể nộp bài',
      });
      return { success: false };
    }
  }

  /**
   * Proctoring: frame intake (UC_008 bước 9-12).
   *
   * Client capture webcam mỗi 1 giây, gửi qua WS đến server.
   *
   * Server:
   * 1. Validate attemptId
   * 2. Gọi FrameProcessorService.processFrame()
   * 3. Luôn emit `proctoring:status` — thí sinh thấy đúng thứ giám thị thấy
   * 4. Mở đợt vi phạm mới → emit `proctoring:violation`
   * 5. Nếu attemptFlagged (attention < 40) → emit `proctoring:flagged` (1 lần/socket)
   * 6. Nếu count > threshold → trigger autoSubmit + emit `proctoring:auto-submitted`
   *
   * FR-PROC-005: faceCount > 1 → MULTIPLE_FACES
   * FR-PROC-006: FACE_NOT_DETECTED > 5s → violation
   * BR-011: attention < 60 → warning; < 40 → flag
   * BR-013: violation count > 3 → auto-submit
   *
   * Exception 9e (mất kết nối ml-worker): processFrame trả no-violation và
   * `proctorAvailable: false`; vẫn emit status với `available: false` để giao
   * diện báo "đang mất kết nối giám thị" thay vì im lặng.
   *
   * Payload: { attemptId, frameBase64, capturedAt?, sequenceId? }
   */
  @SubscribeMessage('proctoring:frame')
  async onProctoringFrame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ProctoringFramePayload,
  ) {
    return this.handleFrame(client, payload);
  }

  /**
   * Testable wrapper — tách riêng để unit test mà không cần thực sự mount WebSocket.
   */
  async handleFrame(
    client: Socket,
    payload: ProctoringFramePayload,
  ): Promise<{ success: boolean }> {
    if (!payload?.attemptId || !isUuid(payload.attemptId)) {
      client.emit('proctoring:error', {
        code: 'INVALID_INPUT',
        message: 'attemptId không hợp lệ hoặc thiếu frameBase64',
      });
      return { success: false };
    }

    try {
      const result = await this.frameProcessor.processFrame({
        attemptId: payload.attemptId,
        capturedAt: payload.capturedAt ? new Date(payload.capturedAt) : new Date(),
        frameBase64: payload.frameBase64,
        sequenceId: payload.sequenceId,
      });

      // Trạng thái liên tục cho thí sinh (FR-PROC-001/005/006/008): mỗi khung
      // một lần, kể cả khung sạch. Không có nó thì màn hình chỉ sáng lên khi
      // đã vi phạm — thí sinh không biết máy đang "thấy" mình thế nào và không
      // có cơ hội tự chỉnh lại tư thế trước khi bị tính lỗi.
      client.emit('proctoring:status', {
        attemptId: payload.attemptId,
        available: result.proctorAvailable,
        attentionScore: result.attentionScore,
        attentionSeverity: result.attentionSeverity,
        faceDetected: result.faceDetected,
        faceCount: result.faceCount,
        gazeDirection: result.gazeDirection ?? null,
        violationCount: result.violationCount,
        threshold: result.violationThreshold,
        activeViolation: result.violationType ?? null,
        flagged: result.attemptFlagged,
        observedAt: new Date().toISOString(),
      });

      // Emit violation event to Student — chỉ khi mở đợt vi phạm mới. Ở 1 Hz,
      // bắn mỗi khung sẽ là ~60 sự kiện/phút cho cùng một hành vi.
      if (result.violationType && result.violationRecorded) {
        client.emit('proctoring:violation', {
          type: result.violationType,
          attentionScore: result.attentionScore,
          attentionSeverity: result.attentionSeverity,
          faceDetected: result.faceDetected,
          faceCount: result.faceCount,
          gazeDirection: result.gazeDirection ?? null,
          violationCount: result.violationCount,
          threshold: result.violationThreshold,
          violationEvent: result.violationEvent,
          occurredAt: new Date().toISOString(),
        });
      }

      // BR-011: attention < 40 → flag attempt, emit warning to Student.
      // Chỉ một lần cho mỗi socket: ở 1 Hz, điều kiện này đúng liên tục và sẽ
      // ghi DB mỗi giây nếu không chặn.
      if (result.attemptFlagged && !(client.data as any).proctoringFlagged) {
        (client.data as any).proctoringFlagged = true;
        client.emit('proctoring:flagged', {
          attemptId: payload.attemptId,
          attentionScore: result.attentionScore,
          message: 'Mức chú ý quá thấp — bài thi sẽ bị đánh dấu để giảng viên xem xét',
          occurredAt: new Date().toISOString(),
        });
        // Ghi flag vào DB
        await this.repository.updateAttemptFlag(
          payload.attemptId,
          true,
          `LOW_ATTENTION_FLAG: attention=${result.attentionScore}`,
        );
        this.logger.warn(
          `[ws] attempt flagged attempt=${payload.attemptId} attention=${result.attentionScore}`,
        );
      }

      // BR-013: violation count > 3 → auto-submit + flag
      if (result.shouldAutoSubmit) {
        this.logger.warn(
          `[ws] auto-submit triggered attempt=${payload.attemptId} count=${result.violationCount}`,
        );

        const interval = this.timerIntervals.get(client.id);
        if (interval) {
          clearInterval(interval);
          this.timerIntervals.delete(client.id);
        }
        await this.violationCounter.clearAll(payload.attemptId);

        try {
          const submitted = await this.examSessionService.autoSubmit(
            payload.attemptId,
            'AUTO_FLAG',
          );

          client.emit('proctoring:auto-submitted', {
            attemptId: payload.attemptId,
            submissionId: submitted.submissionId,
            flagged: submitted.flagged,
            reason: 'BR-013: violation count exceeded threshold',
            occurredAt: new Date().toISOString(),
          });
        } catch (err) {
          this.logger.error(
            `[ws] auto-submit failed attempt=${payload.attemptId}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          client.emit('proctoring:error', {
            code: 'AUTO_SUBMIT_FAILED',
            message: 'Không thể auto-submit do vi phạm',
          });
        }
      }

      return { success: true };
    } catch (err) {
      this.logger.error(
        `[ws] proctoring:frame error: ${err instanceof Error ? err.message : String(err)}`,
      );
      client.emit('proctoring:error', {
        code: 'PROCESS_FAILED',
        message: err instanceof Error ? err.message : 'Lỗi xử lý frame',
      });
      return { success: false };
    }
  }

  // ========== Private helpers ==========

  /** Lấy raw token từ handshake auth, query hoặc header Authorization. */
  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token;
    if (typeof fromAuth === 'string' && fromAuth) {
      return fromAuth.startsWith('Bearer ') ? fromAuth.substring(7) : fromAuth;
    }
    const fromQuery = client.handshake.query?.token;
    if (typeof fromQuery === 'string' && fromQuery) return fromQuery;
    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.substring(7);
    }
    return null;
  }

  private startTimerPush(client: Socket, attemptId: string, deadlineEpochMs: number) {
    // Clear interval cũ nếu có
    const old = this.timerIntervals.get(client.id);
    if (old) clearInterval(old);

    const interval = setInterval(() => {
      const remainingMs = deadlineEpochMs - Date.now();
      if (remainingMs <= 0) {
        client.emit('exam:timer', { remainingMs: 0 });
        // Hết giờ → trigger auto-submit qua service
        // (sẽ implement trong timer.scheduler ở PR sau)
        clearInterval(interval);
        this.timerIntervals.delete(client.id);
        return;
      }
      client.emit('exam:timer', { remainingMs });
    }, 1000);

    this.timerIntervals.set(client.id, interval);
  }
}