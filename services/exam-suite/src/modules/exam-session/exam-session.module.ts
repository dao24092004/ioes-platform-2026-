import { Logger, Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamAttemptEntity } from './entities/exam-attempt.entity';
import { AnswerDraftEntity } from './entities/answer-draft.entity';
import { SubmissionEntity } from './entities/submission.entity';
import { ExamSessionRepository } from './exam-session.repository';
import { SessionCacheService, REDIS_CLIENT } from './session-cache.service';
import { ExamSessionService } from './exam-session.service';
import { ExamSessionController } from './exam-session.controller';
import { ExamSessionGateway } from './exam-session.gateway';
import { StartExamUseCase, CONTENT_SERVICE_CLIENT } from './use-cases/start-exam.use-case';
import { SaveAnswerUseCase } from './use-cases/save-answer.use-case';
import { SubmitExamUseCase } from './use-cases/submit-exam.use-case';
import { ReconnectSessionUseCase } from './use-cases/reconnect-session.use-case';
import { AutoSubmitScheduler } from './schedulers/auto-submit.scheduler';
import { KafkaPublisherService } from '../../common/kafka-publisher.service';
import { ContentServiceHttpClient } from '../../common/content-service.client';
import { MockContentServiceClient } from '../../common/mock-content-service.client';
import { wsConfig, redisConfig, appConfig } from '../../config/app.config';
import { FrameProcessorService } from './services/frame-processor.service';
import {
  ViolationCounterService,
  VIOLATION_COOLDOWN_SEC,
} from './services/violation-counter.service';
import {
  PROCTOR_CLIENT,
  MockProctorClient,
  HttpProctorClient,
} from './services/ai-proctor.client';
import { ExamModule } from '../exam/exam.module';
import Redis from 'ioredis';

const useMockContent = process.env.DEV_MOCK_CONTENT_SERVICE === 'true';

/**
 * Mock AI proctor CHỈ khi bật tường minh `DEV_MOCK_AI_PROCTOR=true`.
 * Mặc định (kể cả dev) gọi ai-suite thật qua AI_PROCTOR_URL; nếu ai-suite
 * không chạy, FrameProcessorService coi frame là "không vi phạm" (exception 9e)
 * và log warn — không bao giờ âm thầm bỏ giám sát ở production.
 */
export function shouldUseMockAiProctor(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DEV_MOCK_AI_PROCTOR === 'true';
}

/**
 * Providers dùng Symbol để inject theo interface (DI theo contract).
 * Mỗi provider bind 1 use-case → controller/gateway chỉ inject interface.
 */
const useCaseProviders: Provider[] = [
  {
    provide: CONTENT_SERVICE_CLIENT,
    useClass: useMockContent ? MockContentServiceClient : ContentServiceHttpClient,
  },
  StartExamUseCase,
  {
    provide: Symbol.for('START_EXAM_USE_CASE'),
    useExisting: StartExamUseCase,
  },
  SaveAnswerUseCase,
  {
    provide: Symbol.for('SAVE_ANSWER_USE_CASE'),
    useExisting: SaveAnswerUseCase,
  },
  SubmitExamUseCase,
  {
    provide: Symbol.for('SUBMIT_EXAM_USE_CASE'),
    useExisting: SubmitExamUseCase,
  },
  ReconnectSessionUseCase,
  {
    provide: Symbol.for('RECONNECT_SESSION_USE_CASE'),
    useExisting: ReconnectSessionUseCase,
  },
];

/**
 * exam-session module.
 *
 * Đăng ký:
 * - 3 entities (TypeORM)
 * - Repository (1 singleton cho cả module)
 * - 4 use-cases (mỗi cái 1 class)
 * - SessionCacheService + ViolationCounterService (Redis)
 * - KafkaPublisherService (outbox sẽ thêm sau)
 * - Controller (REST, JwtAuthGuard + RolesGuard của common-node)
 * - Gateway (WebSocket, verify JWT lúc handshake)
 * - AutoSubmitScheduler (cần ScheduleModule.forRoot() ở AppModule)
 *
 * ExamModule: lấy ExamRepository để kiểm tra instructor sở hữu exam (UC_009).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ExamAttemptEntity, AnswerDraftEntity, SubmissionEntity]),
    ExamModule,
  ],
  controllers: [ExamSessionController],
  providers: [
    ...useCaseProviders,
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        new Redis({
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          db: redisConfig.db,
          keyPrefix: redisConfig.keyPrefix,
          lazyConnect: false,
          maxRetriesPerRequest: 3,
        }),
    },
    {
      provide: 'HTTP_FETCH',
      useValue: fetch,
    },
    {
      provide: 'WS_BASE_URL',
      useValue: process.env.WS_PUBLIC_URL ?? `http://localhost:${wsConfig.port}`,
    },
    {
      provide: 'APP_NAME',
      useValue: appConfig.name,
    },
    {
      provide: 'AI_PROCTOR_URL',
      useValue: process.env.AI_PROCTOR_URL ?? 'http://localhost:9101',
    },
    {
      provide: 'AI_PROCTOR_TIMEOUT_MS',
      useValue: parseInt(process.env.AI_PROCTOR_TIMEOUT_MS ?? '3000', 10),
    },
    {
      provide: 'VIOLATION_THRESHOLD',
      useValue: parseInt(process.env.VIOLATION_THRESHOLD ?? '3', 10),
    },
    {
      // Khoảng lặng giữa hai vi phạm cùng loại. Cần thiết từ khi client gửi
      // khung mỗi giây (FR-PROC-001) — xem VIOLATION_COOLDOWN_SEC.
      provide: 'VIOLATION_COOLDOWN_SEC',
      useValue: parseInt(
        process.env.VIOLATION_COOLDOWN_SEC ?? String(VIOLATION_COOLDOWN_SEC),
        10,
      ),
    },
    {
      provide: PROCTOR_CLIENT,
      useFactory: (url: string, timeout: number) => {
        const logger = new Logger('ExamSessionModule');
        if (shouldUseMockAiProctor()) {
          logger.warn(
            '[ai-proctor] DEV_MOCK_AI_PROCTOR=true → dùng MockProctorClient ' +
              '(luôn trả attention=80, KHÔNG phát hiện vi phạm). Không dùng ở production.',
          );
          return new MockProctorClient();
        }
        logger.log(`[ai-proctor] HttpProctorClient url=${url} timeoutMs=${timeout}`);
        return new HttpProctorClient(url, timeout);
      },
      inject: ['AI_PROCTOR_URL', 'AI_PROCTOR_TIMEOUT_MS'],
    },
    ViolationCounterService,
    FrameProcessorService,
    ExamSessionRepository,
    SessionCacheService,
    KafkaPublisherService,
    ExamSessionService,
    ExamSessionGateway,
    AutoSubmitScheduler,
  ],
  exports: [ExamSessionService],
})
export class ExamSessionModule {}
