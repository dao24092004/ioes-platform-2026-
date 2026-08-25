import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { appConfig, kafkaConfig } from './config/app.config';
import {
  GlobalExceptionFilter,
  HttpExceptionFilter,
  createLogger,
  KAFKA_TOPICS,
} from '@ioes/common-node';

async function bootstrap() {
  const logger = createLogger('ExamSuite');

  // HTTP app (REST)
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter(), new HttpExceptionFilter());

  const port = appConfig.port;
  await app.listen(port);
  logger.log(`HTTP listening on port ${port}`);

  // Kafka microservice for EXAM events
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: kafkaConfig.clientId,
        brokers: kafkaConfig.brokers,
      },
      consumer: {
        groupId: kafkaConfig.groupId,
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
