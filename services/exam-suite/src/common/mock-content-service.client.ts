import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CONTENT_SERVICE_CLIENT,
  ExamMetadata,
  IContentServiceClient,
} from '../modules/exam-session/use-cases/start-exam.use-case';

/**
 * Mock Content Service — chỉ dùng trong dev local khi chưa có content-service thật.
 *
 * Trả về metadata cứng cho mọi examId để bạn test Postman không cần chạy content-service.
 *
 * Activation: set `DEV_MOCK_CONTENT_SERVICE=true`
 *
 * Tuỳ chỉnh duration:
 * - `DEV_MOCK_EXAM_DURATION_SEC=60`  → 60 giây (dùng để test auto-submit nhanh)
 * - không set hoặc =0               → 60 phút (mặc định)
 */
@Injectable()
export class MockContentServiceClient implements IContentServiceClient {
  private readonly logger = new Logger(MockContentServiceClient.name);

  onModuleInit() {
    if (process.env.DEV_MOCK_CONTENT_SERVICE === 'true') {
      const durSec = parseInt(process.env.DEV_MOCK_EXAM_DURATION_SEC ?? '0', 10);
      this.logger.warn(
        `⚠️  Using MOCK content-service. durationMs = ${durSec > 0 ? durSec * 1000 : 60 * 60 * 1000}ms. ` +
          `Set DEV_MOCK_EXAM_DURATION_SEC để đổi.`,
      );
    }
  }

  async getExamForStudent(examId: string, userId: string): Promise<ExamMetadata | null> {
    this.logger.debug(`[mock] getExamForStudent examId=${examId} userId=${userId}`);

    const durSec = parseInt(process.env.DEV_MOCK_EXAM_DURATION_SEC ?? '0', 10);
    const durationMs = durSec > 0 ? durSec * 1000 : 60 * 60 * 1000;

    const now = Date.now();
    return {
      id: examId,
      title: `[MOCK ${Math.round(durationMs / 1000)}s] Exam ${examId}`,
      durationMs,
      openFrom: new Date(now - 3600_000),
      openUntil: new Date(now + 24 * 3600_000),
      screenRecordEnabled: false,
      // Tắt proctoring để khỏi phải nhớ tới BR-010 khi test exam ngắn (< 30p).
      // Bật nếu cần test BR-010: `DEV_MOCK_PROCTORING=true`.
      proctoringEnabled: process.env.DEV_MOCK_PROCTORING === 'true',
      maxScore: 10,
      enrollmentId: randomUUID(),
    };
  }
}