import { Inject, Injectable, Logger } from '@nestjs/common';
import { IProctorClient, FrameAnalysisRequest, FrameAnalysisResponse } from './ai-proctor.client';
import { ViolationCounterService } from './violation-counter.service';

/**
 * Violation types cho UC_008.
 * BR-013: chỉ tính LOW_ATTENTION + FACE_NOT_DETECTED (cộng dồn vào threshold).
 */
export type ViolationType = 'LOW_ATTENTION' | 'FACE_NOT_DETECTED' | 'MULTIPLE_FACES' | 'NO_FACE' | 'OFF_SCREEN';

/**
 * Kết quả xử lý 1 frame.
 */
export interface ProcessFrameResult {
  attentionScore: number;
  faceDetected: boolean;
  /**
   * Loại violation phát hiện trong frame này (nếu có).
   * `undefined` = không vi phạm.
   */
  violationType?: ViolationType;
  /**
   * BR-013: count > threshold (mặc định 3) → caller trigger auto-submit.
   */
  shouldAutoSubmit: boolean;
  /**
   * Số violation hiện tại (sau khi increment).
   */
  violationCount: number;
}

/**
 * FrameProcessorService — orchestrate violation evaluation cho UC_008.
 *
 * Flow:
 * 1. WS gateway nhận frame từ Student → gọi processFrame()
 * 2. Gọi IProctorClient.analyzeFrame() → lấy kết quả
 * 3. Đánh giá violation theo BR-011:
 *    - attentionScore < 60 → LOW_ATTENTION
 *    - !faceDetected hoặc faceCount === 0 → FACE_NOT_DETECTED
 * 4. Nếu có violation → tăng counter (Redis)
 * 5. Check threshold BR-013 → return shouldAutoSubmit
 *
 * Nếu proctor call fail (exception 9e trong BA): trả no-violation, log warn,
 * KHÔNG tính violation. Student vẫn được phép làm bài.
 */
@Injectable()
export class FrameProcessorService {
  private readonly logger = new Logger(FrameProcessorService.name);

  /** BR-011: < 60 → LOW_ATTENTION. */
  private static readonly ATTENTION_THRESHOLD = 60;

  /** BR-013: violation count > 3 → auto-submit + flag. */
  private readonly violationThreshold: number;

  /** TTL mặc định cho Redis violation key (giây). */
  private readonly ttlSec: number;

  constructor(
    @Inject('PROCTOR_CLIENT') private readonly proctorClient: IProctorClient,
    private readonly counter: ViolationCounterService,
    violationThreshold: number = 3,
    ttlSec: number = 1800,
  ) {
    this.violationThreshold = violationThreshold;
    this.ttlSec = ttlSec;
  }

  /**
   * Xử lý 1 frame. KHÔNG throw — exception sẽ bị log và return "no violation".
   */
  async processFrame(req: FrameAnalysisRequest): Promise<ProcessFrameResult> {
    let analysis: FrameAnalysisResponse;
    try {
      analysis = await this.proctorClient.analyzeFrame(req);
    } catch (err) {
      // Exception 9e (mất kết nối ai-suite): không tính violation, log để Instructor xem.
      this.logger.warn(
        `[frame-processor] proctor call failed attempt=${req.attemptId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        attentionScore: 0,
        faceDetected: false,
        violationType: undefined,
        shouldAutoSubmit: false,
        violationCount: 0,
      };
    }

    // BR-011: evaluate violation
    const violationType = this.evaluateViolation(analysis);

    let violationCount = 0;
    let shouldAutoSubmit = false;

    if (violationType) {
      violationCount = await this.counter.increment(req.attemptId, this.ttlSec);
      shouldAutoSubmit = await this.counter.isOverThreshold(
        req.attemptId,
        this.violationThreshold,
      );
      this.logger.warn(
        `[frame-processor] violation attempt=${req.attemptId} type=${violationType} ` +
          `count=${violationCount} threshold=${this.violationThreshold} shouldAutoSubmit=${shouldAutoSubmit}`,
      );
    }

    return {
      attentionScore: analysis.attentionScore,
      faceDetected: analysis.faceDetected,
      violationType,
      shouldAutoSubmit,
      violationCount,
    };
  }

  /**
   * BR-011 evaluation.
   * - attentionScore < 60 → LOW_ATTENTION
   * - faceCount === 0 hoặc !faceDetected → FACE_NOT_DETECTED
   * - faceCount > 1 → MULTIPLE_FACES (BR mở rộng sau)
   */
  private evaluateViolation(analysis: FrameAnalysisResponse): ViolationType | undefined {
    if (analysis.faceCount === 0 || !analysis.faceDetected) {
      return 'FACE_NOT_DETECTED';
    }
    if (analysis.attentionScore < FrameProcessorService.ATTENTION_THRESHOLD) {
      return 'LOW_ATTENTION';
    }
    if (analysis.faceCount > 1) {
      return 'MULTIPLE_FACES';
    }
    return undefined;
  }
}