import { Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard, RolesGuard } from '@ioes/common-node';
import { ExamAttemptEntity } from './entities/exam-attempt.entity';
import { AnswerDraftEntity } from './entities/answer-draft.entity';
import { SubmissionEntity } from './entities/submission.entity';
import { ExamSessionRepository } from './exam-session.repository';
import { SessionCacheService, REDIS_CLIENT } from './session-cache.service';
import { ExamSessionService } from './exam-session.service';
import { ExamSessionController, DevAuthBypassGuard } from './exam-session.controller';
import { ExamSessionGateway } from './exam-session.gateway';
import { StartExamUseCase, CONTENT_SERVICE_CLIENT } from './use-cases/start-exam.use-case';
import { SaveAnswerUseCase } from './use-cases/save-answer.use-case';
import { SubmitExamUseCase } from './use-cases/submit-exam.use-case';
import { ReconnectSessionUseCase } from './use-cases/reconnect-session.use-case';
import { KafkaPublisherService } from '../../common/kafka-publisher.service';
import { ContentServiceHttpClient } from '../../common/content-service.client';
import { MockContentServiceClient } from '../../common/mock-content-service.client';
import { serviceUrls, wsConfig, redisConfig, appConfig } from '../../config/app.config';
import Redis from 'ioredis';

const useMockContent = process.env.DEV_MOCK_CONTENT_SERVICE === 'true';

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
 * - SessionCacheService (Redis)
 * - KafkaPublisherService (outbox sẽ thêm sau)
 * - Controller (REST)
 * - Gateway (WebSocket)
 * - JwtAuthGuard + RolesGuard (cho REST)
 */
@Module({
  imports: [TypeOrmModule.forFeature([ExamAttemptEntity, AnswerDraftEntity, SubmissionEntity])],
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
    ExamSessionRepository,
    SessionCacheService,
    KafkaPublisherService,
    JwtAuthGuard,
    DevAuthBypassGuard,
    RolesGuard,
    ExamSessionService,
    ExamSessionGateway,
  ],
  exports: [ExamSessionService],
})
export class ExamSessionModule {}