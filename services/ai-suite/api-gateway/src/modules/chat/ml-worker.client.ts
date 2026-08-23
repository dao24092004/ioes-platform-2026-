import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { createLogger } from '@ioes/common-node';
import { mlWorkerConfig } from '../../config/app.config';

/** Nguồn trích dẫn mà ml-worker trả về. */
export interface MlRetrievedSource {
  doc_id: string;
  chunk_id: string;
  title: string;
  score: number;
  excerpt: string;
}

export interface MlTokenUsage {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
}

export interface MlRagResponse {
  answer: string;
  sources: MlRetrievedSource[];
  model: string;
  usage: MlTokenUsage;
  latency_ms: number;
  grounded: boolean;
}

/**
 * Gọi sang ml-worker (FastAPI, cổng 9101) để lấy câu trả lời RAG.
 *
 * Toàn bộ phần học máy nằm bên Python. Service này chỉ điều phối và lưu trữ —
 * giữ đúng phân vai trong ai-suite/README.md.
 */
@Injectable()
export class MlWorkerClient {
  private readonly logger = createLogger('MlWorkerClient');

  constructor(private readonly http: HttpService) {}

  async ragQuery(question: string, topK?: number): Promise<MlRagResponse> {
    const url = `${mlWorkerConfig.baseUrl}/v1/rag/query`;
    try {
      const response = await firstValueFrom(
        this.http.post<MlRagResponse>(
          url,
          { question, top_k: topK ?? null },
          { timeout: mlWorkerConfig.timeoutMs },
        ),
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Gọi ml-worker thất bại: ${axiosError.code ?? ''} ${axiosError.message}`,
      );
      throw new ServiceUnavailableException(
        'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.',
      );
    }
  }
}
