import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import {
  GlobalExceptionFilter,
  HttpExceptionFilter,
  getLogger,
  KAFKA_TOPICS,
} from '@ioes/common-node';

async function bootstrap() {
  const logger = getLogger('ExamSuite');

  // HTTP app (REST)
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter(), new HttpExceptionFilter());

  const port = process.env.PORT ?? 9005;
  await app.listen(port);
  logger.info(`HTTP listening on port ${port}`);

  // Kafka microservice for EXAM events
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'exam-suite',
        brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
      },
      consumer: {
        groupId: process.env.KAFKA_GROUP_ID ?? 'exam-suite',
        allowAutoTopicCreation: true,
      },
    },
  });

  await app.startAllMicroservices();
  logger.info('Kafka consumer started');

  // Subscribe to topics we care about
  logger.info(`Subscribed topics: ${KAFKA_TOPICS.USER_REGISTERED}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap exam-suite', err);
  process.exit(1);
});
