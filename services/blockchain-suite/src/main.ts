import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import {
  GlobalExceptionFilter,
  HttpExceptionFilter,
  getLogger,
} from '@ioes/common-node';

async function bootstrap() {
  const logger = getLogger('BlockchainSuite');

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter(), new HttpExceptionFilter());

  const port = process.env.PORT ?? 9200;
  await app.listen(port);
  logger.info(`HTTP listening on port ${port}`);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'blockchain-suite',
        brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
      },
      consumer: {
        groupId: process.env.KAFKA_GROUP_ID ?? 'blockchain-suite',
        allowAutoTopicCreation: true,
      },
    },
  });

  await app.startAllMicroservices();
  logger.info('Kafka consumer started');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap blockchain-suite', err);
  process.exit(1);
});
