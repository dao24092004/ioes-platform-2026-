import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createLogger } from '@ioes/common-node';
import {
  ChatMessage,
  ChatMessageRole,
  RetrievedSource,
} from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';
import { MlRetrievedSource, MlWorkerClient } from './ml-worker.client';

/** Kết quả một lượt hỏi đáp trả về cho client. */
export interface ChatTurn {
  sessionId: string;
  messageId: string;
  answer: string;
  sources: RetrievedSource[];
  grounded: boolean;
  model: string;
  latencyMs: number;
}

/** Số ký tự lấy từ câu hỏi đầu tiên để đặt tên phiên. */
const TITLE_MAX_LENGTH = 80;

@Injectable()
export class ChatService {
  private readonly logger = createLogger('ChatService');

  constructor(
    @InjectRepository(ChatSession)
    private readonly sessions: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messages: Repository<ChatMessage>,
    private readonly mlWorker: MlWorkerClient,
  ) {}

  /**
   * Xử lý một lượt hỏi đáp.
   *
   * Ghi câu hỏi trước khi gọi mô hình, để lượt hỏi không mất nếu ml-worker lỗi.
   */
  async ask(
    userId: string,
    question: string,
    sessionId?: string,
    topK?: number,
  ): Promise<ChatTurn> {
    const session = sessionId
      ? await this.requireSession(userId, sessionId)
      : await this.createSession(userId, question);

    await this.messages.save(
      this.messages.create({
        sessionId: session.id,
        role: ChatMessageRole.USER,
        content: question,
        sources: [],
        createdBy: userId,
      }),
    );

    const result = await this.mlWorker.ragQuery(question, topK);

    const assistantMessage = await this.messages.save(
      this.messages.create({
        sessionId: session.id,
        role: ChatMessageRole.ASSISTANT,
        content: result.answer,
        sources: result.sources.map(toRetrievedSource),
        model: result.model,
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens,
        latencyMs: result.latency_ms,
        createdBy: userId,
      }),
    );

    // Tăng nguyên tử thay vì đọc rồi ghi. Hai lý do:
    //   - save() không lấy về giá trị DEFAULT mà PostgreSQL gán, nên với phiên
    //     vừa tạo thì session.messageCount là undefined và phép cộng ra NaN
    //   - hai request cùng phiên chạy song song sẽ ghi đè nhau nếu đọc trước
    // Hai lượt vừa thêm: một của người dùng, một của trợ lý.
    await this.sessions.increment({ id: session.id }, 'messageCount', 2);
    await this.sessions.update(session.id, { lastMessageAt: new Date() });

    this.logger.log(
      `Phiên ${session.id} trả lời xong, grounded=${result.grounded}, ` +
        `${result.sources.length} nguồn, ${result.latency_ms}ms`,
    );

    return {
      sessionId: session.id,
      messageId: assistantMessage.id,
      answer: result.answer,
      sources: assistantMessage.sources,
      grounded: result.grounded,
      model: result.model,
      latencyMs: result.latency_ms,
    };
  }

  /** Lịch sử một phiên, theo thứ tự thời gian. */
  async history(userId: string, sessionId: string): Promise<ChatMessage[]> {
    await this.requireSession(userId, sessionId);
    return this.messages.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  /** Danh sách phiên của một người dùng, mới nhất trước. */
  async listSessions(userId: string): Promise<ChatSession[]> {
    return this.sessions.find({
      where: { userId },
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
    });
  }

  private async createSession(
    userId: string,
    firstQuestion: string,
  ): Promise<ChatSession> {
    const title =
      firstQuestion.length > TITLE_MAX_LENGTH
        ? `${firstQuestion.slice(0, TITLE_MAX_LENGTH - 1)}…`
        : firstQuestion;

    return this.sessions.save(
      this.sessions.create({ userId, title, createdBy: userId }),
    );
  }

  /**
   * Lấy phiên, đồng thời chặn người này đọc phiên của người khác.
   *
   * Trả 404 chứ không phải 403 khi phiên thuộc người khác: 403 sẽ để lộ việc
   * phiên đó có tồn tại.
   */
  private async requireSession(
    userId: string,
    sessionId: string,
  ): Promise<ChatSession> {
    const session = await this.sessions.findOne({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên hội thoại');
    }
    return session;
  }
}

function toRetrievedSource(source: MlRetrievedSource): RetrievedSource {
  return {
    docId: source.doc_id,
    chunkId: source.chunk_id,
    title: source.title,
    score: source.score,
  };
}
