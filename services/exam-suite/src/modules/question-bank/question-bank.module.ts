import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionBankController } from './question-bank.controller';
import { QuestionBankService } from './question-bank.service';
import { QuestionWriteService } from './question-write.service';
import { DgraphClient } from './dgraph.client';
import { DgraphSyncConsumer } from './dgraph-sync.consumer';
import { OutboxWorker } from './outbox.worker';
import {
  Question,
  QuestionOption,
  CodingTestCase,
} from './entities/question.entity';
import { OutboxEvent } from './entities/outbox-event.entity';
import { ProcessedEvent } from './entities/processed-event.entity';
import { KafkaModule } from '@ioes/common-node';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 5000,
        maxRedirects: 3,
      }),
    }),
    TypeOrmModule.forFeature([
      Question,
      QuestionOption,
      CodingTestCase,
      OutboxEvent,
      ProcessedEvent,
    ]),
    KafkaModule.forRoot({
      clientId: process.env.KAFKA_CLIENT_ID ?? 'exam-suite',
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
      consumerGroupId:
        process.env.KAFKA_CONSUMER_GROUP_ID ?? 'exam-suite-dgraph-sync',
    }),
  ],
  controllers: [QuestionBankController],
  providers: [
    QuestionBankService,
    QuestionWriteService,
    DgraphClient,
    DgraphSyncConsumer,
    OutboxWorker,
  ],
  exports: [QuestionBankService, QuestionWriteService, DgraphClient],
})
export class QuestionBankModule {}