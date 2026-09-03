import { apiClient, unwrap, type ApiEnvelope } from '@/config/api.config';

/**
 * US-017 — trợ lý AI hỏi đáp trên học liệu.
 *
 * Gateway khai `Path=/api/ai/**` kèm `StripPrefix=2`, nên `/api/ai/chat` ở đây
 * tới ai-gateway thành `/chat`. Gateway kiểm JWT rồi chèn header `X-User-Id`,
 * vì vậy client chỉ cần gửi `Authorization`, không tự gắn user id.
 */

const BASE = '/api/ai/chat';

/** Đoạn học liệu mà câu trả lời dựa vào. */
export interface RetrievedSource {
  docId: string;
  chunkId: string;
  title: string;
  score: number;
}

export type ChatMessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatMessageRole;
  content: string;
  sources: RetrievedSource[];
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string | null;
  status: string;
  messageCount: number;
  lastMessageAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Một lượt hỏi đáp vừa hoàn tất. */
export interface ChatTurn {
  sessionId: string;
  messageId: string;
  answer: string;
  /** `false` nghĩa là mô hình không tìm đủ căn cứ trong học liệu. */
  grounded: boolean;
  sources: RetrievedSource[];
  model: string;
  latencyMs: number;
}

export interface AskParams {
  question: string;
  /** Bỏ trống thì backend tạo phiên mới và trả về id của nó. */
  sessionId?: string;
  /** Số đoạn truy xuất, 1..20. Bỏ trống thì dùng mặc định của ml-worker. */
  topK?: number;
}

/** Gửi một câu hỏi. Backend giới hạn 10 lượt mỗi phút cho mỗi người. */
export function ask(params: AskParams): Promise<ChatTurn> {
  return unwrap(apiClient.post<ApiEnvelope<ChatTurn>>(BASE, params));
}

/** Danh sách phiên hội thoại của người đang đăng nhập, mới nhất trước. */
export function listSessions(): Promise<ChatSession[]> {
  return unwrap(apiClient.get<ApiEnvelope<ChatSession[]>>(`${BASE}/sessions`));
}

/** Toàn bộ tin nhắn của một phiên, theo thứ tự thời gian. */
export function getHistory(sessionId: string): Promise<ChatMessage[]> {
  return unwrap(apiClient.get<ApiEnvelope<ChatMessage[]>>(`${BASE}/${sessionId}`));
}

export const aiApi = { ask, listSessions, getHistory };
