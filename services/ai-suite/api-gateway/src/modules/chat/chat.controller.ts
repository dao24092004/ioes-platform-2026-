import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiResponse, UserId } from '@ioes/common-node';
import { GatewayUserGuard } from '../../common/guards/gateway-user.guard';
import { ChatService, ChatTurn } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';

/**
 * US-017 — hỏi đáp với trợ lý AI.
 *
 * Gateway khai `Path=/api/ai/**` kèm `StripPrefix=2`, nên client gọi
 * `/api/ai/chat` còn controller này nhận `/chat`.
 */
@Controller('chat')
@UseGuards(GatewayUserGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  /**
   * Hạn mức chặt hơn mặc định vì mỗi lượt đều gọi mô hình ngôn ngữ — vừa tốn
   * tiền vừa tốn thời gian, khác hẳn một truy vấn đọc thường.
   */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async ask(
    @UserId() userId: string,
    @Body() dto: SendMessageDto,
  ): Promise<ApiResponse<ChatTurn>> {
    const turn = await this.chat.ask(userId, dto.question, dto.sessionId, dto.topK);
    return ApiResponse.success(turn);
  }

  @Get('sessions')
  async sessions(@UserId() userId: string): Promise<ApiResponse<ChatSession[]>> {
    return ApiResponse.success(await this.chat.listSessions(userId));
  }

  @Get(':sessionId')
  async history(
    @UserId() userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<ApiResponse<ChatMessage[]>> {
    return ApiResponse.success(await this.chat.history(userId, sessionId));
  }
}
