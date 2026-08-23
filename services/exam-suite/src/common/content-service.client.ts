import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../modules/exam-session/session-cache.service';
import { serviceUrls } from '../../config/app.config';
import {
  CONTENT_SERVICE_CLIENT,
  ExamMetadata,
  IContentServiceClient,
} from '../modules/exam-session/use-cases/start-exam.use-case';

/**
 * ContentServiceHttpClient — gọi content-service qua API Gateway.
 *
 * Tuân thủ PROJECT_RULES: KHÔNG gọi REST trực tiếp service khác,
 * phải qua API Gateway (lb://api-gateway hoặc http://api-gateway:8080).
 *
 * Trong dev local, có thể set CONTENT_SERVICE_URL=http://localhost:9001
 * để bypass gateway.
 */
@Injectable()
export class ContentServiceHttpClient implements IContentServiceClient {
  private readonly logger = new Logger(ContentServiceHttpClient.name);

  constructor(@Inject('HTTP_FETCH') private readonly fetch: typeof fetch) {}

  async getExamForStudent(examId: string, userId: string): Promise<ExamMetadata | null> {
    const url = `${serviceUrls.apiGateway}/api/v1/exams/${examId}/for-student/${userId}`;
    try {
      const res = await this.fetch(url, {
        method: 'GET',
        headers: {
          'X-Internal-Caller': 'exam-suite',
          // TODO: forward JWT từ request gốc
        },
      });
      if (!res.ok) {
        this.logger.warn(`[content] exam lookup failed status=${res.status}`);
        return null;
      }
      const json = (await res.json()) as { data?: ExamMetadata };
      return json.data ?? null;
    } catch (err) {
      this.logger.error(`[content] exam lookup error: ${err}`);
      return null;
    }
  }
}