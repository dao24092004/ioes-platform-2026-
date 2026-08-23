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
 */
@Injectable()
export class MockContentServiceClient implements IContentServiceClient {
  private readonly logger = new Logger(MockContentServiceClient.name);

  onModuleInit() {
    if (process.env.DEV_MOCK_CONTENT_SERVICE === 'true') {
      this.logger.warn('⚠️  Using MOCK content-service. Set DEV_MOCK_CONTENT_SERVICE=false to disable.');
    }
  }

  async getExamForStudent(examId: string, userId: string): Promise<ExamMetadata | null> {
    this.logger.debug(`[mock] getExamForStudent examId=${examId} userId=${userId}`);
    // Trả metadata mặc định: 60 phút, proctoring bật, trong khung giờ
    const now = Date.now();
    return {
      id: examId,
      title: `[MOCK] Exam ${examId}`,
      durationMs: 60 * 60 * 1000, // 60 phút
      openFrom: new Date(now - 3600_000), // mở 1h trước
      openUntil: new Date(now + 24 * 3600_000), // đóng sau 24h
      screenRecordEnabled: false,
      proctoringEnabled: true,
      maxScore: 10,
      enrollmentId: randomUUID(),
    };
  }
}