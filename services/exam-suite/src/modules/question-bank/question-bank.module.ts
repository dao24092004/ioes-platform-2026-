import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionBankController } from './question-bank.controller';
import { QuestionBankService } from './question-bank.service';
import { QuestionWriteService } from './question-write.service';
import { DgraphClient } from './dgraph.client';
import { DgraphSyncConsumer } from './dgraph-sync.consumer';
import { DgraphResyncService } from './dgraph-resync.service';
import { OutboxWorker } from './outbox.worker';
import { UploadController } from './upload.controller';
import { StorageService } from './storage/storage.service';
import { ImageUploadService } from './storage/image-upload.service';
import { BulkImportService } from './bulk-import/bulk-import.service';
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
  controllers: [QuestionBankController, UploadController],
  providers: [
    // Read + Write core
    QuestionBankService,
    QuestionWriteService,
    DgraphClient,
    DgraphSyncConsumer,
    DgraphResyncService,
    OutboxWorker,
    // Phase 2: Storage + Bulk Import
    StorageService,
    ImageUploadService,
    BulkImportService,
  ],
  exports: [
    QuestionBankService,
    QuestionWriteService,
    DgraphClient,
    StorageService,
    ImageUploadService,
  ],
})
export class QuestionBankModule {}