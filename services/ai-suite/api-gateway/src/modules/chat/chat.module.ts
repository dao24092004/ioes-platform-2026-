import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { MlWorkerModule } from '../ml-worker/ml-worker.module';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';

/** US-017 Chatbot. */
@Module({
  imports: [TypeOrmModule.forFeature([ChatSession, ChatMessage]), HttpModule, MlWorkerModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
