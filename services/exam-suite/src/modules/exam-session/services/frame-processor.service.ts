import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  IProctorClient,
  FrameAnalysisRequest,
  FrameAnalysisResponse,
  PROCTOR_CLIENT,
} from './ai-proctor.client';
import {
  ViolationCounterService,
  ViolationEvent,
  ATTENTION_FLAG_THRESHOLD,
  ATTENTION_WARNING_THRESHOLD,
  FACE_NOT_DETECTED_DURATION_MS,
} from './violation-counter.service';

/**
 * Violation types cho UC_008.
 * BR-013: cộng dồn LOW_ATTENTION + FACE_NOT_DETECTED vào threshold.
 * BR-011: attention < 60 → warning; attention < 40 → flag attempt.
 * FR-PROC-006: FACE_NOT_DETECTED > 5s → violation.
 */
export type ViolationType =
  | 'LOW_ATTENTION'
  | 'LOW_ATTENTION_FLAG'   // attention < 40 — flag attempt
  | 'FACE_NOT_DETECTED'    // FACE_NOT_DETECTED > 5s
  | 'MULTIPLE_FACES'
  | 'NO_FACE'
  | 'OFF_SCREEN';

/**
 * BR-011 severity level.
 */
export type AttentionSeverity = 'OK' | 'WARNING' | 'FLAG';

/**
 * Kết quả xử lý 1 frame.
 */
export interface ProcessFrameResult {
  attentionScore: number;
  faceDetected: boolean;
  attentionSeverity: AttentionSeverity;
  /**
   * Loại violation phát hiện trong frame này (nếu có).
   * `undefined` = không vi phạm.
   */
  violationType?: ViolationType;
  /**
   * Violation event ghi vào Redis (nếu có).
   */
  violationEvent?: ViolationEvent;
  /**
   * BR-013: count > threshold (mặc định 3) → caller trigger auto-submit.
   */
  shouldAutoSubmit: boolean;
  /**
   * Số violation hiện tại (sau khi increment).
   */
  violationCount: number;
  /**
   * Attempt đã bị flag (attention < 40) — dùng cho report.
   */
  attemptFlagged: boolean;
}

/**
 * FrameProcessorService — orchestrate violation evaluation cho UC_008.
 *
 * Flow:
 * 1. WS gateway nhận frame từ Student → gọi processFrame()
 * 2. Gọi IProctorClient.analyzeFrame() → lấy kết quả
 * 3. BR-011 evaluation:
 *    - attentionScore < 60 → LOW_ATTENTION (warning)
 *    - attentionScore < 40 → LOW_ATTENTION_FLAG (flag attempt)
 * 4. FR-PROC-006: FACE_NOT_DETECTED → check duration:
 *    - Lần đầu face-not-detected → start timer
 *    - Tiếp tục face-not-detected > 5s → FACE_NOT_DETECTED violation
 *    - Face lại OK → clear timer
 * 5. Nếu có violation → ghi event vào Redis + tăng counter
 * 6. Check threshold BR-013 → return shouldAutoSubmit
 *
 * Nếu proctor call fail: trả no-violation, log warn,
 * KHÔNG tính violation. Student vẫn được phép làm bài.
 */
@Injectable()
export class FrameProcessorService {
  private readonly logger = new Logger(FrameProcessorService.name);

  /** TTL mặc định cho Redis violation key (giây). */
  private readonly ttlSec: number;

  /** BR-013: violation count > threshold (mặc định 3) → auto-submit + flag. */
  private readonly violationThreshold: number;

  constructor(
    // Module bind PROCTOR_CLIENT = Symbol.for('PROCTOR_CLIENT'); string token cũ không resolve được.
    @Inject(PROCTOR_CLIENT) private readonly proctorClient: IProctorClient,
    private readonly counter: ViolationCounterService,
    @Optional() @Inject('VIOLATION_THRESHOLD') violationThreshold?: number,
    @Optional() @Inject('VIOLATION_TTL_SEC') ttlSec?: number,
  ) {
    this.violationThreshold = violationThreshold ?? 3;
    this.ttlSec = ttlSec ?? 1800;
  }

  /**
   * Xử lý 1 frame. KHÔNG throw — exception sẽ bị log và return "no violation".
   */
  async processFrame(req: FrameAnalysisRequest): Promise<ProcessFrameResult> {
    let analysis: FrameAnalysisResponse;
    try {
      analysis = await this.proctorClient.analyzeFrame(req);
    } catch (err) {
      this.logger.warn(
        `[frame-processor] proctor call failed attempt=${req.attemptId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return {
        attentionScore: 0,
        faceDetected: false,
        attentionSeverity: 'OK',
        violationType: undefined,
        shouldAutoSubmit: false,
        violationCount: 0,
        attemptFlagged: false,
      };
    }

    // BR-011: evaluate attention severity
    const attentionSeverity = this.evaluateAttentionSeverity(analysis.attentionScore);
    const attemptFlagged = attentionSeverity === 'FLAG';

    // FR-PROC-006: evaluate FACE_NOT_DETECTED duration
    const faceViolationResult = await this.evaluateFaceNotDetected(
      req.attemptId,
      analysis.faceDetected,
      analysis.faceCount,
    );

    // Determine violation type
    let violationType: ViolationType | undefined;
    let violationEvent: ViolationEvent | undefined;

    // Priority: face violation > attention flag > attention warning
    if (faceViolationResult.isViolation) {
      violationType = 'FACE_NOT_DETECTED';
      violationEvent = {
        type: 'FACE_NOT_DETECTED',
        startedAt: faceViolationResult.startedAt,
        endedAt: new Date().toISOString(),
        durationMs: faceViolationResult.durationMs,
      };
    } else if (attentionSeverity === 'FLAG') {
      violationType = 'LOW_ATTENTION_FLAG';
      violationEvent = {
        type: 'LOW_ATTENTION_FLAG',
        startedAt: new Date().toISOString(),
      };
    } else if (attentionSeverity === 'WARNING') {
      violationType = 'LOW_ATTENTION';
      violationEvent = {
        type: 'LOW_ATTENTION',
        startedAt: new Date().toISOString(),
      };
    }

    let violationCount = 0;
    let shouldAutoSubmit = false;

    if (violationType && violationEvent) {
      violationCount = await this.counter.recordViolation(
        req.attemptId,
        violationEvent,
        this.ttlSec,
      );
      shouldAutoSubmit = await this.counter.isOverThreshold(
        req.attemptId,
        this.violationThreshold,
      );

      this.logger.warn(
        `[frame-processor] violation attempt=${req.attemptId} type=${violationType} ` +
          `count=${violationCount} threshold=${this.violationThreshold} ` +
          `shouldAutoSubmit=${shouldAutoSubmit} flagged=${attemptFlagged}`,
      );
    }

    return {
      attentionScore: analysis.attentionScore,
      faceDetected: analysis.faceDetected,
      attentionSeverity,
      violationType,
      violationEvent,
      shouldAutoSubmit,
      violationCount,
      attemptFlagged,
    };
  }

  /**
   * BR-011: classify attention severity.
   */
  private evaluateAttentionSeverity(attentionScore: number): AttentionSeverity {
    if (attentionScore < ATTENTION_FLAG_THRESHOLD) return 'FLAG';
    if (attentionScore < ATTENTION_WARNING_THRESHOLD) return 'WARNING';
    return 'OK';
  }

  /**
   * FR-PROC-006: track FACE_NOT_DETECTED duration.
   *
   * - Lần đầu face-not-detected → ghi timestamp vào Redis
   * - Tiếp tục face-not-detected → check duration > 5s → violation
   * - Face OK → clear timer
   *
   * @returns violation result
   */
  private async evaluateFaceNotDetected(
    attemptId: string,
    faceDetected: boolean,
    faceCount: number,
  ): Promise<{ isViolation: boolean; durationMs: number; startedAt: string }> {
    const hasNoFace = !faceDetected || faceCount === 0;

    if (hasNoFace) {
      const existingDuration = await this.counter.getFaceNotDetectedDurationMs(attemptId);

      if (existingDuration === null) {
        // Lần đầu: ghi timestamp bắt đầu
        await this.counter.startFaceNotDetected(attemptId, this.ttlSec);
        return { isViolation: false, durationMs: 0, startedAt: new Date().toISOString() };
      }

      // Đã tracking: check xem đủ 5s chưa
      if (existingDuration >= FACE_NOT_DETECTED_DURATION_MS) {
        const startTs = Date.now() - existingDuration;
        return {
          isViolation: true,
          durationMs: existingDuration,
          startedAt: new Date(startTs).toISOString(),
        };
      }

      // Chưa đủ 5s
      return { isViolation: false, durationMs: existingDuration, startedAt: new Date(Date.now() - existingDuration).toISOString() };
    }

    // Face OK: clear timer nếu đang tracking
    await this.counter.clearFaceNotDetected(attemptId);
    return { isViolation: false, durationMs: 0, startedAt: '' };
  }
}
