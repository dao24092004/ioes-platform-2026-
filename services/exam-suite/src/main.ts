import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';
import {
  GlobalExceptionFilter,
  HttpExceptionFilter,
  StructuredLogger,
} from '@ioes/common-node';
import { CorrelationIdMiddleware } from '@ioes/common-node';
import { HttpLoggingInterceptor } from '@ioes/common-node';
import { AuditLogInterceptor } from '@ioes/common-node';

async function bootstrap(): Promise<void> {
  const logger = new StructuredLogger('ExamSuite');

  // HTTP app (REST only)
  const app = await NestFactory.create(AppModule, {
    bufferLogs: false,
  });

  // Setup correlation ID middleware (sets x-trace-id header, AsyncLocalStorage)
  app.use(new CorrelationIdMiddleware().use);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true }),
  );

  // Global filters
  app.useGlobalFilters(new GlobalExceptionFilter(), new HttpExceptionFilter());

  // Global interceptors (Sprint 2 - Observability)
  app.useGlobalInterceptors(
    new HttpLoggingInterceptor(),
    new AuditLogInterceptor(),
  );

  // Enable graceful shutdown (BA §8.4: drain 30s before exit)
  app.enableShutdownHooks();

  const port = appConfig.port;
  await app.listen(port);
  logger.log(`HTTP listening on port ${port}`);

  // Note:
  // - Kafka consumer được start trong AppModule.onApplicationBootstrap()
  //   thông qua DgraphSyncConsumer.start() → KafkaConsumer.start()
  // - Eureka client tự register trong EurekaClient.onModuleInit()
  // - KHÔNG dùng NestJS built-in connectMicroservice() ở đây
  //   để tránh conflict group ID.
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap exam-suite', err);
  process.exit(1);
});
