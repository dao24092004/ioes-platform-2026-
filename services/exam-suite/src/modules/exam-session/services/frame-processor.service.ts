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
  VIOLATION_COOLDOWN_SEC,
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
  /** Số khuôn mặt trong khung — > 1 là MULTIPLE_FACES (FR-PROC-005). */
  faceCount: number;
  /** Hướng nhìn ml-worker suy ra; hiển thị cho thí sinh chứ không tự sinh vi phạm. */
  gazeDirection?: 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'OUT_OF_FRAME';
  attentionSeverity: AttentionSeverity;
  /**
   * false khi không gọi được ml-worker (exception 9e). Các số trong kết quả
   * lúc đó là giá trị trống, KHÔNG phải kết luận "không thấy mặt" — gateway
   * dùng cờ này để báo "đang mất kết nối giám thị" thay vì doạ thí sinh.
   */
  proctorAvailable: boolean;
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
   * Số violation hiện tại của attempt (kể cả khung này không vi phạm) — panel
   * của thí sinh hiển thị "x/ngưỡng" liên tục nên cần số thật mọi lúc.
   */
  violationCount: number;
  /** BR-013: ngưỡng đang áp dụng, để gateway khỏi hard-code lại. */
  violationThreshold: number;
  /**
   * true khi khung này mở một đợt vi phạm mới (đã ghi vào Redis). false khi
   * vi phạm vẫn đang trong khoảng lặng của đợt trước.
   */
  violationRecorded: boolean;
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

  /** Khoảng lặng giữa hai violation cùng loại (giây) — xem VIOLATION_COOLDOWN_SEC. */
  private readonly cooldownSec: number;

  constructor(
    // Module bind PROCTOR_CLIENT = Symbol.for('PROCTOR_CLIENT'); string token cũ không resolve được.
    @Inject(PROCTOR_CLIENT) private readonly proctorClient: IProctorClient,
    private readonly counter: ViolationCounterService,
    @Optional() @Inject('VIOLATION_THRESHOLD') violationThreshold?: number,
    @Optional() @Inject('VIOLATION_TTL_SEC') ttlSec?: number,
    @Optional() @Inject('VIOLATION_COOLDOWN_SEC') cooldownSec?: number,
  ) {
    this.violationThreshold = violationThreshold ?? 3;
    this.ttlSec = ttlSec ?? 1800;
    this.cooldownSec = cooldownSec ?? VIOLATION_COOLDOWN_SEC;
  }

  /** BR-013 threshold đang áp dụng — gateway gửi kèm cho client hiển thị. */
  get threshold(): number {
    return this.violationThreshold;
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
        faceCount: 0,
        attentionSeverity: 'OK',
        proctorAvailable: false,
        violationType: undefined,
        shouldAutoSubmit: false,
        violationCount: await this.currentCount(req.attemptId),
        violationThreshold: this.violationThreshold,
        violationRecorded: false,
        attemptFlagged: false,
      };
    }

    // BR-011: evaluate attention severity
    const attentionSeverity = this.evaluateAttentionSeverity(analysis.attentionScore);
    const attemptFlagged = attentionSeverity === 'FLAG';

    // ml-worker báo NO_FACE nhưng quên hạ `faceDetected` thì vẫn phải coi là
    // không có mặt — hợp đồng cho phép cả hai cách diễn đạt.
    const faceDetected = analysis.faceDetected && analysis.violationType !== 'NO_FACE';

    // FR-PROC-006: evaluate FACE_NOT_DETECTED duration
    const faceViolationResult = await this.evaluateFaceNotDetected(
      req.attemptId,
      faceDetected,
      analysis.faceCount,
    );

    // FR-PROC-005: hơn một khuôn mặt trong khung → vi phạm ngay, không có 5
    // giây ân hạn như FACE_NOT_DETECTED: có người thứ hai ngồi cạnh là sự kiện
    // rõ ràng chứ không phải nhiễu nhận dạng.
    const multipleFaces =
      analysis.faceCount > 1 || analysis.violationType === 'MULTIPLE_FACES';

    // Determine violation type
    let violationType: ViolationType | undefined;
    let violationEvent: ViolationEvent | undefined;

    // Ưu tiên: nhiều mặt > mất mặt > gắn cờ chú ý > cảnh báo chú ý.
    // `OFF_SCREEN` của ml-worker KHÔNG tự thành vi phạm: liếc ra ngoài khung
    // một nhịp là chuyện bình thường, và nó đã kéo `attentionScore` xuống rồi —
    // tính thêm một lần nữa là phạt kép cùng một hành vi.
    if (multipleFaces) {
      violationType = 'MULTIPLE_FACES';
      violationEvent = {
        type: 'MULTIPLE_FACES',
        startedAt: new Date().toISOString(),
      };
    } else if (faceViolationResult.isViolation) {
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
    let violationRecorded = false;

    if (violationType && violationEvent) {
      // Ở 1 Hz, cùng một hành vi sinh ra vi phạm mỗi giây. Chỉ ghi một lần cho
      // mỗi đợt, nếu không ngưỡng BR-013 (>3) bị chạm sau 4 giây.
      violationRecorded = await this.counter.tryStartViolationEpisode(
        req.attemptId,
        violationType,
        this.cooldownSec,
      );

      if (violationRecorded) {
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
      } else {
        // Vẫn đang trong đợt cũ: báo trạng thái cho thí sinh nhưng không đếm thêm.
        violationCount = await this.currentCount(req.attemptId);
      }
    } else {
      violationCount = await this.currentCount(req.attemptId);
    }

    return {
      attentionScore: analysis.attentionScore,
      faceDetected,
      faceCount: analysis.faceCount,
      gazeDirection: analysis.gazeDirection,
      attentionSeverity,
      proctorAvailable: true,
      violationType,
      violationEvent,
      shouldAutoSubmit,
      violationCount,
      violationThreshold: this.violationThreshold,
      violationRecorded,
      attemptFlagged,
    };
  }

  /** Số vi phạm đang lưu; lỗi Redis không được làm hỏng cả frame. */
  private async currentCount(attemptId: string): Promise<number> {
    try {
      return (await this.counter.getCount(attemptId)) ?? 0;
    } catch {
      return 0;
    }
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
