import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { EurekaClient } from '@ioes/common-node';
import { ExamModule } from './modules/exam/exam.module';
import { ExamSessionModule } from './modules/exam-session/exam-session.module';
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
    // AutoSubmitScheduler (@Cron) của ExamSessionModule cần scheduler registry.
    ScheduleModule.forRoot(),
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
    // UC_008/UC_009: /api/v1/exam-attempts, WS /exam-session, proctoring, auto-submit cron.
    ExamSessionModule,
  ],
  providers: [EurekaClient],
})
export class AppModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    private readonly dgraphSync: DgraphSyncConsumer,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Start Kafka consumer after all modules ready
    // OutboxWorker tự động start trong onModuleInit
    //
    // KHÔNG để lỗi kết nối Kafka giết cả tiến trình: `start()` ném
    // KafkaJSNonRetriableError sau 5 lần thử, lỗi đó thoát ra khỏi
    // onApplicationBootstrap() nên `app.listen()` không bao giờ chạy xong và
    // main.ts rơi vào `process.exit(1)` — toàn bộ REST API chết theo một
    // broker không chạy. Kafka ở đây chỉ dùng để đồng bộ question sang Dgraph
    // (nền, bất đồng bộ); KafkaProducer vốn đã tự xử lý theo đúng cách này
    // ("Initial connect failed (will retry on first send)").
    try {
      await this.dgraphSync.start();
    } catch (err) {
      this.logger.warn(
        `Kafka consumer không khởi động được — đồng bộ Dgraph sẽ không chạy. ` +
          `REST API vẫn phục vụ bình thường. Lý do: ${(err as Error).message}`,
      );
    }
  }
}