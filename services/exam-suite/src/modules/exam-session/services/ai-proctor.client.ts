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
 * Mock client — dùng khi `DEV_MOCK_AI_PROCTOR=true` (mặc định khi dev local,
 * vì ai-suite chưa được build ở sprint này).
 *
 * Trả về: face OK, attention = 80 (cao, không vi phạm BR-011).
 * → student không bao giờ bị flag khi chạy dev.
 */
@Injectable()
export class MockProctorClient implements IProctorClient {
  private readonly logger = new Logger(MockProctorClient.name);

  onModuleInit() {
    if (process.env.DEV_MOCK_AI_PROCTOR === 'true') {
      this.logger.warn(
        '[mock-ai-proctor] Using MOCK proctor. attentionScore=80, no violation. ' +
          'Set DEV_MOCK_AI_PROCTOR=false để gọi real ai-suite.',
      );
    }
  }

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
 * HTTP client — gọi sang ai-suite/proctor-service qua REST internal.
 *
 * Endpoint: POST {baseUrl}/internal/ai/proctor/analyze
 * Body: FrameAnalysisRequest (JSON)
 * Response: FrameAnalysisResponse
 *
 * Timeout mặc định: 3000ms (3s) — nhỏ hơn interval 1s của client capture.
 * Nếu ai-suite quá tải → trả null frame, không block WS.
 *
 * Phase sau (khi ai-suite build xong): không cần sửa code này, chỉ switch env.
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
        `${this.baseUrl}/internal/ai/proctor/analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(
          `proctor API returned ${response.status} ${response.statusText}`,
        );
      }

      return (await response.json()) as FrameAnalysisResponse;
    } catch (err) {
      this.logger.error(
        `[http-proctor] call failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}