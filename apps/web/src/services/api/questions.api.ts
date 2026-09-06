import { apiClient, unwrap, type ApiEnvelope } from '@/config/api.config';

/**
 * Soạn câu hỏi kiểm tra từ học liệu.
 *
 * Gateway khai `Path=/api/ai/**` kèm `StripPrefix=2`, nên `/api/ai/questions/generate`
 * tới ai-gateway thành `/questions/generate`.
 *
 * Câu hỏi chỉ được soạn từ học liệu đã nạp, không lấy từ kiến thức nền của mô
 * hình. Hệ quả nhìn thấy được ở đây: `grounded=false` và `questions` rỗng nghĩa
 * là học liệu chưa phủ chủ đề — **không phải lỗi**, phải nói rõ thay vì hiện
 * thông báo thất bại.
 */

const BASE = '/api/ai/questions';

export type QuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'short_answer'
  | 'essay';

export type Difficulty = 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';

/** Đoạn học liệu chống lưng cho câu hỏi. Hiện ra để người duyệt đối chiếu được. */
export interface QuestionSource {
  docId: string;
  chunkId: string;
  title: string;
  score: number;
  excerpt: string;
}

export interface GeneratedOption {
  optionText: string;
  isCorrect: boolean;
}

/** Trùng tên trường với `CreateQuestionDto` của exam-suite để lưu là map thẳng. */
export interface GeneratedQuestion {
  questionText: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  options: GeneratedOption[];
  answerText: string | null;
  explanation: string;
  source: QuestionSource;
}

export interface GeneratedQuestionSet {
  questions: GeneratedQuestion[];
  /** Số câu đã xin. */
  requested: number;
  /** Số câu thực sự qua được kiểm chứng. Nhỏ hơn `requested` là bình thường. */
  returned: number;
  /** Bị loại vì trích nguồn sai hoặc học liệu không chống lưng đáp án. */
  droppedUnverified: number;
  /** False nghĩa là học liệu chưa có nội dung về chủ đề này. */
  grounded: boolean;
  model: string;
  latencyMs: number;
}

export interface GenerateParams {
  topic: string;
  questionType?: QuestionType;
  difficulty?: Difficulty;
  /** Trần chứ không phải chỉ tiêu: học liệu đủ tới đâu trả tới đó. Tối đa 20. */
  count?: number;
  language?: 'vi' | 'en';
  instructions?: string;
  topK?: number;
}

/** Backend giới hạn 5 lượt mỗi phút cho mỗi người. */
export function generate(params: GenerateParams): Promise<GeneratedQuestionSet> {
  return unwrap(apiClient.post<ApiEnvelope<GeneratedQuestionSet>>(`${BASE}/generate`, params));
}

export const questionsApi = { generate };
