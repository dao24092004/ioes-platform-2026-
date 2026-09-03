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
import { dbConfig } from './config/app.config';
import { SnakeCaseNamingStrategy } from './config/snake-case.naming-strategy';

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
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        autoLoadEntities: true,
        // Dev mode: synchronize=true để bạn test không cần Flyway.
        // Production: set TYPEORM_SYNCHRONIZE=false (mặc định false).
        synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
        // Flyway schema (database/migrations/exam-service/) uses snake_case
        // columns; without this, TypeORM derives camelCase column names from
        // entity properties and queries fail with "column X.propertyName
        // does not exist".
        namingStrategy: new SnakeCaseNamingStrategy(),
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