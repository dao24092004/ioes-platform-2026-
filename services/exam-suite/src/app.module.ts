import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { EurekaClient } from '@ioes/common-node';
import { ExamModule } from './modules/exam/exam.module';
import { SubmissionModule } from './modules/submission/submission.module';
import { HealthModule } from './modules/health/health.module';
import { QuestionBankModule } from './modules/question-bank/question-bank.module';
import { ExamEventsModule } from './modules/exam-events/exam-events.module';
import { DgraphSyncConsumer } from './modules/question-bank/dgraph-sync.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 5000,
        maxRedirects: 3,
      }),
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5433', 10),
        username: process.env.DB_USER ?? 'ioes_exam',
        password: process.env.DB_PASSWORD ?? 'ioes_exam',
        database: process.env.DB_NAME ?? 'ioes_exam',
        autoLoadEntities: true,
        synchronize: false, // Flyway owns schema
      }),
    }),
    ExamModule,
    SubmissionModule,
    HealthModule,
    QuestionBankModule,
    ExamEventsModule,
  ],
  providers: [EurekaClient],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(
    private readonly dgraphSync: DgraphSyncConsumer,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Start Kafka consumer after all modules ready
    // OutboxWorker tự động start trong onModuleInit
    await this.dgraphSync.start();
  }
}