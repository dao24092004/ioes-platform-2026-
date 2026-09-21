import { Injectable, Logger } from '@nestjs/common';

/**
 * Symbol để bind client trong NestJS DI container.
 */
export const PROCTOR_CLIENT = Symbol.for('PROCTOR_CLIENT');

/**
 * Request payload gửi sang ai-suite/proctor-service.
 *
 * Phase này: gửi base64 của 1 frame JPEG.
 * Phase sau (real AI): có thể gửi batch 5-10 frames để LSTM xử lý sequence.
 */
export interface FrameAnalysisRequest {
  attemptId: string;
  capturedAt: Date;
  frameBase64: string;
  /**
   * Optional: sequence ID để LSTM ghép frame theo thời gian.
   * Phase 1: không dùng.
   */
  sequenceId?: number;
}

/**
 * Response từ ai-suite/proctor-service.
 */
export interface FrameAnalysisResponse {
  faceDetected: boolean;
  faceCount: number;
  /**
   * BR-011: < 60 → sinh Violation `LOW_ATTENTION`.
   * Range: 0-100.
   */
  attentionScore: number;
  gazeDirection?: 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'OUT_OF_FRAME';
  /**
   * Nếu frame này gây vi phạm ngay, client sẽ đánh dấu.
   * Các loại: LOW_ATTENTION, FACE_NOT_DETECTED, MULTIPLE_FACES, NO_FACE, OFF_SCREEN.
   * Phase 1 mock KHÔNG set.
   */
  violationType?: 'LOW_ATTENTION' | 'FACE_NOT_DETECTED' | 'MULTIPLE_FACES' | 'NO_FACE' | 'OFF_SCREEN';
}

/**
 * Interface cho AI Proctor client.
 *
 * Inject qua DI token `PROCTOR_CLIENT` — chọn `MockProctorClient` (dev) hoặc
 * `HttpProctorClient` (prod/dev-with-ai-suite) theo env.
 */
export interface IProctorClient {
  analyzeFrame(req: FrameAnalysisRequest): Promise<FrameAnalysisResponse>;
}

/**
 * Cắt tiền tố data-URI (`data:image/jpeg;base64,`) nếu còn sót.
 * Hợp đồng FR-AI-006 quy định `frameBase64` là base64 trần.
 */
export function stripDataUriPrefix(frame: string): string {
  if (!frame) return frame;
  const marker = ';base64,';
  const at = frame.indexOf(marker);
  return at === -1 ? frame : frame.slice(at + marker.length);
}

/**
 * Mock client — CHỈ dùng khi bật tường minh `DEV_MOCK_AI_PROCTOR=true`
 * (xem shouldUseMockAiProctor() trong exam-session.module.ts, nơi log cảnh báo).
 *
 * Trả về: face OK, attention = 80 (cao, không vi phạm BR-011).
 * → student không bao giờ bị flag khi dùng mock.
 */
@Injectable()
export class MockProctorClient implements IProctorClient {
  async analyzeFrame(_req: FrameAnalysisRequest): Promise<FrameAnalysisResponse> {
    return {
      faceDetected: true,
      faceCount: 1,
      attentionScore: 80,
      gazeDirection: 'CENTER',
      // violationType: undefined → không sinh violation
    };
  }
}

/**
 * HTTP client — gọi sang ml-worker qua REST nội bộ.
 *
 * Hợp đồng (docs/02-architecture/AI_FEATURES_CONTRACT.md §4 — FR-AI-006):
 *   POST {baseUrl}/internal/ai/proctor/analyze
 *   body     { attemptId, capturedAt: ISO-8601, frameBase64, sequenceId? }
 *   response { faceDetected, faceCount, attentionScore, gazeDirection, violationType }
 *
 * Timeout mặc định 3000ms — lớn hơn nhịp chụp 1s của client, nên khi ml-worker
 * chậm thì các frame sau vẫn được gửi; FrameProcessorService nuốt lỗi và coi
 * frame là "không vi phạm" chứ không chặn WebSocket.
 */
@Injectable()
export class HttpProctorClient implements IProctorClient {
  private readonly logger = new Logger(HttpProctorClient.name);

  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number = 3000,
  ) {}

  async analyzeFrame(req: FrameAnalysisRequest): Promise<FrameAnalysisResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(
        `${this.baseUrl.replace(/\/+$/, '')}/internal/ai/proctor/analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.toWirePayload(req)),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(
          `proctor API returned ${response.status} ${response.statusText}`,
        );
      }

      return this.normalizeResponse(await response.json());
    } catch (err) {
      this.logger.error(
        `[http-proctor] call failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Dựng body đúng hợp đồng thay vì `JSON.stringify(req)` thẳng:
   *
   * - `capturedAt` phải là chuỗi ISO-8601. Gateway có thể truyền `Date` hoặc
   *   chuỗi có sẵn; `new Date(...)` hỏng thì rơi về thời điểm hiện tại chứ
   *   không gửi `"Invalid Date"` cho ml-worker.
   * - `frameBase64` phải là base64 trần. Client đã cắt tiền tố `data:image/...`
   *   nhưng đây là ranh giới service nên cắt lại một lần nữa — gửi cả tiền tố
   *   thì ml-worker decode ra rác và trả 400 cho mọi frame.
   * - Bỏ hẳn `sequenceId` khi không có, không gửi `undefined`.
   */
  private toWirePayload(req: FrameAnalysisRequest): Record<string, unknown> {
    const captured =
      req.capturedAt instanceof Date ? req.capturedAt : new Date(req.capturedAt as unknown as string);
    const capturedAt = Number.isNaN(captured.getTime())
      ? new Date().toISOString()
      : captured.toISOString();

    const payload: Record<string, unknown> = {
      attemptId: req.attemptId,
      capturedAt,
      frameBase64: stripDataUriPrefix(req.frameBase64),
    };
    if (typeof req.sequenceId === 'number') payload.sequenceId = req.sequenceId;
    return payload;
  }

  /**
   * ml-worker trả `violationType: null` khi không có vi phạm (JSON không có
   * `undefined`). Giữ nguyên `null` thì `if (analysis.violationType)` vẫn sai
   * nhưng so sánh kiểu lại không khớp union, nên chuẩn hoá về `undefined`.
   * `attentionScore` cũng kẹp về 0–100 để một giá trị lạc không lọt qua ngưỡng
   * BR-011.
   */
  private normalizeResponse(raw: unknown): FrameAnalysisResponse {
    const body = (raw ?? {}) as Partial<FrameAnalysisResponse> & { violationType?: unknown };
    const score = Number(body.attentionScore);

    return {
      faceDetected: Boolean(body.faceDetected),
      faceCount: Number.isFinite(Number(body.faceCount)) ? Number(body.faceCount) : 0,
      attentionScore: Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0,
      gazeDirection: (body.gazeDirection ?? undefined) as FrameAnalysisResponse['gazeDirection'],
      violationType: (body.violationType ?? undefined) as FrameAnalysisResponse['violationType'],
    };
  }
}
