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

/** Một câu hỏi ml-worker vừa soạn, đã qua đủ ba tầng kiểm bên đó. */
export interface MlGeneratedOption {
  option_text: string;
  is_correct: boolean;
}

export interface MlGeneratedQuestion {
  question_text: string;
  question_type: string;
  difficulty: string;
  options: MlGeneratedOption[];
  answer_text: string | null;
  explanation: string;
  source: MlRetrievedSource;
}

export interface MlGenerateQuestionsResponse {
  questions: MlGeneratedQuestion[];
  requested: number;
  returned: number;
  dropped_unverified: number;
  grounded: boolean;
  model: string;
  usage: MlTokenUsage;
  latency_ms: number;
}

export interface MlGenerateQuestionsRequest {
  topic: string;
  question_type: string;
  difficulty: string;
  count: number;
  language: string;
  instructions?: string | null;
  top_k?: number | null;
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

  /**
   * Soạn câu hỏi từ học liệu.
   *
   * Timeout riêng và dài hơn hỏi đáp: mỗi lượt sinh kéo theo một lượt đối
   * chiếu cho từng câu, nên xin 10 câu là 11 lần gọi mô hình. Dùng chung
   * ML_WORKER_TIMEOUT_MS (60s) thì cắt ngang giữa chừng.
   */
  async generateQuestions(
    payload: MlGenerateQuestionsRequest,
  ): Promise<MlGenerateQuestionsResponse> {
    const url = `${mlWorkerConfig.baseUrl}/v1/questions/generate`;
    try {
      const response = await firstValueFrom(
        this.http.post<MlGenerateQuestionsResponse>(url, payload, {
          timeout: mlWorkerConfig.generateTimeoutMs,
        }),
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Sinh câu hỏi thất bại: ${axiosError.code ?? ''} ${axiosError.message}`,
      );
      throw new ServiceUnavailableException(
        'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.',
      );
    }
  }
}
