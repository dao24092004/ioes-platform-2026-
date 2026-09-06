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
import { AnswerSaveRequestDto } from './dto/answer-save.dto';
import { AnswerBulkSaveRequestDto } from './dto/reconnect.dto';
import { ExamJoinRequestDto } from './dto/reconnect.dto';
import { SessionCacheService } from './session-cache.service';
import { FrameProcessorService } from './services/frame-processor.service';
import { ViolationCounterService } from './services/violation-counter.service';

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
 * - `exam:error` — lỗi
 *
 * Auth: JWT qua handshake (`auth.token`).
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
    private readonly sessionCache: SessionCacheService,
    private readonly frameProcessor: FrameProcessorService,
    private readonly violationCounter: ViolationCounterService,
  ) {}

  afterInit(): void {
    this.logger.log('WebSocket gateway initialized: /exam-session');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const userId = await this.extractUserId(client);
      if (!userId) {
        client.emit('exam:error', { code: 'UNAUTHORIZED', message: 'Missing token' });
        client.disconnect(true);
        return;
      }
      // Attach userId for later handlers
      (client.data as any).userId = userId;
      this.logger.log(`[ws] connected sid=${client.id} user=${userId}`);
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

  // ========== Proctoring: frame intake (UC_008 bước 9-12) ==========

  /**
   * Client capture khung hình webcam mỗi 1 giây, gửi qua WS đến server.
   *
   * Server:
   * 1. Validate attemptId
   * 2. Gọi FrameProcessorService.processFrame() (gọi ai-suite evaluate)
   * 3. Nếu có violation → emit `proctoring:violation` cho Student
   * 4. Nếu count > threshold → trigger autoSubmit + emit `proctoring:auto-submitted`
   *
   * Exception 9e (mất kết nối ai-suite): processFrame trả no-violation, không emit.
   * Exception 5e (mất WS): handleDisconnect ở trên đã handle timer.
   *
   * Payload: { attemptId, frameBase64, capturedAt? }
   * Client capture với `canvas.toDataURL('image/jpeg', 0.5)` → 1 frame ~30KB.
   */
  @SubscribeMessage('proctoring:frame')
  async onProctoringFrame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { attemptId: string; frameBase64: string; capturedAt?: string },
  ) {
    return this.handleFrame(client, payload);
  }

  /**
   * Testable wrapper — tách riêng để unit test mà không cần thực sự mount WebSocket.
   */
  async handleFrame(
    client: Socket,
    payload: { attemptId: string; frameBase64: string; capturedAt?: string },
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
      });

      if (result.violationType) {
        client.emit('proctoring:violation', {
          type: result.violationType,
          attentionScore: result.attentionScore,
          faceDetected: result.faceDetected,
          violationCount: result.violationCount,
          threshold: 3,
          occurredAt: new Date().toISOString(),
        });
      }

      if (result.shouldAutoSubmit) {
        // BR-013: violation count > 3 → auto-submit + flag
        this.logger.warn(
          `[ws] auto-submit triggered attempt=${payload.attemptId} count=${result.violationCount}`,
        );

        // Clear timer + counter trước khi submit (tránh race với cron auto-submit TIMEOUT)
        const interval = this.timerIntervals.get(client.id);
        if (interval) {
          clearInterval(interval);
          this.timerIntervals.delete(client.id);
        }
        await this.violationCounter.clear(payload.attemptId);

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
            `[ws] auto-submit failed attempt=${payload.attemptId}: ${err instanceof Error ? err.message : String(err)}`,
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

  private async extractUserId(client: Socket): Promise<string | null> {
    // Lấy từ handshake auth hoặc query
    const token =
      (client.handshake.auth?.token as string) ??
      (client.handshake.query?.token as string);
    if (!token) return null;
    // TODO: verify JWT signature; tạm thời parse payload
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      );
      return payload?.sub ?? null;
    } catch {
      return null;
    }
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