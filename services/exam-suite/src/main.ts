import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  GlobalExceptionFilter,
  HttpExceptionFilter,
  KAFKA_TOPICS,
} from '@ioes/common-node';

async function bootstrap() {
  const logger = new Logger('ExamSuite');

  // HTTP app (REST)
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter(), new HttpExceptionFilter());

  const port = process.env.PORT ?? 9005;

  // Swagger / OpenAPI — source of truth cho frontend team.
  // Mount tại /api/docs. BearerAuth cho JWT thật, ApiKey 'X-Dev-User-Id' cho dev bypass.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('IOES Exam Suite API')
    .setDescription(
      'API cho exam-taking real-time suite (UC_008 Start, UC_009 Reconnect + Auto-save, UC_010 Submit).\n\n' +
        '- **Dev mode**: set header `X-Dev-User-Id` (UUID) để bypass JWT.\n' +
        '- **Prod**: gửi `Authorization: Bearer <jwt>`.\n\n' +
        'Xem collection Postman tại `tests/postman/exam-suite.postman_collection.json`.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .addApiKey({ type: 'apiKey', name: 'X-Dev-User-Id', in: 'header' }, 'dev-user-id')
    .addTag('health', 'Liveness / readiness probes')
    .addTag('exam-session', 'Start, get, auto-save, submit attempt')
    .addTag('submission', 'Tạo submission cho exam')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'IOES Exam Suite API',
  });

  await app.listen(port);
  logger.log(`HTTP listening on port ${port}`);
  logger.log(`Swagger UI: http://localhost:${port}/api/docs`);

  // Kafka microservice for EXAM events
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: process.env.KAFKA_CLIENT_ID ?? 'exam-suite',
        brokers: (process.env.KAFKA_BOOTSTRAP_SERVERS ?? 'localhost:9092').split(','),
      },
      consumer: {
        groupId: process.env.KAFKA_GROUP_ID ?? 'exam-suite',
        allowAutoTopicCreation: true,
      },
    },
  });

  await app.startAllMicroservices();
  logger.log('Kafka consumer started');

  // Subscribe to topics we care about
  logger.log(`Subscribed topics: ${KAFKA_TOPICS.USER_REGISTERED}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap exam-suite', err);
  process.exit(1);
});
