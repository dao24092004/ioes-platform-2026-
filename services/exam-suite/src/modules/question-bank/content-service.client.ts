import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { StructuredLogger, CircuitBreaker } from '@ioes/common-node';

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentTopicId?: string;
  level: number;
  isActive: boolean;
}

/**
 * Client gọi content-service để validate topicId tồn tại.
 * Theo ADR-012, exam-suite phải check qua content-service khi tạo Question.
 *
 * Resilience:
 * - Circuit breaker chống cascading failures
 * - Timeout 5s (align với Dgraph client)
 */
@Injectable()
export class ContentServiceClient {
  private readonly logger = new StructuredLogger(ContentServiceClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs = 5000;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly cache = new Map<string, { topic: Topic; timestamp: number }>();
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 phút (theo ADR-005)

  constructor(
    private readonly http: HttpService,
    cfg: ConfigService,
  ) {
    this.baseUrl =
      cfg.get<string>('CONTENT_SERVICE_URL') ?? 'http://content-service:9001';

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30_000,
      name: 'content-service',
    });
  }

  async getTopic(topicId: string): Promise<Topic | null> {
    // Check cache first
    const cached = this.cache.get(topicId);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      this.logger.debug(`Cache hit for topic ${topicId}`);
      return cached.topic;
    }

    try {
      const response = await this.circuitBreaker.execute(async () => {
        const res = await firstValueFrom(
          this.http.get(`${this.baseUrl}/api/v1/topics/${topicId}`, {
            timeout: this.timeoutMs,
          }),
        );
        return res.data;
      });

      const topic = response as Topic;
      this.cache.set(topicId, { topic, timestamp: Date.now() });
      return topic;
    } catch (err) {
      this.logger.error(
        `Failed to fetch topic ${topicId}: ${(err as Error).message}`,
      );
      // Cache miss - return null, caller should handle gracefully
      return null;
    }
  }

  async existsTopic(topicId: string): Promise<boolean> {
    try {
      const response = await this.circuitBreaker.execute(async () => {
        const res = await firstValueFrom(
          this.http.get(`${this.baseUrl}/api/v1/topics/${topicId}/exists`, {
            timeout: this.timeoutMs,
          }),
        );
        return res.data;
      });
      return (response as { exists: boolean }).exists;
    } catch (err) {
      this.logger.error(
        `Failed to check topic existence ${topicId}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  invalidateCache(topicId?: string): void {
    if (topicId) {
      this.cache.delete(topicId);
    } else {
      this.cache.clear();
    }
  }
}