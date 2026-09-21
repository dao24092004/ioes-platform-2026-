import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
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
 * Một khoá trong catalogue gửi xuống ml-worker.
 *
 * Tên trường chốt trong docs/02-architecture/AI_FEATURES_CONTRACT.md §1 và
 * dùng chung cho cả gợi ý lẫn lộ trình — camelCase, khác với phần RAG ở trên
 * vốn theo snake_case. Không tự đổi tên ở một phía.
 */
export interface MlCatalogItem {
  courseId: string;
  title: string;
  shortDescription: string | null;
  categoryId: string | null;
  level: number | null;
  durationHours: number | null;
  price: number | null;
  enrollments: number;
}

/** Một khoá người dùng đã ghi danh, kèm tiến độ. */
export interface MlEnrolledItem {
  courseId: string;
  title: string;
  categoryId: string | null;
  level: number | null;
  progressPercent: number;
  completed: boolean;
}

export type MlRecommendationReasonCode =
  | 'SAME_CATEGORY'
  | 'SIMILAR_CONTENT'
  | 'NEXT_LEVEL'
  | 'POPULAR'
  | 'NEW';

export interface MlRecommendationsRequest {
  userId: string;
  limit: number;
  enrolled: MlEnrolledItem[];
  catalog: MlCatalogItem[];
}

export interface MlRecommendationItem {
  courseId: string;
  score: number;
  reason: string;
  reasonCode: MlRecommendationReasonCode;
}

export interface MlRecommendationsResponse {
  items: MlRecommendationItem[];
  strategy: string;
}

export interface MlLearningPathRequest {
  userId: string;
  goal: string;
  hoursPerWeek: number;
  currentSkills: string[];
  catalog: MlCatalogItem[];
  enrolled: MlEnrolledItem[];
}

export interface MlLearningPathResource {
  title: string;
  docId: string;
}

export interface MlLearningPathStep {
  order: number;
  title: string;
  objective: string;
  courseId: string | null;
  estimatedHours: number;
  skills: string[];
  resources: MlLearningPathResource[];
}

export interface MlAgentTraceEntry {
  agent: string;
  summary: string;
  elapsedMs: number;
}

export interface MlLearningPathResponse {
  goal: string;
  summary: string;
  totalEstimatedHours: number;
  weeks: number;
  steps: MlLearningPathStep[];
  agentTrace: MlAgentTraceEntry[];
  model: string;
  generatedAt: string;
}

/** Thân lỗi của FastAPI: `{"detail": "..."}`. */
interface FastApiError {
  detail?: string;
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

  /**
   * Gợi ý khoá học. Không gọi mô hình ngôn ngữ nên dùng timeout thường:
   * bên kia chỉ tính embedding và chạy luật (AI_FEATURES_CONTRACT §1).
   */
  async recommendCourses(
    payload: MlRecommendationsRequest,
  ): Promise<MlRecommendationsResponse> {
    return this.post<MlRecommendationsResponse>(
      '/v1/recommendations/courses',
      payload,
      mlWorkerConfig.timeoutMs,
      'Gợi ý khoá học',
    );
  }

  /**
   * Sinh lộ trình học. Timeout dài vì năm agent chạy tuần tự, mỗi agent một
   * lượt gọi mô hình.
   */
  async generateLearningPath(
    payload: MlLearningPathRequest,
  ): Promise<MlLearningPathResponse> {
    return this.post<MlLearningPathResponse>(
      '/v1/learning-path/generate',
      payload,
      mlWorkerConfig.learningPathTimeoutMs,
      'Sinh lộ trình học',
    );
  }

  /**
   * Gọi ml-worker và dịch lỗi sang HttpException của Nest.
   *
   * Giữ nguyên 503 kèm `detail` thay vì nuốt thành một câu chung chung: theo
   * hợp đồng, 503 nghĩa là mô hình hỏng hoặc hết quota, và giao diện phải nói
   * đúng chuyện đó chứ không được hiện lộ trình rỗng như thể không có dữ liệu.
   * 4xx là lỗi của dữ liệu gửi lên nên cũng chuyển tiếp, không đổi thành 503.
   */
  private async post<T>(
    path: string,
    payload: unknown,
    timeoutMs: number,
    action: string,
  ): Promise<T> {
    const url = `${mlWorkerConfig.baseUrl}${path}`;
    try {
      const response = await firstValueFrom(
        this.http.post<T>(url, payload, { timeout: timeoutMs }),
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<FastApiError>;
      const status = axiosError.response?.status;
      const detail = axiosError.response?.data?.detail;

      this.logger.error(
        `${action} thất bại: ${status ?? axiosError.code ?? ''} ` +
          `${detail ?? axiosError.message}`,
      );

      if (status === 503) {
        throw new ServiceUnavailableException(
          detail ??
            'Mô hình ngôn ngữ đang không khả dụng hoặc đã hết hạn mức. Vui lòng thử lại sau.',
        );
      }
      if (status !== undefined && status >= 400 && status < 500) {
        throw new HttpException(
          detail ?? `${action} không thành công.`,
          status,
        );
      }

      throw new ServiceUnavailableException(
        'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.',
      );
    }
  }
}
