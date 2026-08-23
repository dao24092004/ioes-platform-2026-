import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatService } from './chat.service';
import { MlRagResponse, MlWorkerClient } from './ml-worker.client';
import { ChatMessage, ChatMessageRole } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';

const USER_ID = 'a07912c8-4003-4087-a373-5fe65f4f59a6';
const OTHER_USER_ID = 'b1111111-2222-3333-4444-555555555555';
const SESSION_ID = '01a02e66-87a1-7db5-8570-3d928a004705';

const ragResponse = (overrides: Partial<MlRagResponse> = {}): MlRagResponse => ({
  answer: 'Rebase viết lại lịch sử, merge thì không.',
  sources: [
    {
      doc_id: 'git-github',
      chunk_id: 'git-github#2',
      title: 'Git và GitHub',
      score: 0.83,
      excerpt: 'Rebase viết lại lịch sử để thành đường thẳng.',
    },
  ],
  model: 'gemini-3.6-flash',
  usage: { prompt_tokens: 17, completion_tokens: 168, total_tokens: 736 },
  latency_ms: 1420,
  grounded: true,
  ...overrides,
});

describe('ChatService', () => {
  let service: ChatService;
  let sessions: jest.Mocked<Repository<ChatSession>>;
  let messages: jest.Mocked<Repository<ChatMessage>>;
  let mlWorker: jest.Mocked<MlWorkerClient>;

  beforeEach(async () => {
    sessions = {
      create: jest.fn((input) => input as ChatSession),
      save: jest.fn(async (input) => ({
        ...(input as ChatSession),
        id: SESSION_ID,
        messageCount: (input as ChatSession).messageCount ?? 0,
      }) as ChatSession),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      increment: jest.fn(),
    } as unknown as jest.Mocked<Repository<ChatSession>>;

    messages = {
      create: jest.fn((input) => input as ChatMessage),
      save: jest.fn(async (input) => ({
        ...(input as ChatMessage),
        id: 'msg-1',
      }) as ChatMessage),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ChatMessage>>;

    mlWorker = { ragQuery: jest.fn() } as unknown as jest.Mocked<MlWorkerClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(ChatSession), useValue: sessions },
        { provide: getRepositoryToken(ChatMessage), useValue: messages },
        { provide: MlWorkerClient, useValue: mlWorker },
      ],
    }).compile();

    service = module.get(ChatService);
  });

  describe('ask', () => {
    it('should create a session when none is supplied', async () => {
      mlWorker.ragQuery.mockResolvedValue(ragResponse());

      const turn = await service.ask(USER_ID, 'Rebase khác merge thế nào?');

      expect(sessions.save).toHaveBeenCalledTimes(1);
      expect(turn.sessionId).toBe(SESSION_ID);
    });

    it('should store both the question and the answer', async () => {
      mlWorker.ragQuery.mockResolvedValue(ragResponse());

      await service.ask(USER_ID, 'Git là gì?');

      const roles = messages.create.mock.calls.map(([input]) => input.role);
      expect(roles).toEqual([ChatMessageRole.USER, ChatMessageRole.ASSISTANT]);
    });

    it('should record the question before calling the model', async () => {
      // Gọi mô hình có thể lỗi hoặc quá hạn. Ghi câu hỏi trước thì lượt hỏi
      // của học viên không bị mất khi điều đó xảy ra.
      const order: string[] = [];
      messages.save.mockImplementation(async (input) => {
        order.push(`save:${(input as ChatMessage).role}`);
        return { ...(input as ChatMessage), id: 'msg-1' } as ChatMessage;
      });
      mlWorker.ragQuery.mockImplementation(async () => {
        order.push('ml-worker');
        return ragResponse();
      });

      await service.ask(USER_ID, 'Git là gì?');

      expect(order).toEqual([
        `save:${ChatMessageRole.USER}`,
        'ml-worker',
        `save:${ChatMessageRole.ASSISTANT}`,
      ]);
    });

    it('should persist total_tokens separately from prompt and completion', async () => {
      // Gemini tính token suy luận ẩn vào tổng: 17 + 168 nhưng tổng là 736.
      // Lưu nhầm tổng thành phép cộng hai cột kia sẽ tính thiếu hạn mức ~4 lần.
      mlWorker.ragQuery.mockResolvedValue(ragResponse());

      await service.ask(USER_ID, 'Git là gì?');

      const assistant = messages.create.mock.calls[1][0];
      expect(assistant.promptTokens).toBe(17);
      expect(assistant.completionTokens).toBe(168);
      expect(assistant.totalTokens).toBe(736);
    });

    it('should map snake_case sources from ml-worker to camelCase', async () => {
      mlWorker.ragQuery.mockResolvedValue(ragResponse());

      const turn = await service.ask(USER_ID, 'Git là gì?');

      expect(turn.sources).toEqual([
        {
          docId: 'git-github',
          chunkId: 'git-github#2',
          title: 'Git và GitHub',
          score: 0.83,
        },
      ]);
    });

    it('should surface an ungrounded answer without inventing sources', async () => {
      mlWorker.ragQuery.mockResolvedValue(
        ragResponse({ grounded: false, sources: [] }),
      );

      const turn = await service.ask(USER_ID, 'Giá vàng hôm nay?');

      expect(turn.grounded).toBe(false);
      expect(turn.sources).toEqual([]);
    });

    it('should increment message count atomically by two per turn', async () => {
      sessions.findOne.mockResolvedValue({
        id: SESSION_ID,
        userId: USER_ID,
        messageCount: 4,
      } as ChatSession);
      mlWorker.ragQuery.mockResolvedValue(ragResponse());

      await service.ask(USER_ID, 'Câu tiếp theo', SESSION_ID);

      expect(sessions.increment).toHaveBeenCalledWith(
        { id: SESSION_ID },
        'messageCount',
        2,
      );
    });

    it('should not read-modify-write the message count', async () => {
      // Phiên vừa tạo có messageCount undefined vì save() không lấy về giá trị
      // DEFAULT của PostgreSQL. Cộng dồn kiểu đọc-rồi-ghi sẽ ra NaN.
      mlWorker.ragQuery.mockResolvedValue(ragResponse());

      await service.ask(USER_ID, 'Câu đầu tiên');

      const updates = sessions.update.mock.calls.map(([, patch]) => patch);
      expect(updates.every((p) => !('messageCount' in (p as object)))).toBe(true);
    });

    it('should reject a session belonging to another user', async () => {
      sessions.findOne.mockResolvedValue(null);

      await expect(
        service.ask(OTHER_USER_ID, 'Cho tôi xem', SESSION_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mlWorker.ragQuery).not.toHaveBeenCalled();
    });
  });

  describe('history', () => {
    it('should return messages in chronological order', async () => {
      sessions.findOne.mockResolvedValue({
        id: SESSION_ID,
        userId: USER_ID,
      } as ChatSession);
      messages.find.mockResolvedValue([]);

      await service.history(USER_ID, SESSION_ID);

      expect(messages.find).toHaveBeenCalledWith({
        where: { sessionId: SESSION_ID },
        order: { createdAt: 'ASC' },
      });
    });

    it('should not leak another user history', async () => {
      sessions.findOne.mockResolvedValue(null);

      await expect(
        service.history(OTHER_USER_ID, SESSION_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
